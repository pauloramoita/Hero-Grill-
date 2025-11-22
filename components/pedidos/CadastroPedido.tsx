import React, { useState, useEffect, useMemo } from 'react';
import { getAppData, saveOrder, getLastOrderForProduct, formatCurrency, getTodayLocalISO } from '../../services/storageService';
import { AppData, User } from '../../types';
import { AlertCircle, CheckCircle, Loader2, Save, ShoppingCart, Calendar, Box, Info, DollarSign } from 'lucide-react';

interface CadastroPedidoProps {
    user: User;
}

// Hook para persistência de estado
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

export const CadastroPedido: React.FC<CadastroPedidoProps> = ({ user }) => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [date, setDate] = usePersistedState('hero_state_cad_ped_date', getTodayLocalISO());
    const [store, setStore] = usePersistedState('hero_state_cad_ped_store', '');
    const [type, setType] = usePersistedState('hero_state_cad_ped_type', 'Variável');
    const [category, setCategory] = usePersistedState('hero_state_cad_ped_category', '');
    const [product, setProduct] = usePersistedState('hero_state_cad_ped_product', '');
    const [brand, setBrand] = usePersistedState('hero_state_cad_ped_brand', '');
    const [supplier, setSupplier] = usePersistedState('hero_state_cad_ped_supplier', '');
    const [unitValue, setUnitValue] = usePersistedState<number>('hero_state_cad_ped_unitvalue', 0);
    const [unitMeasure, setUnitMeasure] = usePersistedState('hero_state_cad_ped_unitmeasure', '');
    const [quantity, setQuantity] = usePersistedState<string>('hero_state_cad_ped_quantity', '');
    const [deliveryDate, setDeliveryDate] = usePersistedState('hero_state_cad_ped_deliverydate', ''); 

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

    const availableStores = useMemo(() => {
        if (user.isMaster) return data.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return data.stores.filter(s => user.permissions.stores.includes(s));
        }
        return data.stores;
    }, [data.stores, user]);

    useEffect(() => {
        if (availableStores.length === 1 && !store) {
            setStore(availableStores[0]);
        }
    }, [availableStores, store]);

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
            unitMeasure: !unitMeasure,
            unitValue: unitValue <= 0,
            quantity: qtyFloat <= 0,
            type: !type
        };

        setErrors(newErrors);

        if (Object.values(newErrors).some(Boolean)) {
            setSubmitError('Preencha os campos obrigatórios.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSaving(true);
        try {
            await saveOrder({
                id: '', 
                date, store, product, 
                brand: brand || '-', 
                supplier: supplier || '-', 
                unitValue, unitMeasure,
                quantity: qtyFloat, totalValue: unitValue * qtyFloat, 
                deliveryDate: deliveryDate || null,
                type,
                category
            });

            setProduct('');
            setUnitValue(0);
            setQuantity('');
            setErrors({});
            alert('Pedido registrado com sucesso!');
        } catch (err: any) {
            const msg = err.message || '';
            setSubmitError(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loadingData) return <div className="text-center p-10"><Loader2 className="animate-spin mx-auto text-heroRed" size={32}/></div>;

    const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1";
    const inputClass = (hasError: boolean, disabled: boolean = false) => 
        `w-full px-4 py-3.5 rounded-xl outline-none transition-all duration-200 font-bold text-sm border-2
        ${disabled 
            ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100' 
            : hasError 
                ? 'bg-red-50 border-red-200 text-red-900 focus:ring-4 focus:ring-red-50 placeholder:text-red-300' 
                : 'bg-white border-slate-100 text-slate-700 focus:border-heroRed focus:ring-4 focus:ring-red-50 shadow-sm'
        }`;

    return (
        <div className="pb-32 md:pb-0 animate-fadeIn max-w-5xl mx-auto">
            <form onSubmit={handleSubmit} className="bg-white md:rounded-3xl shadow-card border-y md:border border-slate-200 overflow-hidden">
                
                <div className="sticky top-20 z-20 md:static bg-white border-b border-slate-100 px-6 py-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                            <div className="bg-heroBlack p-2 rounded-lg text-white">
                                <ShoppingCart size={20} />
                            </div>
                            Novo Pedido
                        </h2>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Calendar size={14} className="text-heroRed"/> 
                        {new Date().toLocaleDateString('pt-BR')}
                    </div>
                </div>
                
                <div className="p-6 md:p-8 space-y-8">
                    {/* Bloco 1: Contexto */}
                    <section>
                        <div className="flex items-center gap-2 mb-5 pb-2 border-b border-slate-50">
                            <Info size={18} className="text-slate-300"/>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informações Gerais</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className={labelClass}>Data do Pedido</label>
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass(false)}/>
                            </div>

                            <div>
                                <label className={labelClass}>Loja {errors.store && <span className="text-heroRed">*</span>}</label>
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
                                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass(false)}/>
                            </div>
                        </div>
                    </section>

                    {/* Bloco 2: Produto */}
                    <section>
                        <div className="flex items-center gap-2 mb-5 pb-2 border-b border-slate-50">
                            <Box size={18} className="text-slate-300"/>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalhes do Produto</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                                <label className={labelClass}>Categoria {errors.category && <span className="text-heroRed">*</span>}</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass(errors.category)}>
                                    <option value="">Selecione...</option>
                                    {data.categories.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>Produto {errors.product && <span className="text-heroRed">*</span>}</label>
                                <select value={product} onChange={(e) => setProduct(e.target.value)} className={inputClass(errors.product)}>
                                    <option value="">Selecione...</option>
                                    {data.products.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Marca</label>
                                <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass(false)}>
                                    <option value="">Selecione...</option>
                                    {data.brands.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>Fornecedor</label>
                                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputClass(false)}>
                                    <option value="">Selecione...</option>
                                    {data.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Bloco 3: Valores */}
                    <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-5">
                            <DollarSign size={18} className="text-slate-300"/>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valores e Quantidades</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <label className={labelClass}>Medida {errors.unitMeasure && <span className="text-heroRed">*</span>}</label>
                                <select value={unitMeasure} onChange={(e) => setUnitMeasure(e.target.value)} className={inputClass(errors.unitMeasure)}>
                                    <option value="">...</option>
                                    {data.units.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Qtd. {errors.quantity && <span className="text-heroRed">*</span>}</label>
                                <input type="text" value={quantity} onChange={handleQuantityChange} className={`${inputClass(errors.quantity)} text-right font-black`} placeholder="0,000" inputMode="decimal"/>
                            </div>

                            <div className="col-span-2 md:col-span-1">
                                <label className={labelClass}>Vl. Unitário {errors.unitValue && <span className="text-heroRed">*</span>}</label>
                                <input type="text" value={formatCurrency(unitValue)} onChange={handleCurrencyChange} className={`${inputClass(errors.unitValue)} text-right font-black text-slate-800`} inputMode="numeric"/>
                            </div>
                            
                            <div className="col-span-2 md:col-span-1">
                                <label className={labelClass}>Tipo (Contábil)</label>
                                <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass(errors.type)}>
                                     {data.types.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>

                    {submitError && (
                        <div className="text-heroRed text-sm font-medium flex items-start gap-3 bg-red-50 px-4 py-4 rounded-xl border border-red-100 animate-fadeIn">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5"/> 
                            <span className="whitespace-pre-line leading-relaxed">{submitError}</span>
                        </div>
                    )}

                    {/* Desktop Footer */}
                    <div className="hidden md:flex justify-end items-center gap-6 pt-4 border-t border-slate-100">
                        <div className="text-right">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total do Pedido</span>
                            <span className="text-3xl font-black text-slate-800">{calculateTotal()}</span>
                        </div>
                        <button 
                            disabled={saving} 
                            type="submit" 
                            className="bg-heroRed hover:bg-red-700 text-white font-bold py-4 px-12 rounded-xl shadow-lg hover:shadow-red-200 transition-all flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                        >
                            {saving ? <Loader2 className="animate-spin" size={22}/> : <Save size={22}/>}
                            {saving ? 'Salvando...' : 'REGISTRAR PEDIDO'}
                        </button>
                    </div>
                </div>

                {/* Mobile Sticky Footer */}
                <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center gap-4 safe-area-pb">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Estimado</span>
                        <span className="text-2xl font-black text-slate-800 leading-none">{calculateTotal()}</span>
                    </div>
                    <button 
                        disabled={saving} 
                        type="submit" 
                        className="flex-1 bg-heroRed text-white font-bold py-3.5 px-4 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                        SALVAR
                    </button>
                </div>
            </form>
        </div>
    );
};