

import React, { useState, useEffect } from 'react';
import { getOrders, getMeatConsumptionLogs, getMeatAdjustments, getTodayLocalISO } from '../../services/storageService';
import { Printer, Loader2, ShoppingCart } from 'lucide-react';

export const GerarPedidoCarnes: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [orderData, setOrderData] = useState<{
        name: string;
        currentStock: number;
        orderQtyStr: string; // Formatted string (e.g. "1,200")
        orderQtyNum: number; // Actual number
        unit: string;
    }[]>([]);

    const MEAT_LIST = [
        'Alcatra', 'Capa do filé', 'Coxao mole', 'Contra filé', 'Coração', 
        'Cupim', 'Fraldinha', 'Patinho', 'Picanha', 'Costela de Boi'
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [orders, logs, adjustments] = await Promise.all([getOrders(), getMeatConsumptionLogs(), getMeatAdjustments()]);
            
            const data = MEAT_LIST.map(meat => {
                // Calculate Stock
                const totalBought = orders
                    .filter(o => o.product.toLowerCase() === meat.toLowerCase())
                    .reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);

                const totalConsumed = logs
                    .filter(l => l.product.toLowerCase() === meat.toLowerCase())
                    .reduce((acc, l) => acc + (Number(l.quantity_consumed) || 0), 0);

                const totalAdjusted = adjustments
                    .filter(a => a.product.toLowerCase() === meat.toLowerCase())
                    .reduce((acc, a) => acc + (Number(a.quantity) || 0), 0);
                
                return {
                    name: meat,
                    currentStock: totalBought - totalConsumed + totalAdjusted,
                    orderQtyStr: '0,000',
                    orderQtyNum: 0,
                    unit: 'Peças' // Or Kg based on context, sticking to request requirement mostly
                };
            });

            setOrderData(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatWeight = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

    const handleQtyChange = (index: number, value: string) => {
        const newData = [...orderData];
        // Right-to-left logic
        const raw = value.replace(/\D/g, '');
        const num = parseInt(raw, 10) / 1000;
        
        newData[index].orderQtyStr = formatWeight(num);
        newData[index].orderQtyNum = num;
        setOrderData(newData);
    };

    const handlePrint = () => {
        window.print();
    };

    const totalItems = orderData.reduce((acc, item) => acc + (item.orderQtyNum > 0 ? 1 : 0), 0);
    const totalWeight = orderData.reduce((acc, item) => acc + item.orderQtyNum, 0);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={40}/></div>;

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {/* Action Bar (No Print) */}
            <div className="mb-6 flex justify-end no-print">
                <button 
                    onClick={handlePrint}
                    className="bg-heroBlack text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-lg"
                >
                    <Printer size={20}/> IMPRIMIR PEDIDO
                </button>
            </div>

            {/* Invoice / Order Sheet */}
            <div className="bg-white shadow-2xl border border-slate-200 rounded-none sm:rounded-xl overflow-hidden print:shadow-none print:border-2 print:rounded-none" id="print-area">
                
                {/* Header */}
                <div className="bg-slate-50 p-8 border-b-2 border-slate-200 flex justify-between items-center">
                    <div>
                        <div className="flex items-baseline gap-1 select-none mb-2">
                            <span className="font-black text-heroRed text-3xl italic tracking-tighter" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                                HERO
                            </span>
                            <span className="font-black text-heroBlack text-3xl italic tracking-tighter" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                                GRILL
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Controle de Carnes & Churrasco</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Pedido de Compra</h2>
                        <div className="mt-2 inline-block bg-white border border-slate-300 px-4 py-1 rounded-full">
                            <span className="text-sm font-bold text-slate-500">DATA: </span>
                            <span className="text-sm font-black text-slate-800">{new Date().toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="p-8">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-800">
                                <th className="text-left py-3 font-black uppercase text-sm text-slate-800 w-5/12">Item / Corte</th>
                                <th className="text-center py-3 font-bold uppercase text-xs text-slate-500 w-2/12">Estoque Atual</th>
                                <th className="text-center py-3 font-black uppercase text-sm text-slate-800 w-3/12 bg-yellow-50">Qtd. Pedido</th>
                                <th className="text-left py-3 pl-4 font-bold uppercase text-xs text-slate-500 w-2/12">Unidade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {orderData.map((item, idx) => {
                                const hasOrder = item.orderQtyNum > 0;
                                return (
                                    <tr key={item.name} className={`transition-colors ${hasOrder ? 'bg-yellow-50' : ''}`}>
                                        <td className="py-4 font-bold text-slate-800 text-lg">
                                            {item.name}
                                        </td>
                                        <td className="py-4 text-center font-mono text-slate-500 font-medium">
                                            {formatWeight(item.currentStock)}
                                        </td>
                                        <td className="py-2 text-center bg-yellow-50/50">
                                            <input 
                                                type="text" 
                                                value={item.orderQtyStr}
                                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                className={`w-full text-center p-2 rounded font-black text-2xl outline-none bg-transparent border-b-2 transition-colors font-mono ${hasOrder ? 'border-heroBlack text-heroBlack' : 'border-transparent text-slate-300 focus:border-slate-300 focus:text-slate-600'}`}
                                            />
                                        </td>
                                        <td className="py-4 pl-4 font-bold text-xs text-slate-400 uppercase tracking-wider">
                                            {item.unit}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-4 border-slate-800">
                                <td className="pt-4 text-right font-black text-slate-500 uppercase text-xs">Total Itens:</td>
                                <td className="pt-4 pl-2 font-bold text-slate-800 text-lg">{totalItems}</td>
                                <td className="pt-4 text-right font-black text-slate-500 uppercase text-xs">Peso Total:</td>
                                <td className="pt-4 pl-2 font-black text-heroRed text-2xl">{formatWeight(totalWeight)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="mt-16 border-t border-slate-300 pt-4 flex justify-between items-end">
                        <div className="w-1/2 pr-8">
                            <div className="h-20 border-b border-slate-400 mb-2"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase text-center">Assinatura Responsável</p>
                        </div>
                        <div className="w-1/2 text-right">
                            <p className="text-xs text-slate-400 italic">Documento gerado digitalmente pelo sistema Hero Grill.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};