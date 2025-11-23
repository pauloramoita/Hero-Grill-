
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
import { Save, Loader2, PenTool, X, History, RotateCcw, Edit, Trash2, Filter, CheckCircle, AlertTriangle, RefreshCw, AlertCircle, Beef, Scale } from 'lucide-react';

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
    const [editingLog, setEditingLog] = useState<{id: string, valStr: string, valNum: number} | null>(null);

    const MEAT_LIST = [
        'Alcatra', 'Capa do Filé', 'Contra Filé', 'Coração', 'Coxão Mole', 
        'Costela Bovina', 'Cupim', 'Fraldinha', 'Maminha', 'Patinho', 'Picanha'
    ];

    const today = getTodayLocalISO();

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

    const normalize = (s: string) => s ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';

    const isProductMatch = (dbProduct: string, targetMeat: string) => {
        if (!dbProduct || !targetMeat) return false;
        
        const db = normalize(dbProduct);
        const target = normalize(targetMeat);

        if (db === target) return true;
        
        if (target.includes('maminha')) return db.includes('maminha');
        if (target.includes('costela')) return target.includes('bovina') ? (db.includes('costela') && !db.includes('suina')) : db.includes('costela');
        if (target.includes('capa') && target.includes('file')) return db.includes('capa') && db.includes('file');
        if (target.includes('contra') && target.includes('file')) return (db.includes('contra') && db.includes('file')) || db.includes('chorizo') || db === 'contra';
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

    const handleSave = async () => {
        if (!selectedStore) { alert("Selecione uma loja."); return; }
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
                     logsToSave.push({ id: '', date: today, store: selectedStore, product: item.name, quantity_consumed: diff });
                }
            }

            if (logsToSave.length === 0) {
                alert("Nenhuma alteração no consumo para salvar.");
                setSaving(false);
                return;
            }

            await Promise.all(logsToSave.map(log => saveMeatConsumption(log)));
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
        if (!adjProduct || adjValueNum <= 0 || !adjReason) { alert("Preencha todos os campos."); return; }

        const quantity = adjType === 'entrada' ? adjValueNum : -adjValueNum;

        try {
            await saveMeatAdjustment({
                id: '', date: today, store: selectedStore, product: adjProduct, quantity, reason: adjReason
            });
            alert("Ajuste realizado!");
            setShowModal(false);
            setAdjProduct('');
            setAdjValueStr('0,000');
            setAdjValueNum(0);
            setAdjReason('');
            loadData();
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        }
    };

    if (loading && appData.stores.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-heroRed" size={40}/></div>;

    const totalInitial = inventoryData.reduce((acc, i) => acc + i.initialStock, 0);
    const totalConsumption = inventoryData.reduce((acc, i) => acc + i.todayConsumptionVal, 0);
    const totalFinal = inventoryData.reduce((acc, i) => acc + i.finalStock, 0);

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-32">
             <div className="bg-white rounded-3xl shadow-card border border-slate-100 mb-8 overflow-hidden">
                
                {/* Header & Controls */}
                <div className="p-6 bg-white border-b border-slate-50 flex flex-col gap-6 sticky top-16 z-30 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                                <Beef size={28} className="text-heroRed"/> Controle Diário
                            </h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                        
                        <div className="flex gap-3 w-full md:w-auto">
                            <button onClick={loadData} className="p-4 bg-slate-50 rounded-2xl text-slate-500 hover:bg-slate-100 transition-colors" title="Atualizar">
                                <RefreshCw size={20}/>
                            </button>
                            <button 
                                onClick={() => setShowModal(true)}
                                className="flex-1 md:flex-none bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider shadow-sm"
                            >
                                <PenTool size={16} className="text-blue-500"/> Ajuste
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 md:flex-none bg-heroBlack hover:bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-70 text-xs uppercase tracking-wider active:scale-95"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                Salvar
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                         <select 
                            value={selectedStore} 
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className={`w-full p-4 rounded-2xl font-black text-slate-800 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-heroRed outline-none text-lg appearance-none transition-all cursor-pointer ${availableStores.length === 1 ? 'opacity-70 cursor-not-allowed' : ''}`}
                            disabled={availableStores.length === 1}
                        >
                            {availableStores.length !== 1 && <option value="">Selecione a Loja...</option>}
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                    </div>
                </div>

                {/* --- DESKTOP VIEW (Clean Table) --- */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-1/3">Corte</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Estoque Inicial</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest text-yellow-600 bg-yellow-50/50 w-1/4 border-x border-yellow-100">Consumo (Kg)</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {inventoryData.map((item, idx) => (
                                <tr key={item.name} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5 text-sm font-bold text-slate-800">
                                        {item.name}
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                                            {formatWeight(item.initialStock)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-center border-x border-yellow-50 bg-yellow-50/10">
                                        <input 
                                            type="text" 
                                            value={item.todayConsumptionStr}
                                            onChange={(e) => handleConsumptionChange(idx, e.target.value)}
                                            className="w-full text-center p-3 bg-white border-2 border-yellow-100 rounded-xl font-black text-slate-800 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 outline-none font-mono text-lg transition-all placeholder-slate-300"
                                            placeholder="0,000"
                                            inputMode="decimal"
                                        />
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={`font-mono font-black text-lg ${item.finalStock < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {formatWeight(item.finalStock)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-900 text-white">
                                <td className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest opacity-70">TOTAIS</td>
                                <td className="px-8 py-6 text-center font-mono font-bold opacity-80">{formatWeight(totalInitial)}</td>
                                <td className="px-8 py-6 text-center font-mono font-black text-xl text-yellow-400 bg-slate-800">{formatWeight(totalConsumption)}</td>
                                <td className="px-8 py-6 text-center font-mono font-bold text-emerald-400">{formatWeight(totalFinal)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* --- MOBILE VIEW (Widgets) --- */}
                <div className="md:hidden bg-slate-50 p-4 space-y-4">
                    {inventoryData.map((item, idx) => (
                        <div key={item.name} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative">
                            <div className="flex justify-between items-start mb-6">
                                <span className="font-black text-slate-800 text-lg uppercase tracking-tight">{item.name}</span>
                                <div className="text-right bg-slate-50 px-3 py-1.5 rounded-xl">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Início</span>
                                    <span className="font-mono font-bold text-slate-600">{formatWeight(item.initialStock)}</span>
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-[10px] font-bold text-yellow-600 uppercase mb-2 text-center tracking-widest">Consumo Hoje</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={item.todayConsumptionStr}
                                        onChange={(e) => handleConsumptionChange(idx, e.target.value)}
                                        className="w-full text-center py-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl font-black text-slate-900 focus:bg-white focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none font-mono text-3xl transition-all"
                                        placeholder="0,000"
                                        inputMode="decimal"
                                    />
                                    {item.todayConsumptionVal > 0 && (
                                        <button 
                                            onClick={() => handleConsumptionChange(idx, '')} 
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 p-2 hover:text-red-500 transition-colors"
                                        >
                                            <X size={24} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final</span>
                                <div className="flex items-baseline gap-1">
                                    <span className={`font-mono font-black text-2xl ${item.finalStock < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {formatWeight(item.finalStock)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-300">KG</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="bg-slate-900 text-white rounded-[2rem] shadow-lg p-6 mt-4 mb-20">
                        <h3 className="text-center font-bold text-slate-500 text-[10px] uppercase tracking-[0.2em] mb-6">RESUMO GERAL</h3>
                        <div className="flex justify-between items-end text-center">
                            <div>
                                <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Inicial</span>
                                <span className="font-mono font-bold text-sm text-slate-300">{formatWeight(totalInitial)}</span>
                            </div>
                            <div className="flex-1 px-4">
                                <span className="block text-[10px] text-yellow-500 uppercase font-black mb-1 tracking-widest">Total Consumo</span>
                                <span className="font-mono font-black text-3xl text-yellow-400 block leading-none">{formatWeight(totalConsumption)}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Final</span>
                                <span className="font-mono font-bold text-sm text-emerald-500">{formatWeight(totalFinal)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Adjustment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                                <PenTool size={20} className="text-heroRed"/> Ajuste Manual
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-2 bg-slate-50 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="bg-amber-50 text-amber-900 text-xs p-4 rounded-2xl border border-amber-100 font-bold leading-relaxed text-center">
                                Ajuste de perdas, quebras ou contagem incorreta para <br/>
                                <span className="text-amber-700 uppercase tracking-wide">{selectedStore}</span>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Produto</label>
                                <div className="relative">
                                    <select value={adjProduct} onChange={e => setAdjProduct(e.target.value)} className="w-full p-4 border-2 border-slate-100 bg-slate-50 rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-heroRed outline-none appearance-none transition-all">
                                        <option value="">Selecione...</option>
                                        {MEAT_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setAdjType('entrada')}
                                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-wide border-2 transition-all ${adjType === 'entrada' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                >
                                    Entrada (+)
                                </button>
                                <button 
                                    onClick={() => setAdjType('saida')}
                                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-wide border-2 transition-all ${adjType === 'saida' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                >
                                    Saída (-)
                                </button>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Quantidade</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={adjValueStr} 
                                        onChange={(e) => { const { str, num } = handleWeightInput(e.target.value); setAdjValueStr(str); setAdjValueNum(num); }}
                                        className="w-full p-4 text-right bg-white border-2 border-slate-100 rounded-2xl font-mono text-3xl font-black text-slate-800 focus:border-heroRed outline-none transition-all"
                                        inputMode="decimal"
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300 uppercase">KG</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Motivo</label>
                                <input 
                                    type="text" 
                                    value={adjReason} 
                                    onChange={e => setAdjReason(e.target.value)} 
                                    placeholder="Ex: Validade, Quebra..."
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm text-slate-700 focus:bg-white focus:border-heroRed outline-none transition-all placeholder-slate-300"
                                />
                            </div>

                            <button 
                                onClick={handleSaveAdjustment}
                                className="w-full bg-heroBlack text-white py-4 rounded-2xl font-black uppercase tracking-wide hover:bg-slate-800 transition-all shadow-xl active:scale-95 flex justify-center items-center gap-3"
                            >
                                <RotateCcw size={20}/> Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
