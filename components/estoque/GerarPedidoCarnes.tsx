

import React, { useState, useEffect } from 'react';
import { getOrders, getMeatConsumptionLogs, getMeatAdjustments, getAppData } from '../../services/storageService';
import { AppData } from '../../types';
import { Printer, Loader2 } from 'lucide-react';

export const GerarPedidoCarnes: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [selectedStore, setSelectedStore] = useState('');

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
            const [d] = await Promise.all([getAppData()]);
            setAppData(d);
            if (d.stores.length > 0 && !selectedStore) {
                const defaultStore = d.stores[0];
                setSelectedStore(defaultStore);
                await fetchDataForStore(defaultStore);
            } else if (selectedStore) {
                await fetchDataForStore(selectedStore);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedStore) {
            setLoading(true);
            fetchDataForStore(selectedStore).then(() => setLoading(false));
        }
    }, [selectedStore]);

    const fetchDataForStore = async (store: string) => {
        const [orders, logs, adjustments] = await Promise.all([getOrders(), getMeatConsumptionLogs(), getMeatAdjustments()]);
        
        const data = MEAT_LIST.map(meat => {
            // Calculate Stock for Store
            const totalBought = orders
                .filter(o => o.store === store && o.product.toLowerCase() === meat.toLowerCase())
                .reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);

            const totalConsumed = logs
                .filter(l => l.store === store && l.product.toLowerCase() === meat.toLowerCase())
                .reduce((acc, l) => acc + (Number(l.quantity_consumed) || 0), 0);

            const totalAdjusted = adjustments
                .filter(a => a.store === store && a.product.toLowerCase() === meat.toLowerCase())
                .reduce((acc, a) => acc + (Number(a.quantity) || 0), 0);
            
            return {
                name: meat,
                currentStock: totalBought - totalConsumed + totalAdjusted,
                orderQtyStr: '0,000',
                orderQtyNum: 0,
                unit: 'Peças' 
            };
        });

        setOrderData(data);
    }

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
            {/* Header Actions (No Print) */}
            <div className="mb-6 flex justify-between items-center no-print bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selecionar Loja</label>
                    <select 
                        value={selectedStore} 
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="w-full md:w-64 p-2 border border-slate-300 rounded-lg font-bold text-slate-700 bg-white"
                    >
                        {appData.stores.length === 0 && <option value="">Sem lojas</option>}
                        {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                <button 
                    onClick={handlePrint}
                    className="bg-heroBlack text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-lg"
                >
                    <Printer size={20}/> IMPRIMIR PEDIDO
                </button>
            </div>

            {/* Invoice / Order Sheet - PRINT AREA */}
            <div id="print-area" className="bg-white shadow-2xl border border-slate-200 rounded-none sm:rounded-xl overflow-hidden mx-auto">
                
                {/* Custom Styles for Print - Force layout size */}
                <style>
                    {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #print-area, #print-area * {
                            visibility: visible;
                        }
                        #print-area {
                            position: absolute;
                            left: 50%;
                            top: 0;
                            transform: translateX(-50%);
                            width: 500px !important; /* Forced width for 'image' look */
                            min-width: 500px !important;
                            max-width: 500px !important;
                            margin: 0 auto;
                            padding: 0;
                            border: 2px solid #000 !important;
                            box-shadow: none !important;
                        }
                        /* Remove backgrounds for ink saving, keep lines */
                        tr, td, th {
                            border-bottom: 1px solid #000 !important;
                        }
                        .bg-slate-50, .bg-yellow-50, .bg-yellow-50\\/50 {
                            background-color: white !important;
                        }
                        input {
                            border: none !important;
                            font-weight: bold !important;
                            color: black !important;
                            text-align: center;
                        }
                    }
                    `}
                </style>

                {/* Header */}
                <div className="bg-slate-50 p-6 border-b-2 border-slate-800 flex justify-between items-center">
                    <div>
                        <div className="flex items-baseline gap-1 select-none mb-1">
                            <span className="font-black text-heroRed text-2xl italic tracking-tighter" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                                HERO
                            </span>
                            <span className="font-black text-heroBlack text-2xl italic tracking-tighter" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                                GRILL
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Controle de Carnes</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pedido Compra</h2>
                        <div className="mt-1 text-xs font-bold text-slate-600">
                            {selectedStore}
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-1">
                             {new Date().toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="p-4">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-800">
                                <th className="text-left py-2 font-black uppercase text-xs text-slate-800 w-5/12">Item</th>
                                <th className="text-center py-2 font-bold uppercase text-[10px] text-slate-500 w-2/12">Atual</th>
                                <th className="text-center py-2 font-black uppercase text-xs text-slate-800 w-3/12 bg-yellow-50">Pedido</th>
                                <th className="text-left py-2 pl-2 font-bold uppercase text-[10px] text-slate-500 w-2/12">Un</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {orderData.map((item, idx) => {
                                const hasOrder = item.orderQtyNum > 0;
                                return (
                                    <tr key={item.name} className={`transition-colors ${hasOrder ? 'bg-yellow-50' : ''}`}>
                                        <td className="py-3 font-bold text-slate-800 text-sm">
                                            {item.name}
                                        </td>
                                        <td className="py-3 text-center font-mono text-slate-500 font-medium text-xs">
                                            {formatWeight(item.currentStock)}
                                        </td>
                                        <td className="py-1 text-center bg-yellow-50/50">
                                            <input 
                                                type="text" 
                                                value={item.orderQtyStr}
                                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                className={`w-full text-center p-1 rounded font-black text-lg outline-none bg-transparent border-b-2 transition-colors font-mono ${hasOrder ? 'border-heroBlack text-heroBlack' : 'border-transparent text-slate-300 focus:border-slate-300 focus:text-slate-600'}`}
                                            />
                                        </td>
                                        <td className="py-3 pl-2 font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                                            {item.unit}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-slate-800">
                                <td className="pt-3 text-right font-black text-slate-500 uppercase text-[10px]">Total Itens:</td>
                                <td className="pt-3 pl-2 font-bold text-slate-800 text-sm">{totalItems}</td>
                                <td className="pt-3 text-right font-black text-slate-500 uppercase text-[10px]">Total:</td>
                                <td className="pt-3 pl-1 font-black text-heroRed text-lg">{formatWeight(totalWeight)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="mt-12 border-t border-slate-300 pt-2 flex justify-between items-end">
                        <div className="w-1/2 pr-4">
                            <div className="h-12 border-b border-slate-400 mb-1"></div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase text-center">Assinatura</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};