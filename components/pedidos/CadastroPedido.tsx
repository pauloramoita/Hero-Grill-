
import React, { useState, useEffect, useMemo } from 'react';
import { getAppData, saveOrder, getLastOrderForProduct, formatCurrency, getTodayLocalISO } from '../../services/storageService';
import { AppData, User } from '../../types';
import { AlertCircle, CheckCircle, Loader2, Save, ShoppingCart, Calendar, Box, Tag, Truck, DollarSign, Hash, Ruler } from 'lucide-react';

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

    // UI Components - Nova Linguagem de Design
    const InputField = ({ label, icon: Icon, error, ...props }: any) => (
        <div className="relative group">
            <div className="flex items-center gap-2 mb-1.5">
                {Icon && <Icon size={14} className={`transition-colors ${error ? 'text-red-500' : 'text-slate-400 group-focus-within:text-heroRed'}`} />}
                <label className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${error ? 'text-red-500' : 'text-slate-500 group-focus-within:text-heroRed'}`}>
                    {label}
                </label>
            </div>
            <input 
                className={`w-full px-4 py-3.5 rounded-xl bg-slate-50 border-2 transition-all duration-300 font-bold text-slate-700 outline-none
                ${error 
                    ? 'border-red-100 bg-red-50 text-red-900 focus:border-red-300 focus:ring-4 focus:ring-red-100' 
                    : 'border-transparent hover:border-slate-200 focus:border-heroRed focus:bg-white focus:shadow-input-focus'
                }`}
                {...props} 
            />
        </div>
    );

    const SelectField = ({ label, icon: Icon, error, children, ...props }: any) => (
        <div className="relative group">
            <div className="flex items-center gap-2 mb-1.5">
                {Icon && <Icon size={14} className={`transition-colors ${error ? 'text-red-500' : 'text-slate-400 group-focus-within:text-heroRed'}`} />}
                <label className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${error ? 'text-red-500' : 'text-slate-500 group-focus-within:text-heroRed'}`}>
                    {label}
                </label>
            </div>
            <div className="relative">
                <select 
                    className={`w-full px-4 py-3.5 rounded-xl bg-slate-50 border-2 transition-all duration-300 font-bold text-slate-700 outline-none appearance-none cursor-pointer
                    ${error 
                        ? 'border-red-100 bg-red-50 text-red-900 focus:border-red-300 focus:ring-4 focus:ring-red-100' 
                        : 'border-transparent hover:border-slate-200 focus:border-heroRed focus:bg-white focus:shadow-input-focus'
                    } ${props.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    {...props}
                >
                    {children}
                </select>
                {/* Custom Arrow */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-heroRed transition-colors">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
    );

    const CardSection = ({ title, icon: Icon, children, accentColor = "heroRed" }: any) => (
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 relative overflow-hidden group hover:shadow-card-hover transition-all duration-500">
            <div className={`absolute top-0 left-0 w-1 h-full bg-${accentColor} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                <div className={`p-2.5 rounded-xl bg-${accentColor === 'heroRed' ? 'red-50' : 'slate-50'} text-${accentColor === 'heroRed' ? 'heroRed' : 'slate-500'}`}>
                    {Icon && <Icon size={20} />}
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">{title}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                {children}
            </div>
        </div>
    );

    return (
        <div className="pb-32 md:pb-10 animate-fadeIn max-w-5xl mx-auto space-y-6">
            
            {/* Header Floating Card */}
            <div className="bg-heroBlack text-white rounded-3xl p-8 shadow-floating relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShoppingCart size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">NOVO PEDIDO</h1>
                        <p className="text-slate-400 font-medium text-sm">Preencha os dados para registrar a compra.</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                        <Calendar size={18} className="text-heroRed" />
                        <span className="font-bold text-sm tracking-wide">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Bloco 1: Contexto */}
                <CardSection title="Informações Gerais" icon={Box}>
                    <div className="md:col-span-2">
                        <InputField 
                            label="Data do Pedido" 
                            type="date" 
                            value={date} 
                            onChange={(e: any) => setDate(e.target.value)} 
                        />
                    </div>
                    <div className="md:col-span-2">
                        <SelectField 
                            label="Loja" 
                            value={store} 
                            onChange={(e: any) => setStore(e.target.value)} 
                            error={errors.store}
                            disabled={availableStores.length === 1}
                        >
                            <option value="">Selecione...</option>
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </SelectField>
                    </div>
                    <div className="md:col-span-2">
                        <InputField 
                            label="Vencimento (Opcional)" 
                            type="date" 
                            value={deliveryDate} 
                            onChange={(e: any) => setDeliveryDate(e.target.value)} 
                        />
                    </div>
                </CardSection>

                {/* Bloco 2: Produto */}
                <CardSection title="Detalhes do Produto" icon={Tag}>
                    <div className="md:col-span-2">
                        <SelectField 
                            label="Categoria" 
                            value={category} 
                            onChange={(e: any) => setCategory(e.target.value)} 
                            error={errors.category}
                        >
                            <option value="">Selecione...</option>
                            {data.categories.map(s => <option key={s} value={s}>{s}</option>)}
                        </SelectField>
                    </div>
                    <div className="md:col-span-4">
                        <SelectField 
                            label="Produto" 
                            value={product} 
                            onChange={(e: any) => setProduct(e.target.value)} 
                            error={errors.product}
                        >
                            <option value="">Selecione...</option>
                            {data.products.map(s => <option key={s} value={s}>{s}</option>)}
                        </SelectField>
                    </div>
                    <div className="md:col-span-3">
                        <SelectField 
                            label="Marca" 
                            value={brand} 
                            onChange={(e: any) => setBrand(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {data.brands.map(s => <option key={s} value={s}>{s}</option>)}
                        </SelectField>
                    </div>
                    <div className="md:col-span-3">
                        <SelectField 
                            label="Fornecedor" 
                            icon={Truck}
                            value={supplier} 
                            onChange={(e: any) => setSupplier(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {data.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </SelectField>
                    </div>
                </CardSection>

                {/* Bloco 3: Valores */}
                <CardSection title="Valores e Quantidades" icon={DollarSign} accentColor="emerald-500">
                    <div className="md:col-span-2">
                        <SelectField 
                            label="Unidade" 
                            icon={Ruler}
                            value={unitMeasure} 
                            onChange={(e: any) => setUnitMeasure(e.target.value)} 
                            error={errors.unitMeasure}
                        >
                            <option value="">...</option>
                            {data.units.map(s => <option key={s} value={s}>{s}</option>)}
                        </SelectField>
                    </div>
                    <div className="md:col-span-2">
                        <InputField 
                            label="Quantidade" 
                            icon={Hash}
                            type="text" 
                            value={quantity} 
                            onChange={handleQuantityChange} 
                            error={errors.quantity}
                            placeholder="0,000" 
                            inputMode="decimal"
                            style={{ textAlign: 'right' }}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <InputField 
                            label="Valor Unitário" 
                            icon={DollarSign}
                            type="text" 
                            value={formatCurrency(unitValue)} 
                            onChange={handleCurrencyChange} 
                            error={errors.unitValue}
                            inputMode="numeric"
                            style={{ textAlign: 'right', color: '#059669' }} // Emerald-600
                        />
                    </div>
                    <div className="md:col-span-6">
                        <SelectField 
                            label="Classificação Contábil" 
                            value={type} 
                            onChange={(e: any) => setType(e.target.value)} 
                            error={errors.type}
                        >
                             {data.types.map(s => <option key={s} value={s}>{s}</option>)}
                        </SelectField>
                    </div>
                </CardSection>

                {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-fadeIn">
                        <div className="bg-red-100 p-2 rounded-full text-red-600">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-red-800 text-sm uppercase">Atenção</h4>
                            <p className="text-red-600 text-sm mt-1 leading-relaxed">{submitError}</p>
                        </div>
                    </div>
                )}

                {/* Footer Action */}
                <div className="hidden md:flex justify-end items-center gap-8 pt-6 border-t border-slate-200">
                    <div className="text-right">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Estimado</span>
                        <span className="text-4xl font-black text-slate-800 tracking-tight">{calculateTotal()}</span>
                    </div>
                    <button 
                        disabled={saving} 
                        type="submit" 
                        className="group relative bg-heroBlack hover:bg-slate-800 text-white font-bold py-5 px-12 rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center gap-4 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                    >
                        {saving ? <Loader2 className="animate-spin" size={24}/> : <Save size={24} className="group-hover:scale-110 transition-transform"/>}
                        <span className="text-lg tracking-wide">FINALIZAR PEDIDO</span>
                    </button>
                </div>

                {/* Mobile Sticky Footer */}
                <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40 flex justify-between items-center gap-4 safe-area-pb">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TOTAL</span>
                        <span className="text-2xl font-black text-slate-800 leading-none">{calculateTotal()}</span>
                    </div>
                    <button 
                        disabled={saving} 
                        type="submit" 
                        className="flex-1 bg-heroRed text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-heroRed/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                        SALVAR
                    </button>
                </div>
            </form>
        </div>
    );
};
