
import React, { useState, useEffect } from 'react';
import { getOrders, getMeatConsumptionLogs, getMeatAdjustments, saveMeatConsumption, saveMeatAdjustment, getTodayLocalISO, getAppData } from '../../services/storageService';
import { MeatInventoryLog, Order, MeatStockAdjustment, AppData } from '../../types';
import { Save, Loader2, AlertCircle, PenTool, X, History, RotateCcw } from 'lucide-react';

export const ControleCarnes: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [selectedStore, setSelectedStore] = useState('');

    const [inventoryData, setInventoryData] = useState<{
        name: string;
        totalBought: number;
        totalConsumedPrev: number;
        totalAdjustments: number;
        initialStock: number;
        todayConsumptionStr: string; // String formatada para input (e.g. "1,234")
        todayConsumptionVal: number; // Valor numérico real
        finalStock: number;
    }[]>([]);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [adjProduct, setAdjProduct] = useState('');
    const [adjType, setAdjType] = useState<'entrada' | 'saida'>('entrada');
    const [adjValueStr, setAdjValueStr] = useState('0,000'); // Masked
    const [adjValueNum, setAdjValueNum] = useState(0); // Numeric
    const [adjReason, setAdjReason] = useState('');

    const MEAT_LIST = [
        'Alcatra', 'Capa do filé', 'Coxao mole', 'Contra filé', 'Coração', 
        'Cupim', 'Fraldinha', 'Patinho', 'Picanha', 'Costela de Boi'
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
            
            // Default store selection
            if (d.stores.length > 0 && !selectedStore) {
                setSelectedStore(d.stores[0]);
            }

            if (selectedStore || d.stores.length > 0) {
                processData(orders, logs, adjustments, selectedStore || d.stores[0]);
            }
        } catch (e) {
            console.error("Erro ao carregar dados de estoque", e);
        } finally {
            setLoading(false);
        }
    };

    // Reload when store changes
    useEffect(() => {
        if (selectedStore) {
           setLoading(true);
           Promise.all([getOrders(), getMeatConsumptionLogs(), getMeatAdjustments()]).then(([o, l, a]) => {
               processData(o, l, a, selectedStore);
               setLoading(false);
           });
        }
    }, [selectedStore]);

    const formatWeight = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

    const processData = (orders: Order[], logs: MeatInventoryLog[], adjustments: MeatStockAdjustment[], store: string) => {
        if (!store) return;

        const data = MEAT_LIST.map(meat => {
            // 1. Total Comprado (Histórico) - Filtered by Store
            const totalBought = orders
                .filter(o => o.store === store && o.product.toLowerCase() === meat.toLowerCase())
                .reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);

            // 2. Total Consumido (Histórico ANTES de hoje) - Filtered by Store
            const totalConsumedPrev = logs
                .filter(l => l.store === store && l.product.toLowerCase() === meat.toLowerCase() && l.date < today)
                .reduce((acc, l) => acc + (Number(l.quantity_consumed) || 0), 0);
            
            // 3. Total Ajustes (Correções manuais) - Filtered by Store
            const totalAdjustments = adjustments
                .filter(a => a.store === store && a.product.toLowerCase() === meat.toLowerCase())
                .reduce((acc, a) => acc + (Number(a.quantity) || 0), 0);

            // 4. Consumo de Hoje (Soma de todos os logs de hoje para evitar duplicidade visual na carga)
            const todayConsumptionVal = logs
                .filter(l => l.store === store && l.product.toLowerCase() === meat.toLowerCase() && l.date === today)
                .reduce((acc, l) => acc + Number(l.quantity_consumed), 0);

            // 5. Estoque Inicial do Dia (Calculado baseando-se no fechamento de ontem)
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

    // Right-to-left input handler for 3 decimals
    const handleWeightInput = (value: string): { str: string, num: number } => {
        // Remove tudo que não for dígito
        const raw = value.replace(/\D/g, '');
        
        // Se vazio, retorna zero
        if (!raw) return { str: '0,000', num: 0 };

        // Converte para número dividindo por 1000 para ter 3 casas
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
            // Para evitar duplicidade no "Insert only" logic:
            // O ideal seria deletar os logs de hoje para essa loja/produtos e reinserir o total.
            // Mas como não temos a função deleteMany exposta aqui de forma simples, vamos salvar apenas o *delta* seria complexo.
            // Vamos assumir que o usuário está lançando o consumo do dia. 
            // Se já existe consumo, o processData somou.
            // A diferença entre o novo valor inputado e o valor carregado do banco seria o delta a salvar.
            // POR SIMPLIFICACAO DO PROMPT: Vamos salvar um novo log com o valor total digitado se for > 0,
            // POREM, isso duplicaria se o usuário salvar 2x.
            // CORREÇÃO: Vamos calcular a diferença do que foi carregado inicialmente vs o que está agora.
            
            // Recarregar dados frescos para comparar
            const freshLogs = await getMeatConsumptionLogs();
            
            const logsToSave: MeatInventoryLog[] = [];

            for (const item of inventoryData) {
                // Quanto já está salvo no banco HOJE
                const savedToday = freshLogs
                    .filter(l => l.store === selectedStore && l.product === item.name && l.date === today)
                    .reduce((acc, l) => acc + Number(l.quantity_consumed), 0);
                
                const currentInput = item.todayConsumptionVal;
                
                // Se o valor digitado for diferente do salvo
                if (currentInput !== savedToday) {
                    // Precisamos ajustar.
                    // Se currentInput > savedToday, lançamos a diferença positiva (consumo extra)
                    // Se currentInput < savedToday, lançamos a diferença negativa (estorno de consumo)
                    const diff = currentInput - savedToday;
                    
                    if (Math.abs(diff) > 0.0001) { // float tolerance
                         logsToSave.push({
                            id: '',
                            date: today,
                            store: selectedStore,
                            product: item.name,
                            quantity_consumed: diff // Pode ser negativo se reduziu o consumo
                        });
                    }
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
            // Force reload
            const [o, l, a] = await Promise.all([getOrders(), getMeatConsumptionLogs(), getMeatAdjustments()]);
            processData(o, l, a, selectedStore);
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
            // Reload
            const [o, l, a] = await Promise.all([getOrders(), getMeatConsumptionLogs(), getMeatAdjustments()]);
            processData(o, l, a, selectedStore);
        } catch (e: any) {
            alert("Erro ao salvar ajuste: " + e.message);
        }
    };

    if (loading && appData.stores.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={40}/></div>;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-20">
             <div className="bg-white rounded-lg shadow-card border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <History size={24} className="text-heroRed"/>
                            CONTROLE DIÁRIO DE CARNES
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                            Data: {new Date().toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                    
                    {/* Store Selector */}
                    <div className="w-full md:w-auto flex flex-col gap-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">Selecionar Loja</label>
                         <select 
                            value={selectedStore} 
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="w-full md:w-64 p-2.5 border border-slate-300 rounded-lg font-bold text-slate-700 bg-white focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed"
                        >
                            {appData.stores.length === 0 && <option value="">Sem lojas</option>}
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto justify-end items-end">
                        <button 
                            onClick={() => setShowModal(true)}
                            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors text-sm"
                        >
                            <PenTool size={16} className="text-blue-600"/> AJUSTE MANUAL
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-heroBlack hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-70 text-sm"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                            SALVAR LANÇAMENTO
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-800 text-white">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider w-1/3">Corte / Carne</th>
                                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider bg-slate-700 border-r border-slate-600">Estoque Inicial (Kg)</th>
                                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider bg-white text-slate-800 border-x border-slate-200 w-1/4">Consumo Dia (Kg)</th>
                                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider bg-slate-700">Estoque Final (Kg)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {inventoryData.map((item, idx) => (
                                <tr key={item.name} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-3 text-sm font-bold text-slate-800 border-r border-slate-100">
                                        {item.name}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                                        {formatWeight(item.initialStock)}
                                    </td>
                                    <td className="px-4 py-2 text-center border-x border-slate-200 bg-yellow-50/30 p-0">
                                        <input 
                                            type="text" 
                                            value={item.todayConsumptionStr}
                                            onChange={(e) => handleConsumptionChange(idx, e.target.value)}
                                            className="w-full h-full text-center p-2 bg-transparent font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-heroRed/50 outline-none font-mono text-lg"
                                            placeholder="0,000"
                                        />
                                    </td>
                                    <td className={`px-6 py-3 text-center text-sm font-black font-mono bg-slate-50/50 ${item.finalStock < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                        {formatWeight(item.finalStock)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-900 text-white font-bold border-t-4 border-slate-800">
                                <td className="px-6 py-4 text-right uppercase text-xs tracking-widest">TOTAIS GERAIS</td>
                                <td className="px-6 py-4 text-center font-mono text-sm text-slate-300">
                                    {formatWeight(inventoryData.reduce((acc, i) => acc + i.initialStock, 0))}
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-lg text-yellow-400 bg-slate-800 border-x border-slate-700">
                                    {formatWeight(inventoryData.reduce((acc, i) => acc + i.todayConsumptionVal, 0))}
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-sm text-green-400">
                                    {formatWeight(inventoryData.reduce((acc, i) => acc + i.finalStock, 0))}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-4 items-center shadow-sm">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                    <AlertCircle size={24} />
                </div>
                <div className="text-sm text-blue-800 flex-1">
                    <strong>Como funciona o cálculo?</strong>
                    <p className="mt-1 text-blue-700 opacity-90">
                        Estoque Inicial = (Total Comprado) - (Consumo Histórico) + (Ajustes Manuais).
                        <br/>O valor digitado na coluna "Consumo Dia" é subtraído do Estoque Inicial para gerar o Final.
                    </p>
                </div>
            </div>

            {/* Modal de Ajuste */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden border border-slate-200">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2 uppercase">
                                <PenTool size={18} className="text-heroRed"/> Ajuste Manual
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded border border-yellow-200 font-medium">
                                Use esta função para corrigir divergências de contagem ou perdas (validade, quebra).
                                <br/><span className="font-bold">Loja: {selectedStore}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Produto</label>
                                <select value={adjProduct} onChange={e => setAdjProduct(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-heroRed/20 outline-none">
                                    <option value="">Selecione o Corte...</option>
                                    {MEAT_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo de Ajuste</label>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setAdjType('entrada')}
                                        className={`flex-1 py-3 rounded-lg font-bold text-sm border transition-all ${adjType === 'entrada' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        ENTRADA (+)
                                    </button>
                                    <button 
                                        onClick={() => setAdjType('saida')}
                                        className={`flex-1 py-3 rounded-lg font-bold text-sm border transition-all ${adjType === 'saida' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        SAÍDA/PERDA (-)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quantidade (Kg)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={adjValueStr} 
                                        onChange={handleAdjValueChange}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-right font-mono text-2xl font-black text-slate-800 focus:ring-2 focus:ring-heroRed/20 outline-none"
                                    />
                                    <span className="absolute left-3 top-4 text-xs font-bold text-slate-400">KG</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Motivo do Ajuste</label>
                                <input 
                                    type="text" 
                                    value={adjReason} 
                                    onChange={e => setAdjReason(e.target.value)} 
                                    placeholder="Ex: Contagem incorreta, Perda, Bonificação"
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>

                            <button 
                                onClick={handleSaveAdjustment}
                                className="w-full bg-heroBlack text-white py-4 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-lg mt-2 flex justify-center items-center gap-2"
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
