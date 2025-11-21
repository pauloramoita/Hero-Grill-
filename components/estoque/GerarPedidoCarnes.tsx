
import React, { useState, useEffect } from 'react';
import { getOrders, getMeatConsumptionLogs, getMeatAdjustments, getAppData } from '../../services/storageService';
import { AppData } from '../../types';
import { Printer, Loader2, ShoppingBag, Eye, EyeOff } from 'lucide-react';

export const GerarPedidoCarnes: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [selectedStore, setSelectedStore] = useState('');
    const [showStock, setShowStock] = useState(true);

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
                unit: 'KG' 
            };
        });

        setOrderData(data);
    }

    const formatWeight = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

    // Right-to-left input handler for 3 decimals
    const handleQtyChange = (index: number, value: string) => {
        const newData = [...orderData];
        const raw = value.replace(/\D/g, '');
        
        if (!raw) {
            newData[index].orderQtyStr = '0,000';
            newData[index].orderQtyNum = 0;
        } else {
            const num = parseInt(raw, 10) / 1000;
            newData[index].orderQtyStr = formatWeight(num);
            newData[index].orderQtyNum = num;
        }
        setOrderData(newData);
    };

    const handleUnitChange = (index: number, val: string) => {
        const newData = [...orderData];
        newData[index].unit = val;
        setOrderData(newData);
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculations for Footer
    const totalItems = orderData.reduce((acc, item) => acc + (item.orderQtyNum > 0 ? 1 : 0), 0);
    const totalWeight = orderData.filter(i => i.unit === 'KG').reduce((acc, item) => acc + item.orderQtyNum, 0);
    const totalPieces = orderData.filter(i => i.unit === 'PÇ').reduce((acc, item) => acc + item.orderQtyNum, 0);

    if (loading && appData.stores.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={40}/></div>;

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            
            {/* Screen-Only Controls */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 no-print bg-white p-6 rounded-xl shadow-card border border-slate-200">
                 <div className="w-full md:w-auto flex flex-col gap-2">
                    <div className="flex flex-col">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Selecionar Loja do Pedido</label>
                        <select 
                            value={selectedStore} 
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="w-full md:w-72 p-3 border border-slate-300 rounded-lg font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed outline-none"
                        >
                            {appData.stores.length === 0 && <option value="">Sem lojas</option>}
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    
                    {/* Toggle Estoque */}
                    <button 
                        onClick={() => setShowStock(!showStock)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 w-full md:w-fit ${showStock ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                        {showStock ? <Eye size={16}/> : <EyeOff size={16}/>}
                        {showStock ? 'Ocultar Coluna Estoque' : 'Exibir Coluna Estoque'}
                    </button>
                 </div>

                <button 
                    onClick={handlePrint}
                    className="w-full md:w-auto bg-heroBlack text-white px-8 py-3 rounded-lg font-bold flex items-center justify-center gap-3 hover:bg-slate-900 transition-colors shadow-lg"
                >
                    <Printer size={22}/> IMPRIMIR COMO IMAGEM
                </button>
            </div>

            {/* PRINT AREA - Fixed Width 480px Logic */}
            <div className="flex justify-center">
                <div 
                    id="print-area" 
                    className="bg-white shadow-2xl border-2 border-gray-800 overflow-hidden relative print-container"
                    style={{ width: '480px', minWidth: '480px', maxWidth: '480px' }}
                >
                    <style>
                        {`
                        @media print {
                            @page { margin: 0; size: auto; }
                            body { visibility: hidden; background: white; }
                            body * { visibility: hidden; }
                            #print-area, #print-area * {
                                visibility: visible;
                            }
                            #print-area {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 480px !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                border: none !important;
                                box-shadow: none !important;
                            }
                            .no-print { display: none !important; }
                            /* Force black text for thermal printers */
                            * { color: black !important; }
                            /* Remove input/select borders for print */
                            input, select { border: none !important; background: transparent !important; appearance: none !important; }
                        }
                        .print-container {
                            font-family: 'Courier New', Courier, monospace; /* Receipt style font fallback */
                        }
                        `}
                    </style>

                    {/* RECEIPT HEADER */}
                    <div className="p-5 pb-2 text-center border-b-2 border-black bg-white">
                        <div className="flex justify-center items-baseline gap-1 mb-1">
                            <span className="font-black text-3xl italic tracking-tighter text-black" style={{ fontFamily: 'Arial Black, sans-serif' }}>HERO</span>
                            <span className="font-black text-3xl italic tracking-tighter text-black" style={{ fontFamily: 'Arial Black, sans-serif' }}>GRILL</span>
                        </div>
                        <h2 className="text-lg font-black uppercase tracking-widest border-y-2 border-black py-1 mb-2">PEDIDO DE COMPRA</h2>
                        
                        <div className="my-4">
                            <div className="border-[3px] border-black p-3">
                                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-1">UNIDADE SOLICITANTE</span>
                                <span className="block text-2xl font-black uppercase leading-none">{selectedStore}</span>
                            </div>
                        </div>

                        <div className="text-right mb-1">
                            <span className="text-[10px] font-bold uppercase text-gray-500 mr-2">Data do Pedido:</span>
                            <span className="text-sm font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>

                    {/* RECEIPT BODY */}
                    <div className="p-2 bg-white">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-black">
                                    <th className={`py-2 text-left font-black uppercase ${showStock ? 'w-5/12' : 'w-6/12'}`}>Produto</th>
                                    {showStock && <th className="py-2 text-center font-bold uppercase text-[10px] text-gray-600 w-2/12">Estoque</th>}
                                    <th className={`py-2 text-center font-black uppercase bg-gray-200 ${showStock ? 'w-3/12' : 'w-4/12'}`}>PEDIDO</th>
                                    <th className="py-2 text-right font-bold uppercase text-[10px] w-2/12">Unid.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dashed divide-gray-400">
                                {orderData.map((item, idx) => {
                                    const hasOrder = item.orderQtyNum > 0;
                                    return (
                                        <tr key={item.name} className={hasOrder ? 'bg-gray-50 font-bold' : ''}>
                                            <td className="py-3 pl-1 text-sm uppercase">
                                                {item.name}
                                            </td>
                                            {showStock && (
                                                <td className="py-3 text-center font-mono text-xs text-gray-500">
                                                    {formatWeight(item.currentStock)}
                                                </td>
                                            )}
                                            <td className="py-1 text-center bg-gray-100 border-x border-gray-200">
                                                <input 
                                                    type="text" 
                                                    value={item.orderQtyStr}
                                                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                    className={`w-full text-center bg-transparent font-black text-lg outline-none p-0 m-0 ${hasOrder ? 'text-black' : 'text-gray-300'}`}
                                                />
                                            </td>
                                            <td className="py-3 pr-1 text-right">
                                                <select 
                                                    value={item.unit}
                                                    onChange={(e) => handleUnitChange(idx, e.target.value)}
                                                    className="bg-transparent font-bold outline-none text-right w-full appearance-none cursor-pointer text-xs uppercase"
                                                    style={{ textAlignLast: 'right' }}
                                                >
                                                    <option value="KG">KG</option>
                                                    <option value="PÇ">PÇ</option>
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* RECEIPT FOOTER */}
                    <div className="bg-black text-white p-4 mt-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold uppercase opacity-80">Total de Itens:</span>
                            <span className="font-mono font-bold">{totalItems}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-600 pt-2">
                            <span className="text-sm font-black uppercase">TOTAL ESPERADO:</span>
                            <div className="text-right">
                                <span className="text-2xl font-black block leading-none">{formatWeight(totalWeight)} Kg</span>
                                {totalPieces > 0 && (
                                    <span className="text-sm font-bold text-gray-400 block mt-1">+ {formatWeight(totalPieces)} Pçs</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SIGNATURE AREA */}
                    <div className="p-6 pb-8 bg-white border-t border-dashed border-gray-400 text-center">
                        <div className="h-12 border-b border-black w-2/3 mx-auto mb-2"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Assinatura do Responsável</p>
                        <p className="text-[8px] text-gray-400 mt-4 uppercase">Sistema Hero Grill Self-service</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
