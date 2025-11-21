
import React, { useState, useEffect, useRef } from 'react';
import { getOrders, getMeatConsumptionLogs, getMeatAdjustments, getAppData } from '../../services/storageService';
import { AppData } from '../../types';
import { Printer, Loader2, Share2, Eye, EyeOff } from 'lucide-react';
import html2canvas from 'html2canvas';

export const GerarPedidoCarnes: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [selectedStore, setSelectedStore] = useState('');
    const [showStock, setShowStock] = useState(false); // Default oculto para mobile ficar mais limpo

    const printRef = useRef<HTMLDivElement>(null);

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

    const handleShareImage = async () => {
        if (!printRef.current) return;
        setGeneratingImage(true);

        try {
            // Aguarda renderização
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(printRef.current, {
                scale: 2, // Melhora qualidade
                backgroundColor: '#ffffff',
                logging: false
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert('Erro ao gerar imagem.');
                    setGeneratingImage(false);
                    return;
                }

                const file = new File([blob], `pedido_${selectedStore.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.png`, { type: "image/png" });

                // Verifica suporte a compartilhamento nativo (Mobile)
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Pedido Hero Grill',
                            text: `Pedido de Compra - ${selectedStore}`
                        });
                    } catch (shareError) {
                        console.log('Compartilhamento cancelado ou falhou', shareError);
                    }
                } else {
                    // Fallback para Desktop (Download)
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL("image/png");
                    link.download = file.name;
                    link.click();
                }
                setGeneratingImage(false);
            }, 'image/png');

        } catch (err) {
            console.error(err);
            alert('Erro ao gerar imagem do pedido.');
            setGeneratingImage(false);
        }
    };

    // Calculations for Footer
    const totalItems = orderData.reduce((acc, item) => acc + (item.orderQtyNum > 0 ? 1 : 0), 0);
    const totalWeight = orderData.filter(i => i.unit === 'KG').reduce((acc, item) => acc + item.orderQtyNum, 0);
    const totalPieces = orderData.filter(i => i.unit === 'PÇ').reduce((acc, item) => acc + item.orderQtyNum, 0);

    if (loading && appData.stores.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={40}/></div>;

    return (
        <div className="w-full max-w-md mx-auto animate-fadeIn pb-24">
            
            {/* Controls Header */}
            <div className="mb-4 no-print bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
                 <div className="flex flex-col gap-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Loja Solicitante</label>
                    <select 
                        value={selectedStore} 
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed outline-none"
                    >
                        {appData.stores.length === 0 && <option value="">Sem lojas</option>}
                        {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 
                 <div className="flex justify-between items-center gap-2">
                    <button 
                        onClick={() => setShowStock(!showStock)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${showStock ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                        {showStock ? <Eye size={14}/> : <EyeOff size={14}/>}
                        {showStock ? 'Ocultar Estoque' : 'Ver Estoque'}
                    </button>
                 </div>
            </div>

            {/* PRINT AREA */}
            <div className="flex justify-center w-full">
                <div 
                    id="print-area" 
                    ref={printRef}
                    className="bg-white shadow-2xl border border-gray-300 w-full overflow-hidden relative"
                    style={{ fontFamily: "'Courier New', Courier, monospace" }}
                >
                    {/* RECEIPT HEADER */}
                    <div className="p-4 pb-2 text-center border-b-2 border-black bg-white">
                        <div className="flex justify-center items-baseline gap-1 mb-1">
                            <span className="font-black text-2xl italic tracking-tighter text-black" style={{ fontFamily: 'Arial Black, sans-serif' }}>HERO</span>
                            <span className="font-black text-2xl italic tracking-tighter text-black" style={{ fontFamily: 'Arial Black, sans-serif' }}>GRILL</span>
                        </div>
                        <h2 className="text-base font-black uppercase tracking-widest border-y-2 border-black py-1 mb-3">PEDIDO DE COMPRA</h2>
                        
                        <div className="mb-3">
                            <div className="border-[3px] border-black p-2 inline-block w-full max-w-[300px]">
                                <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-1">UNIDADE SOLICITANTE</span>
                                <span className="block text-xl font-black uppercase leading-none truncate">{selectedStore}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-end px-1">
                            <span className="text-[10px] font-bold uppercase text-gray-500">Data:</span>
                            <span className="text-sm font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>

                    {/* RECEIPT BODY */}
                    <div className="p-1 bg-white">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-black">
                                    <th className={`py-2 pl-1 text-left font-black uppercase text-xs ${showStock ? 'w-4/12' : 'w-6/12'}`}>Produto</th>
                                    {showStock && <th className="py-2 text-center font-bold uppercase text-[9px] text-gray-600 w-2/12">Estoque</th>}
                                    <th className={`py-2 text-center font-black uppercase bg-gray-100 text-xs ${showStock ? 'w-4/12' : 'w-4/12'}`}>PEDIDO</th>
                                    <th className="py-2 pr-1 text-right font-bold uppercase text-[9px] w-2/12">Unid.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dashed divide-gray-300">
                                {orderData.map((item, idx) => {
                                    const hasOrder = item.orderQtyNum > 0;
                                    return (
                                        <tr key={item.name} className={hasOrder ? 'bg-gray-50 font-bold' : ''}>
                                            <td className="py-2 pl-1 text-xs uppercase align-middle leading-tight">
                                                {item.name}
                                            </td>
                                            {showStock && (
                                                <td className="py-2 text-center font-mono text-[10px] text-gray-500 align-middle">
                                                    {formatWeight(item.currentStock)}
                                                </td>
                                            )}
                                            <td className="py-1 text-center bg-gray-100 border-x border-gray-200 align-middle">
                                                <input 
                                                    type="text" 
                                                    value={item.orderQtyStr}
                                                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                    className={`w-full text-center bg-transparent font-black text-base outline-none p-0 m-0 ${hasOrder ? 'text-black' : 'text-gray-300'}`}
                                                />
                                            </td>
                                            <td className="py-2 pr-1 text-right align-middle">
                                                <select 
                                                    value={item.unit}
                                                    onChange={(e) => handleUnitChange(idx, e.target.value)}
                                                    className="bg-transparent font-bold outline-none text-right w-full appearance-none cursor-pointer text-[10px] uppercase p-0 m-0 border-none"
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
                    <div className="bg-black text-white p-3 mt-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold uppercase opacity-80">Total de Itens:</span>
                            <span className="font-mono font-bold text-sm">{totalItems}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-600 pt-2">
                            <span className="text-xs font-black uppercase">TOTAL ESPERADO:</span>
                            <div className="text-right leading-tight">
                                <span className="text-xl font-black block">{formatWeight(totalWeight)} Kg</span>
                                {totalPieces > 0 && (
                                    <span className="text-[10px] font-bold text-gray-400 block">+ {formatWeight(totalPieces)} Pçs</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SIGNATURE AREA */}
                    <div className="p-4 pb-6 bg-white border-t border-dashed border-gray-400 text-center">
                        <div className="h-8 border-b border-black w-3/4 mx-auto mb-1"></div>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Assinatura do Responsável</p>
                    </div>
                </div>
            </div>

            {/* Sticky Floating Action Button */}
            <div className="fixed bottom-6 left-0 w-full px-4 flex justify-center z-50 no-print">
                <button 
                    onClick={handleShareImage}
                    disabled={generatingImage}
                    className="bg-heroBlack text-white w-full max-w-md py-4 rounded-full font-bold shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all border-2 border-white/20"
                >
                    {generatingImage ? (
                        <Loader2 size={20} className="animate-spin"/> 
                    ) : (
                        <Share2 size={20}/> 
                    )}
                    {generatingImage ? 'Gerando Imagem...' : 'COMPARTILHAR IMAGEM'}
                </button>
            </div>
        </div>
    );
};
