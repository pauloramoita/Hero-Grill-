
import React, { useState, useEffect, useMemo } from 'react';
import { getAppData, saveOrder, getLastOrderForProduct, formatCurrency } from '../../services/storageService';
import { AppData, User } from '../../types';
import { AlertCircle, CheckCircle, Loader2, Save, ShoppingCart, Calendar } from 'lucide-react';

interface CadastroPedidoProps {
    user: User;
}

export const CadastroPedido: React.FC<CadastroPedidoProps> = ({ user }) => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [store, setStore] = useState('');
    const [type, setType] = useState('Variável');
    const [category, setCategory] = useState('');
    const [product, setProduct] = useState('');
    const [brand, setBrand] = useState('');
    const [supplier, setSupplier] = useState('');
    const [unitValue, setUnitValue] = useState<number>(0);
    const [unitMeasure, setUnitMeasure] = useState('');
    const [quantity, setQuantity] = useState<string>('');
    const [deliveryDate, setDeliveryDate] = useState(''); 

    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const d = await getAppData();
            setData(d);
            setLoadingData(false);
        };
        load();
    }, []);

    // Determine available stores based on user permissions
    const availableStores = useMemo(() => {
        if (user.isMaster) return data.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return data.stores.filter(s => user.permissions.stores.includes(s));
        }
        return data.stores;
    }, [data.stores, user]);

    // Auto-select if only one store available
    useEffect(() => {
        if (availableStores.length === 1) {
            setStore(availableStores[0]);
        }
    }, [availableStores]);

    useEffect(() => {
        const checkHistory = async () => {
            if (product) {
                const lastOrder = await getLastOrderForProduct(product);
                if (lastOrder) {
                    setBrand(lastOrder.brand);
                    if (!supplier) setSupplier(lastOrder.supplier);
                    setUnitMeasure(lastOrder.unitMeasure);
                    setUnitValue(lastOrder.unitValue);
                    if (lastOrder.category) setCategory(lastOrder.category);
                    if (lastOrder.type) setType(lastOrder.type);
                }
            }
        };
        checkHistory();
    }, [product]);

    const getQuantityFloat = () => {
        if (!quantity) return 0;
        const cleanValue = quantity.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanValue) || 0;
    };

    const calculateTotal = () => {
        const qty = getQuantityFloat();
        return formatCurrency(unitValue * qty);
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setUnitValue(floatValue);
        if (errors.unitValue) setErrors({ ...errors, unitValue: false });
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let rawValue = e.target.value.replace(/\D/g, '');
        if (!rawValue) { setQuantity(''); return; }
        const intValue = parseInt(rawValue, 10);
        const formatted = (intValue / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
        setQuantity(formatted);
        if (errors.quantity) setErrors({ ...errors, quantity: false });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        const qtyFloat = getQuantityFloat();

        const newErrors = {
            store: !store,
            category: !category,
            product: !product,
            // brand: !brand, // Marca agora é opcional
            // supplier: !supplier, // Fornecedor agora é opcional
            unitMeasure: !unitMeasure,
            unitValue: unitValue <= 0,
            quantity: qtyFloat <= 0,
            type: !type
        };

        setErrors(newErrors);

        if (Object.values(newErrors).some(Boolean)) {
            setSubmitError('Preencha os campos obrigatórios.');
            // Scroll to top to see error
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSaving(true);
        try {
            await saveOrder({
                id: '', 
                date, store, product, 
                brand: brand || '-', // Save generic dash if empty
                supplier: supplier || '-', // Save generic dash if empty
                unitValue, unitMeasure,
                quantity: qtyFloat, totalValue: unitValue * qtyFloat, 
                deliveryDate: deliveryDate || null,
                type,
                category
            });

            // Reset fields partially to allow quick entry
            setProduct('');
            // setBrand(''); // Keep brand? No, reset.
            // setSupplier(''); // Keep supplier? No, reset.
            // setUnitMeasure('');
            setUnitValue(0);
            setQuantity('');
            setErrors({});
            alert('Pedido registrado com sucesso!');
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('column') || msg.includes('schema cache') || msg.includes('violates')) {
                setSubmitError(`ERRO DE BANCO DE DADOS: Coluna não encontrada ou nula (${msg}).\nSOLUÇÃO: Vá ao menu "Backup", clique em "Ver SQL de Instalação" e execute o comando no Supabase para atualizar a tabela.`);
            } else {
                setSubmitError(msg);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loadingData) return <div className="text-center p-10"><Loader2 className="animate-spin mx-auto text-heroRed" size={32}/></div>;

    // Design System Classes
    const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1";
    const inputClass = (hasError: boolean, disabled: boolean = false) => 
        `w-full p-3 md:p-2.5 text-base md:text-sm rounded-lg outline-none transition-all duration-200 font-medium appearance-none
        ${disabled 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
            : hasError 
                ? 'bg-red-50 border border-red-300 text-red-900 focus:ring-2 focus:ring-red-200' 
                : 'bg-white border border-slate-300 text-slate-700 focus:border-heroRed focus:ring-2 focus:ring-heroRed/20 shadow-sm'
        }`;

    return (
        <div className="pb-32 md:pb-0"> {/* Padding bottom for mobile sticky footer */}
            <form onSubmit={handleSubmit} className="bg-white md:rounded-xl shadow-none md:shadow-card border-y md:border border-slate-200 max-w-5xl mx-auto animate-fadeIn overflow-hidden">
                
                {/* Header - Sticky on Mobile */}
                <div className="sticky top-16 z-20 md:static bg-slate-50/95 md:bg-slate-50 backdrop-blur-sm px-6 py-4 md:px-8 md:py-6 border-b border-slate-200 shadow-sm md:shadow-none flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase">
                            <ShoppingCart className="text-heroRed" size={24} />
                            Novo Pedido
                        </h2>
                        <p className="text-xs text-slate-500 font-medium hidden md:block">Preencha os dados da compra.</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-2 text-xs font-bold text-slate-600 shadow-sm">
                        <Calendar size={14} className="text-heroRed"/> {new Date().toLocaleDateString('pt-BR')}
                    </div>
                </div>
                
                <div className="p-6 md:p-8 space-y-6">
                    {/* Bloco 1: Contexto */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Data do Pedido</label>
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass(false)}/>
                            </div>

                            <div>
                                <label className={labelClass}>Loja {errors.store && <span className="text-red-500">*</span>}</label>
                                <select 
                                    value={store} 
                                    onChange={(e) => setStore(e.target.value)} 
                                    className={inputClass(errors.store, availableStores.length === 1)}
                                    disabled={availableStores.length === 1}
                                >
                                    <option value="">Selecione...</option>
                                    {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Vencimento (Opcional)</label>
                                <div className="flex gap-2">
                                    <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass(false)}/>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bloco 2: Produto */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <div className="md:col-span-1">
                            <label className={labelClass}>Categoria {errors.category && <span className="text-red-500">*</span>}</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass(errors.category)}>
                                <option value="">Selecione...</option>
                                {data.categories.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className={labelClass}>Produto {errors.product && <span className="text-red-500">*</span>}</label>
                            <select value={product} onChange={(e) => setProduct(e.target.value)} className={inputClass(errors.product)}>
                                <option value="">Selecione...</option>
                                {data.products.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Marca <span className="text-slate-400 font-normal text-[10px]">(Opcional)</span></label>
                            <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass(false)}>
                                <option value="">Selecione...</option>
                                {data.brands.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className={labelClass}>Fornecedor <span className="text-slate-400 font-normal text-[10px]">(Opcional)</span></label>
                            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputClass(false)}>
                                <option value="">Selecione...</option>
                                {data.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Bloco 3: Valores */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className={labelClass}>Medida {errors.unitMeasure && <span className="text-red-500">*</span>}</label>
                                <select value={unitMeasure} onChange={(e) => setUnitMeasure(e.target.value)} className={inputClass(errors.unitMeasure)}>
                                    <option value="">...</option>
                                    {data.units.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Qtd. {errors.quantity && <span className="text-red-500">*</span>}</label>
                                <input type="text" value={quantity} onChange={handleQuantityChange} className={`${inputClass(errors.quantity)} text-right font-bold`} placeholder="0,000" inputMode="decimal"/>
                            </div>

                            <div className="col-span-2 md:col-span-1">
                                <label className={labelClass}>Vl. Unitário {errors.unitValue && <span className="text-red-500">*</span>}</label>
                                <input type="text" value={formatCurrency(unitValue)} onChange={handleCurrencyChange} className={`${inputClass(errors.unitValue)} text-right font-bold`} inputMode="numeric"/>
                            </div>
                            
                            <div className="col-span-2 md:col-span-1">
                                <label className={labelClass}>Tipo (Contábil)</label>
                                <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass(errors.type)}>
                                     {data.types.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {submitError && (
                        <div className="text-red-600 text-sm font-medium flex items-start gap-2 bg-red-50 px-4 py-3 rounded-lg border border-red-100 animate-shake">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5"/> 
                            <span className="whitespace-pre-line">{submitError}</span>
                        </div>
                    )}

                    {/* Desktop Footer */}
                    <div className="hidden md:flex justify-end items-center gap-4 pt-6 border-t border-slate-100">
                        <div className="text-right mr-4">
                            <span className="block text-xs font-bold text-slate-400 uppercase">Total do Pedido</span>
                            <span className="text-3xl font-black text-slate-800">{calculateTotal()}</span>
                        </div>
                        <button 
                            disabled={saving} 
                            type="submit" 
                            className="bg-heroRed text-white font-bold py-3 px-10 rounded-lg shadow-md hover:bg-heroRedDark hover:shadow-lg transition-all flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="animate-spin" size={22}/> : <Save size={22}/>}
                            {saving ? 'Salvando...' : 'REGISTRAR PEDIDO'}
                        </button>
                    </div>
                </div>

                {/* Mobile Sticky Footer */}
                <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Estimado</span>
                        <span className="text-2xl font-black text-slate-800 leading-none">{calculateTotal()}</span>
                    </div>
                    <button 
                        disabled={saving} 
                        type="submit" 
                        className="flex-1 bg-heroRed text-white font-bold py-3 px-4 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                        SALVAR
                    </button>
                </div>
            </form>
        </div>
    );
};
