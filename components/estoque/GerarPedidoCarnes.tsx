
import React, { useState, useEffect } from 'react';
import { getOrders, getMeatConsumptionLogs, getTodayLocalISO } from '../../services/storageService';
import { Order, MeatInventoryLog } from '../../types';
import { Printer, Loader2, ShoppingCart } from 'lucide-react';

export const GerarPedidoCarnes: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [orderData, setOrderData] = useState<{
        name: string;
        currentStock: number;
        orderQty: string;
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
            const [orders, logs] = await Promise.all([getOrders(), getMeatConsumptionLogs()]);
            
            const data = MEAT_LIST.map(meat => {
                // Calculate Stock
                const totalBought = orders
                    .filter(o => o.product.toLowerCase() === meat.toLowerCase())
                    .reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);

                const totalConsumed = logs
                    .filter(l => l.product.toLowerCase() === meat.toLowerCase())
                    .reduce((acc, l) => acc + (Number(l.quantity_consumed) || 0), 0);
                
                return {
                    name: meat,
                    currentStock: totalBought - totalConsumed,
                    orderQty: '0',
                    unit: 'Peças' // Default unit for display, could be dynamic
                };
            });

            setOrderData(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleQtyChange = (index: number, value: string) => {
        const newData = [...orderData];
        // Allow numbers only
        if (!/^\d*$/.test(value)) return;
        
        newData[index].orderQty = value;
        setOrderData(newData);
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={40}/></div>;

    return (
        <div className="max-w-3xl mx-auto animate-fadeIn">
            <div className="bg-white shadow-card border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pedido Fornecedor</h2>
                        <p className="text-sm text-slate-500 font-medium">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                    <button 
                        onClick={handlePrint}
                        className="bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-900 transition-colors no-print"
                    >
                        <Printer size={18}/> IMPRIMIR
                    </button>
                </div>

                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-200 text-slate-700 border-b border-slate-300">
                            <th className="text-left py-3 px-6 font-black uppercase text-sm w-1/2">Item</th>
                            <th className="text-center py-3 px-4 font-black uppercase text-sm border-l border-slate-300">Estoque Atual</th>
                            <th className="text-center py-3 px-4 font-black uppercase text-sm border-l border-slate-300 bg-slate-300">Pedido</th>
                            <th className="text-left py-3 px-4 font-black uppercase text-sm bg-slate-300">Unidade</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {orderData.map((item, idx) => {
                            const hasOrder = parseInt(item.orderQty) > 0;
                            return (
                                <tr key={item.name} className={`transition-colors ${hasOrder ? 'bg-yellow-100' : 'hover:bg-slate-50'}`}>
                                    <td className="py-3 px-6 font-bold text-slate-800 border-r border-slate-200">
                                        {item.name}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono text-slate-500 text-sm">
                                        {item.currentStock.toFixed(2)}
                                    </td>
                                    <td className={`py-2 px-2 text-center border-l border-slate-300 ${hasOrder ? 'bg-yellow-300' : ''}`}>
                                        <input 
                                            type="text" 
                                            value={item.orderQty}
                                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                                            className={`w-20 text-center p-1.5 rounded font-bold text-lg outline-none border focus:ring-2 focus:ring-black/20 ${hasOrder ? 'bg-white border-yellow-400 text-black' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                        />
                                    </td>
                                    <td className={`py-3 px-4 font-bold text-sm ${hasOrder ? 'bg-yellow-300 text-black' : 'text-slate-400'}`}>
                                        {item.unit}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-6 p-4 text-center text-slate-400 text-sm no-print">
                <p>Preencha as quantidades e clique em Imprimir para gerar o PDF ou enviar ao fornecedor.</p>
            </div>
        </div>
    );
};
