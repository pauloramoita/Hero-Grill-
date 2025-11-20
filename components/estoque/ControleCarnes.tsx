

import React, { useState, useEffect } from 'react';
import { getOrders, getMeatConsumptionLogs, getMeatAdjustments, saveMeatConsumption, saveMeatAdjustment, getTodayLocalISO } from '../../services/storageService';
import { MeatInventoryLog, Order, MeatStockAdjustment } from '../../types';
import { Save, Loader2, AlertCircle, PenTool, X } from 'lucide-react';

export const ControleCarnes: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
            const [orders, logs, adjustments] = await Promise.all([getOrders(), getMeatConsumptionLogs(), getMeatAdjustments()]);
            processData(orders, logs, adjustments);
        } catch (e) {
            console.error("Erro ao carregar dados de estoque", e);
        } finally {
            setLoading(false);
        }
    };

    const formatWeight = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

    const processData = (orders: Order[], logs: MeatInventoryLog[], adjustments: MeatStockAdjustment[]) => {
        const data = MEAT_LIST.map(meat => {
            // 1. Total Comprado (Histórico)
            const totalBought = orders
                .filter(o => o.product.toLowerCase() === meat.toLowerCase())
                .reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);

            // 2. Total Consumido (Histórico ANTES de hoje)
            const totalConsumedPrev = logs
                .filter(l => l.product.toLowerCase() === meat.toLowerCase() && l.date < today)
                .reduce((acc, l) => acc + (Number(l.quantity_consumed) || 0), 0);
            
            // 3. Total Ajustes (Correções manuais)
            const totalAdjustments = adjustments
                .filter(a => a.product.toLowerCase() === meat.toLowerCase())
                .reduce((acc, a) => acc + (Number(a.quantity) || 0), 0);

            // 4. Consumo de Hoje (se já existir salvo)
            const todayLog = logs.find(l => l.product.toLowerCase() === meat.toLowerCase() && l.date === today);
            const todayConsumptionVal = todayLog ? todayLog.quantity_consumed : 0;

            // 5. Estoque Inicial do Dia
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
        const raw = value.replace(/\D/g, '');
        const num = parseInt(raw, 10) / 1000;
        return { str: formatWeight(num), num };
    };

    const handleConsumptionChange = (index: number, rawValue: string) => {
        const newData = [...inventoryData];
        // Only numbers passed to helper
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
        setSaving(true);
        try {
            // Prepare logs to save
            const logsToSave: MeatInventoryLog[] = inventoryData
                .filter(item => item.todayConsumptionVal > 0)
                .map(item => ({
                    id: '', // Generated by DB
                    date: today,
                    product: item.name,
                    quantity_consumed: item.todayConsumptionVal
                }));

            if (logsToSave.length === 0) {
                alert("Nenhum consumo > 0 informado para salvar.");
                setSaving(false);
                return;
            }

            for (const log of logsToSave) {
                await saveMeatConsumption(log);
            }

            alert("Dados salvos com sucesso!");
            loadData(); 
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAdjustment = async () => {
        if (!adjProduct || adjValueNum <= 0 || !adjReason) {
            alert("Preencha todos os campos do ajuste.");
            return;
        }

        const quantity = adjType === 'entrada' ? adjValueNum : -adjValueNum;

        try {
            await saveMeatAdjustment({
                id: '',
                date: today,
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

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={40}/></div>;

    return (
        <div className="max-w-5xl mx-auto animate-fadeIn">
             <div className="bg-white rounded-lg shadow-card border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Controle Diário de Churrasco</h2>
                        <p className="text-sm text-slate-500">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow transition-colors text-sm"
                        >
                            <PenTool size={16}/> AJUSTE MANUAL
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-heroBlack hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow transition-colors disabled:opacity-70 text-sm"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                            SALVAR DIA
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-200 text-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider">Corte / Carne</th>
                                <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-wider bg-slate-300">Estoque Inicial</th>
                                <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-wider bg-white border-x border-slate-200">Carnes Dia (Kg)</th>
                                <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-wider bg-slate-300">Estoque Final</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {inventoryData.map((item, idx) => (
                                <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-sm font-bold text-slate-800 bg-slate-100 border-r border-slate-200">
                                        {item.name}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-center font-mono text-slate-600">
                                        {formatWeight(item.initialStock)}
                                    </td>
                                    <td className="px-4 py-2 text-center border-x border-slate-200 bg-white">
                                        <input 
                                            type="text" 
                                            value={item.todayConsumptionStr}
                                            onChange={(e) => handleConsumptionChange(idx, e.target.value)}
                                            className="w-28 text-center p-2 border border-slate-300 rounded font-bold text-slate-800 focus:ring-2 focus:ring-heroRed/50 outline-none bg-slate-50 focus:bg-white font-mono text-lg"
                                        />
                                    </td>
                                    <td className={`px-6 py-3 text-center text-sm font-bold font-mono ${item.finalStock < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                        {formatWeight(item.finalStock)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-800 text-white font-bold">
                                <td className="px-6 py-3 text-right">TOTAIS</td>
                                <td className="px-6 py-3 text-center font-mono text-xs">
                                    {formatWeight(inventoryData.reduce((acc, i) => acc + i.initialStock, 0))}
                                </td>
                                <td className="px-6 py-3 text-center font-mono text-xs border-x border-slate-600 bg-slate-700">
                                    {formatWeight(inventoryData.reduce((acc, i) => acc + i.todayConsumptionVal, 0))}
                                </td>
                                <td className="px-6 py-3 text-center font-mono text-xs">
                                    {formatWeight(inventoryData.reduce((acc, i) => acc + i.finalStock, 0))}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-4 flex gap-3 items-start">
                <AlertCircle className="text-yellow-600 mt-1" size={20} />
                <div className="text-sm text-yellow-800">
                    <strong>Nota sobre Cálculo:</strong> Estoque Inicial = (Total Comprado em Pedidos) - (Histórico de Consumo) + (Ajustes Manuais).
                    <br/>Verifique se todos os pedidos de compra foram lançados corretamente antes de ajustar manualmente.
                </div>
            </div>

            {/* Modal de Ajuste */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md animate-fadeIn">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <PenTool size={20}/> Ajuste Manual de Estoque
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-red-600"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Produto</label>
                                <select value={adjProduct} onChange={e => setAdjProduct(e.target.value)} className="w-full border p-2 rounded">
                                    <option value="">Selecione...</option>
                                    {MEAT_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Ajuste</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setAdjType('entrada')}
                                        className={`flex-1 py-2 rounded font-bold text-sm border ${adjType === 'entrada' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-gray-200 text-gray-500'}`}
                                    >
                                        Entrada (+)
                                    </button>
                                    <button 
                                        onClick={() => setAdjType('saida')}
                                        className={`flex-1 py-2 rounded font-bold text-sm border ${adjType === 'saida' ? 'bg-red-100 border-red-500 text-red-800' : 'bg-white border-gray-200 text-gray-500'}`}
                                    >
                                        Saída/Perda (-)
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantidade (Kg)</label>
                                <input 
                                    type="text" 
                                    value={adjValueStr} 
                                    onChange={handleAdjValueChange}
                                    className="w-full border p-2 rounded text-right font-mono text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo</label>
                                <input 
                                    type="text" 
                                    value={adjReason} 
                                    onChange={e => setAdjReason(e.target.value)} 
                                    placeholder="Ex: Contagem incorreta, Perda por validade"
                                    className="w-full border p-2 rounded"
                                />
                            </div>
                            <button 
                                onClick={handleSaveAdjustment}
                                className="w-full bg-heroBlack text-white py-3 rounded font-bold hover:bg-slate-800 transition-colors mt-2"
                            >
                                SALVAR AJUSTE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};