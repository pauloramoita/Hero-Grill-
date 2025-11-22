
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getOrders, 
    getMeatConsumptionLogs, 
    getMeatAdjustments, 
    saveMeatConsumption, 
    saveMeatAdjustment, 
    getTodayLocalISO, 
    getAppData,
    updateMeatConsumption,
    deleteMeatConsumption,
    deleteMeatAdjustment,
    formatDateBr
} from '../../services/storageService';
import { MeatInventoryLog, Order, MeatStockAdjustment, AppData, User } from '../../types';
import { Save, Loader2, PenTool, X, History, RotateCcw, Edit, Trash2, Filter, CheckCircle, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';

interface ControleCarnesProps {
    user?: User;
}

function usePersistedState<T>(key: string, initialState: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        const storageValue = localStorage.getItem(key);
        if (storageValue) {
            try { return JSON.parse(storageValue); } catch {}
        }
        return initialState;
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState];
}

export const ControleCarnes: React.FC<ControleCarnesProps> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    
    const [selectedStore, setSelectedStore] = usePersistedState('hero_state_stock_store', '');

    const [inventoryData, setInventoryData] = useState<{
        name: string;
        totalBought: number;
        totalConsumedPrev: number;
        totalAdjustments: number;
        initialStock: number;
        todayConsumptionStr: string; 
        todayConsumptionVal: number;
        finalStock: number;
    }[]>([]);

    const [showModal, setShowModal] = useState(false);
    const [adjProduct, setAdjProduct] = useState('');
    const [adjType, setAdjType] = useState<'entrada' | 'saida'>('entrada');
    const [adjValueStr, setAdjValueStr] = useState('0,000');
    const [adjValueNum, setAdjValueNum] = useState(0);
    const [adjReason, setAdjReason] = useState('');

    const [rawLogs, setRawLogs] = useState<MeatInventoryLog[]>([]);
    const [rawAdjustments, setRawAdjustments] = useState<MeatStockAdjustment[]>([]);
    const [reportStartDate, setReportStartDate] = useState(getTodayLocalISO());
    const [reportEndDate, setReportEndDate] = useState(getTodayLocalISO());
    const [editingLog, setEditingLog] = useState<{id: string, valStr: string, valNum: number} | null>(null);

    const MEAT_LIST = [
        'Alcatra', 
        'Capa do Filé', 
        'Contra Filé', 
        'Coração', 
        'Coxão Mole', 
        'Costela Bovina', 
        'Cupim', 
        'Fraldinha', 
        'Maminha',
        'Patinho', 
        'Picanha'
    ];

    const today = getTodayLocalISO();
    const isAdmin = user?.isMaster || user?.permissions?.modules?.includes('admin');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [d, orders, logs, adjustments] = await Promise.all([
                getAppData(), 
                getOrders(), 
                getMeatConsumptionLogs(), 
                getMeatAdjustments()
            ]);
            
            setAppData(d);
            setRawLogs(logs); 
            setRawAdjustments(adjustments);
            
            if (selectedStore) {
                processData(orders, logs, adjustments, selectedStore);
            }
        } catch (e) {
            console.error("Erro ao carregar dados de estoque", e);
        } finally {
            setLoading(false);
        }
    };

    const availableStores = useMemo(() => {
        if (!user) return appData.stores;
        if (user.isMaster) return appData.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return appData.stores.filter(s => user.permissions.stores.includes(s));
        }
        return appData.stores;
    }, [appData.stores, user]);

    useEffect(() => {
        if (availableStores.length === 1 && !selectedStore) {
            setSelectedStore(availableStores[0]);
        }
    }, [availableStores, selectedStore]);

    useEffect(() => {
        if (selectedStore) {
           setLoading(true);
           Promise.all([getOrders(), getMeatConsumptionLogs(), getMeatAdjustments()]).then(([o, l, a]) => {
               setRawLogs(l);
               setRawAdjustments(a);
               processData(o, l, a, selectedStore);
               setLoading(false);
           });
        }
    }, [selectedStore]);

    const formatWeight = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

    const normalize = (s: string) => {
        if (!s) return '';
        return s.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
            .trim();
    };

    const isProductMatch = (dbProduct: string, targetMeat: string) => {
        if (!dbProduct || !targetMeat) return false;
        
        const db = normalize(dbProduct);
        const target = normalize(targetMeat);

        if (db === target) return true;
        
        if (target.includes('maminha')) return db.includes('maminha');
        if (target.includes('costela')) {
            if (target.includes('bovina')) {
                return db.includes('costela') && !db.includes('suina');
            }
            return db.includes('costela');
        }
        if (target.includes('capa') && target.includes('file')) return db.includes('capa') && db.includes('file');
        if (target.includes('contra') && target.includes('file')) {
            return (db.includes('contra') && db.includes('file')) || db.includes('chorizo') || db === 'contra';
        }
        if (target.includes('coxao') && target.includes('mole')) return db.includes('coxao') || (db.includes('mole') && !db.includes('capa'));
        if (target.includes('coracao')) return db.includes('coracao');
        if (target.includes('picanha')) return db.includes('picanha');
        if (target.includes('alcatra')) return db.includes('alcatra');
        if (target.includes('cupim')) return db.includes('cupim');
        if (target.includes('fraldinha')) return db.includes('fraldinha');
        if (target.includes('patinho')) return db.includes('patinho');
        
        return false;
    };

    const processData = (orders: Order[], logs: MeatInventoryLog[], adjustments: MeatStockAdjustment[], store: string) => {
        if (!store) return;

        const data = MEAT_LIST.map(meat => {
            const totalBought = orders
                .filter(o => o.store === store && isProductMatch(o.product, meat))
                .reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);

            const totalConsumedPrev = logs
                .filter(l => l.store === store && isProductMatch(l.product, meat) && l.date < today)
                .reduce((acc, l) => acc + (Number(l.quantity_consumed) || 0), 0);
            
            const totalAdjustments = adjustments
                .filter(a => a.store === store && isProductMatch(a.product, meat))
                .reduce((acc, a) => acc + (Number(a.quantity) || 0), 0);

            const todayConsumptionVal = logs
                .filter(l => l.store === store && isProductMatch(l.product, meat) && l.date === today)
                .reduce((acc, l) => acc + Number(l.quantity_consumed), 0);

            const initialStock = totalBought - totalConsumedPrev + totalAdjustments;

            return {
                name: meat,
                totalBought,
                totalConsumedPrev,
                totalAdjustments,
                initialStock,
                todayConsumptionStr: todayConsumptionVal > 0 ? formatWeight(todayConsumptionVal) : '0,000',
                todayConsumptionVal,
                finalStock: initialStock - todayConsumptionVal
            };
        });

        setInventoryData(data);
    };

    const handleWeightInput = (value: string): { str: string, num: number } => {
        const raw = value.replace(/\D/g, '');
        if (!raw) return { str: '0,000', num: 0 };
        const num = parseInt(raw, 10) / 1000;
        return { str: formatWeight(num), num };
    };

    const handleConsumptionChange = (index: number, rawValue: string) => {
        const newData = [...inventoryData];
        const { str, num } = handleWeightInput(rawValue);

        newData[index].todayConsumptionStr = str;
        newData[index].todayConsumptionVal = num;
        newData[index].finalStock = newData[index].initialStock - num;
        
        setInventoryData(newData);
    };

    const handleAdjValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { str, num } = handleWeightInput(e.target.value);
        setAdjValueStr(str);
        setAdjValueNum(num);
    };

    const handleSave = async () => {
        if (!selectedStore) {
            alert("Selecione uma loja.");
            return;
        }
        
        if (!window.confirm(`Confirmar lançamentos de consumo para ${selectedStore}?`)) return;

        setSaving(true);
        try {
            const freshLogs = await getMeatConsumptionLogs();
            const logsToSave: MeatInventoryLog[] = [];

            for (const item of inventoryData) {
                const savedToday = freshLogs
                    .filter(l => l.store === selectedStore && isProductMatch(l.product, item.name) && l.date === today)
                    .reduce((acc, l) => acc + Number(l.quantity_consumed), 0);
                
                const currentInput = item.todayConsumptionVal;
                
                if (Math.abs(currentInput - savedToday) > 0.0001) {
                    const diff = currentInput - savedToday;
                     logsToSave.push({
                        id: '',
                        date: today,
                        store: selectedStore,
                        product: item.name, 
                        quantity_consumed: diff
                    });
                }
            }

            if (logsToSave.length === 0) {
                alert("Nenhuma alteração no consumo para salvar.");
                setSaving(false);
                return;
            }

            for (const log of logsToSave) {
                await saveMeatConsumption(log);
            }

            alert("Dados atualizados com sucesso!");
            loadData();
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAdjustment = async () => {
        if (!selectedStore) return;
        if (!adjProduct || adjValueNum <= 0 || !adjReason) {
            alert("Preencha todos os campos do ajuste.");
            return;
        }

        const quantity = adjType === 'entrada' ? adjValueNum : -adjValueNum;

        try {
            await saveMeatAdjustment({
                id: '',
                date: today,
                store: selectedStore,
                product: adjProduct,
                quantity,
                reason: adjReason
            });
            alert("Ajuste realizado com sucesso!");
            setShowModal(false);
            setAdjProduct('');
            setAdjValueStr('0,000');
            setAdjValueNum(0);
            setAdjReason('');
            loadData();
        } catch (e: any) {
            alert("Erro ao salvar ajuste: " + e.message);
        }
    };

    const getFilteredReportData = () => {
        const logs = rawLogs
            .filter(log => log.store === selectedStore && log.date >= reportStartDate && log.date <= reportEndDate)
            .map(log => ({
                id: log.id,
                date: log.date,
                product: log.product,
                value: log.quantity_consumed,
                type: 'consumption' as const,
                reason: ''
            }));

        const adjustments = rawAdjustments
            .filter(adj => adj.store === selectedStore && adj.date >= reportStartDate && adj.date <= reportEndDate)
            .map(adj => ({
                id: adj.id,
                date: adj.date,
                product: adj.product,
                value: adj.quantity, 
                type: 'adjustment' as const,
                reason: adj.reason
            }));

        return [...logs, ...adjustments].sort((a, b) => b.date.localeCompare(a.date));
    };

    const handleDeleteItem = async (item: { id: string, type: 'consumption' | 'adjustment' }) => {
        if (!window.confirm("Tem certeza que deseja excluir este lançamento? Isso afetará o estoque.")) return;
        try {
            if (item.type === 'consumption') {
                await deleteMeatConsumption(item.id);
            } else {
                await deleteMeatAdjustment(item.id);
            }
            loadData();
        } catch (e: any) {
            alert("Erro ao excluir: " + e.message);
        }
    };

    const handleEditLogStart = (log: any) => {
        setEditingLog({
            id: log.id,
            valStr: formatWeight(log.value),
            valNum: log.value
        });
    };

    const handleEditLogChange = (val: string) => {
        const { str, num } = handleWeightInput(val);
        setEditingLog(prev => prev ? { ...prev, valStr: str, valNum: num } : null);
    };

    const handleEditLogSave = async () => {
        if (!editingLog) return;
        try {
            await updateMeatConsumption(editingLog.id, editingLog.valNum);
            setEditingLog(null);
            loadData();
        } catch (e: any) {
            alert("Erro ao atualizar: " + e.message);
        }
    };

    const reportData = getFilteredReportData();
    const totalReportWeight = reportData
        .filter(i => i.type === 'consumption')
        .reduce((acc, l) => acc + l.value, 0);

    if (loading && appData.stores.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-heroRed" size={40}/></div>;

    const totalInitial = inventoryData.reduce((acc, i) => acc + i.initialStock, 0);
    const totalConsumption = inventoryData.reduce((acc, i) => acc + i.todayConsumptionVal, 0);
    const totalFinal = inventoryData.reduce((acc, i) => acc + i.finalStock, 0);

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-32">
             <div className="bg-white rounded-2xl shadow-card border border-slate-100 mb-8 overflow-hidden">
                
                <div className="p-6 border-b border-slate-100 bg-white flex flex-col gap-4 sticky top-16 z-30 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <History size={24} className="text-heroRed"/>
                                CONTROLE DE CARNES
                            </h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={loadData} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors" title="Atualizar Dados">
                                <RefreshCw size={18}/>
                            </button>
                            <button 
                                onClick={() => setShowModal(true)}
                                className="flex-1 md:flex-none bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors text-xs uppercase"
                            >
                                <PenTool size={16} className="text-blue-600"/> Ajuste
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 md:flex-none bg-heroBlack hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-70 text-xs uppercase active:scale-95"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                Salvar
                            </button>
                        </div>
                    </div>

                    <div className="w-full">
                         <select 
                            value={selectedStore} 
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className={`w-full p-3.5 border border-slate-200 rounded-xl font-black text-slate-800 bg-slate-50 focus:ring-2 focus:ring-heroRed/10 focus:border-heroRed text-lg outline-none ${availableStores.length === 1 ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                            disabled={availableStores.length === 1}
                        >
                            {availableStores.length !== 1 && <option value="">Selecione a Loja...</option>}
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {/* --- DESKTOP VIEW (Tabela) --- */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500 w-1/3">Corte / Carne</th>
                                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-600 border-r border-slate-200">Estoque Inicial (Kg)</th>
                                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider bg-yellow-50 text-yellow-800 border-x border-slate-200 w-1/4">Consumo Dia (Kg)</th>
                                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-600">Estoque Final (Kg)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {inventoryData.map((item, idx) => (
                                <tr key={item.name} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-800 border-r border-slate-100">
                                        {item.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center font-mono font-bold text-slate-500 bg-slate-50/30">
                                        {formatWeight(item.initialStock)}
                                    </td>
                                    <td className="px-4 py-2 text-center border-x border-slate-100 bg-yellow-50/10 p-0">
                                        <input 
                                            type="text" 
                                            value={item.todayConsumptionStr}
                                            onChange={(e) => handleConsumptionChange(idx, e.target.value)}
                                            className="w-full h-full text-center p-2 bg-transparent font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-yellow-400/50 outline-none font-mono text-lg rounded transition-all"
                                            placeholder="0,000"
                                            inputMode="decimal"
                                        />
                                    </td>
                                    <td className={`px-6 py-4 text-center text-sm font-black font-mono bg-slate-50/30 ${item.finalStock < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatWeight(item.finalStock)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-900 text-white font-bold">
                                <td className="px-6 py-5 text-right uppercase text-xs tracking-widest opacity-70">TOTAIS GERAIS</td>
                                <td className="px-6 py-5 text-center font-mono text-sm opacity-80">
                                    {formatWeight(totalInitial)}
                                </td>
                                <td className="px-6 py-5 text-center font-mono text-xl text-yellow-400 bg-slate-800 border-x border-slate-700">
                                    {formatWeight(totalConsumption)}
                                </td>
                                <td className="px-6 py-5 text-center font-mono text-sm text-green-400">
                                    {formatWeight(totalFinal)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* --- MOBILE VIEW (Cards) --- */}
                <div className="md:hidden bg-slate-50 p-4 space-y-4 relative z-0">
                    {inventoryData.map((item, idx) => (
                        <div key={item.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                                <span className="font-black text-slate-800 text-lg uppercase">{item.name}</span>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Início</span>
                                    <span className="font-mono font-bold text-slate-600">{formatWeight(item.initialStock)}</span>
                                </div>
                            </div>
                            <div className="p-5 flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-yellow-600 uppercase mb-2 text-center tracking-wide">Consumo Hoje (Kg)</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={item.todayConsumptionStr}
                                            onChange={(e) => handleConsumptionChange(idx, e.target.value)}
                                            className="w-full text-center p-4 bg-yellow-50 border-2 border-yellow-100 rounded-2xl font-black text-slate-900 focus:bg-white focus:ring-4 focus:ring-yellow-200 focus:border-yellow-400 outline-none font-mono text-3xl shadow-inner transition-all"
                                            placeholder="0,000"
                                            inputMode="decimal"
                                        />
                                        {item.todayConsumptionVal > 0 && (
                                            <button 
                                                onClick={() => handleConsumptionChange(idx, '')} 
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 p-2 hover:text-red-500 transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Estoque Final:</span>
                                    <span className={`font-mono font-black text-xl ${item.finalStock < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatWeight(item.finalStock)} <span className="text-xs text-slate-400 font-normal">Kg</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="bg-slate-900 text-white rounded-2xl shadow-lg p-5 mt-6 mb-8">
                        <h3 className="text-center font-bold text-slate-500 text-xs uppercase tracking-widest mb-4">RESUMO DO DIA</h3>
                        <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-700">
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase font-bold">Inicial</span>
                                <span className="font-mono font-bold text-sm text-slate-300">{formatWeight(totalInitial)}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-yellow-500 uppercase font-black">Consumo</span>
                                <span className="font-mono font-black text-lg text-yellow-400">{formatWeight(totalConsumption)}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase font-bold">Final</span>
                                <span className="font-mono font-bold text-sm text-green-400">{formatWeight(totalFinal)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 mx-4 md:mx-0 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 items-center shadow-sm">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600 hidden md:block">
                    <AlertCircle size={24} />
                </div>
                <div className="text-sm text-blue-800 flex-1">
                    <strong className="block mb-1">Como funciona o cálculo?</strong>
                    <p className="text-blue-700 opacity-90 text-xs md:text-sm leading-relaxed">
                        Estoque Inicial = (Total Comprado) - (Consumo Histórico) + (Ajustes Manuais).
                        <br/>O valor digitado em "Consumo Hoje" é subtraído do Estoque Inicial.
                    </p>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-white p-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                                <PenTool size={20} className="text-heroRed"/> Ajuste Manual
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-slate-50"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div className="bg-amber-50 text-amber-900 text-xs p-4 rounded-xl border border-amber-100 font-medium leading-relaxed">
                                Use esta função para corrigir divergências de contagem ou perdas (validade, quebra).
                                <div className="mt-1 pt-1 border-t border-amber-200/50">
                                    <span className="font-bold">Loja: {selectedStore}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Produto</label>
                                <select value={adjProduct} onChange={e => setAdjProduct(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-heroRed/10 focus:border-heroRed outline-none transition-all text-sm font-medium">
                                    <option value="">Selecione o Corte...</option>
                                    {MEAT_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Tipo de Ajuste</label>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setAdjType('entrada')}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${adjType === 'entrada' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        ENTRADA (+)
                                    </button>
                                    <button 
                                        onClick={() => setAdjType('saida')}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${adjType === 'saida' ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-100' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        SAÍDA/PERDA (-)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Quantidade (Kg)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={adjValueStr} 
                                        onChange={handleAdjValueChange}
                                        className="w-full p-3.5 border border-slate-200 rounded-xl text-right font-mono text-2xl font-black text-slate-800 focus:ring-4 focus:ring-heroRed/10 focus:border-heroRed outline-none transition-all"
                                        inputMode="decimal"
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">KG</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Motivo do Ajuste</label>
                                <input 
                                    type="text" 
                                    value={adjReason} 
                                    onChange={e => setAdjReason(e.target.value)} 
                                    placeholder="Ex: Contagem incorreta, Perda, Bonificação"
                                    className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors"
                                />
                            </div>

                            <button 
                                onClick={handleSaveAdjustment}
                                className="w-full bg-heroBlack text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 mt-2 flex justify-center items-center gap-2 active:scale-95"
                            >
                                <RotateCcw size={18}/> CONFIRMAR AJUSTE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
