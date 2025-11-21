
import React, { useState, useEffect, useRef } from 'react';
import { getOrders, getMeatConsumptionLogs, getMeatAdjustments, getAppData } from '../../services/storageService';
import { AppData } from '../../types';
import { Printer, Loader2, Share2, Eye, EyeOff, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';

export const GerarPedidoCarnes: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [selectedStore, setSelectedStore] = useState('');
    const [showStock, setShowStock] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);

    const [orderData, setOrderData] = useState<{
        name: string;
        currentStock: number;
        orderQtyStr: string;
        orderQtyNum: number;
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
            // Delay para garantir renderização
            await new Promise(resolve => setTimeout(resolve, 200));

            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                windowWidth: printRef.current.scrollWidth,
                windowHeight: printRef.current.scrollHeight
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert('Erro ao gerar imagem.');
                    setGeneratingImage(false);
                    return;
                }

                const fileName = `PEDIDO_${selectedStore.replace(/\s/g, '_').toUpperCase()}_${new Date().toISOString().split('T')[0]}.png`;
                const file = new File([blob], fileName, { type: "image/png" });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Pedido Hero Grill',
                            text: `Pedido de Compra - ${selectedStore}`
                        });
                    } catch (shareError) {
                        // Usuário cancelou ou erro no share, fallback para download
                        console.log('Share cancelado, tentando download...');
                        downloadImage(canvas, fileName);
                    }
                } else {
                    downloadImage(canvas, fileName);
                }
                setGeneratingImage(false);
            }, 'image/png');

        } catch (err) {
            console.error(err);
            alert('Erro inesperado ao criar imagem.');
            setGeneratingImage(false);
        }
    };

    const downloadImage = (canvas: HTMLCanvasElement, fileName: string) => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/png");
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalItems = orderData.reduce((acc, item) => acc + (item.orderQtyNum > 0 ? 1 : 0), 0);
    const totalWeight = orderData.filter(i => i.unit === 'KG').reduce((acc, item) => acc + item.orderQtyNum, 0);
    const totalPieces = orderData.filter(i => i.unit === 'PÇ').reduce((acc, item) => acc + item.orderQtyNum, 0);

    if (loading && appData.stores.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={40}/></div>;

    return (
        <div className="w-full max-w-md mx-auto animate-fadeIn pb-32 px-2 sm:px-0">
            
            {/* Controls Header (No Print) */}
            <div className="mb-4 no-print bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
                 <div className="flex flex-col gap-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Loja Solicitante</label>
                    <select 
                        value={selectedStore} 
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed outline-none"
                    >
                        {appData.stores.length === 0 && <option value="">Sem lojas</option>}
                        {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 
                 <button 
                    onClick={() => setShowStock(!showStock)}
                    className={`w-full py-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${showStock ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                >
                    {showStock ? <Eye size={16}/> : <EyeOff size={16}/>}
                    {showStock ? 'Ocultar Coluna Estoque' : 'Mostrar Coluna Estoque'}
                </button>
            </div>

            {/* PRINT AREA - VISIBLE BUT STYLED FOR CAPTURE */}
            <div className="flex justify-center w-full shadow-2xl rounded-sm overflow-hidden">
                <div 
                    id="print-area" 
                    ref={printRef}
                    className="bg-white w-full relative"
                    style={{ fontFamily: "'Courier New', Courier, monospace" }}
                >
                    {/* HEAD */}
                    <div className="p-4 pb-2 text-center bg-white border-b-2 border-black">
                        <div className="flex justify-center items-baseline gap-1 mb-2">
                            <span className="font-black text-3xl italic tracking-tighter text-black" style={{ fontFamily: 'Arial Black, sans-serif' }}>HERO</span>
                            <span className="font-black text-3xl italic tracking-tighter text-heroRed" style={{ fontFamily: 'Arial Black, sans-serif' }}>GRILL</span>
                        </div>
                        
                        <h2 className="text-lg font-black uppercase tracking-[0.2em] border-y-2 border-black py-1 mb-4">PEDIDO DE COMPRA</h2>
                        
                        {/* DESTAQUE UNIDADE - CAIXA PRETA */}
                        <div className="bg-black text-white p-3 mb-4 mx-auto w-full">
                            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-1">UNIDADE SOLICITANTE</span>
                            <span className="block text-2xl font-black uppercase leading-none break-words">{selectedStore}</span>
                        </div>

                        <div className="flex justify-between items-end px-1 border-b border-dashed border-gray-400 pb-2">
                            <span className="text-[10px] font-bold uppercase text-gray-500">DATA DO PEDIDO:</span>
                            <span className="text-base font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>

                    {/* BODY */}
                    <div className="bg-white">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-black bg-gray-100">
                                    <th className="py-2 pl-2 text-left font-black uppercase text-xs">PRODUTO</th>
                                    {showStock && <th className="py-2 text-center font-bold uppercase text-[9px] text-gray-500">Estoque</th>}
                                    <th className="py-2 text-center font-black uppercase text-xs bg-gray-200">PEDIDO</th>
                                    <th className="py-2 pr-2 text-right font-bold uppercase text-[9px]">UN.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dashed divide-gray-300">
                                {orderData.map((item, idx) => {
                                    const hasOrder = item.orderQtyNum > 0;
                                    return (
                                        <tr key={item.name} className={hasOrder ? 'bg-yellow-50' : ''}>
                                            <td className="py-3 pl-2 text-xs font-bold uppercase align-middle">
                                                {item.name}
                                            </td>
                                            {showStock && (
                                                <td className="py-3 text-center font-mono text-[10px] text-gray-400 align-middle">
                                                    {formatWeight(item.currentStock)}
                                                </td>
                                            )}
                                            <td className="py-1 text-center border-x border-gray-200 align-middle bg-white/50 relative">
                                                <input 
                                                    type="text" 
                                                    value={item.orderQtyStr}
                                                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                    className={`w-full text-center bg-transparent font-black text-lg outline-none p-0 m-0 ${hasOrder ? 'text-black' : 'text-gray-300'}`}
                                                    inputMode="numeric"
                                                />
                                            </td>
                                            <td className="py-3 pr-2 text-right align-middle">
                                                <select 
                                                    value={item.unit}
                                                    onChange={(e) => handleUnitChange(idx, e.target.value)}
                                                    className="bg-transparent font-bold outline-none text-right w-full text-[10px] uppercase p-0 m-0 border-none appearance-none"
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

                    {/* FOOTER */}
                    <div className="bg-black text-white p-4">
                        <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                            <span className="text-[10px] font-bold uppercase opacity-70">Total de Itens:</span>
                            <span className="font-mono font-bold text-lg">{totalItems}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-xs font-black uppercase tracking-wider">TOTAL ESPERADO:</span>
                            <div className="text-right leading-tight">
                                <span className="text-2xl font-black block">{formatWeight(totalWeight)} <span className="text-base font-normal">Kg</span></span>
                                {totalPieces > 0 && (
                                    <span className="text-xs font-bold text-gray-400 block">+ {formatWeight(totalPieces)} Pçs</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SIGNATURE */}
                    <div className="p-6 bg-white border-t border-gray-200 text-center mt-1">
                        <div className="h-10 border-b-2 border-black w-3/4 mx-auto mb-2"></div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">ASSINATURA DO RESPONSÁVEL</p>
                        <p className="text-[7px] text-gray-300 mt-2 uppercase">Sistema Hero Grill Self-service</p>
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-6 left-0 w-full px-4 flex justify-center z-50 no-print">
                <button 
                    onClick={handleShareImage}
                    disabled={generatingImage}
                    className="bg-heroBlack text-white w-full max-w-sm py-4 rounded-full font-bold shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all border-2 border-white/20 hover:bg-gray-900"
                >
                    {generatingImage ? (
                        <Loader2 size={24} className="animate-spin"/> 
                    ) : (
                        <Camera size={24}/> 
                    )}
                    {generatingImage ? 'GERANDO IMAGEM...' : 'COMPARTILHAR PEDIDO'}
                </button>
            </div>
        </div>
    );
};
