
import React, { useState, useEffect, useMemo } from 'react';
import { getAppData, saveOrder, getLastOrderForProduct, formatCurrency } from '../../services/storageService';
import { AppData, User } from '../../types';
import { AlertCircle, CheckCircle, Loader2, Save } from 'lucide-react';

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
            brand: !brand,
            supplier: !supplier,
            unitMeasure: !unitMeasure,
            unitValue: unitValue <= 0,
            quantity: qtyFloat <= 0,
            type: !type
        };

        setErrors(newErrors);

        if (Object.values(newErrors).some(Boolean)) {
            setSubmitError('Preencha os campos obrigatórios.');
            return;
        }

        setSaving(true);
        try {
            await saveOrder({
                id: '', 
                date, store, product, brand, supplier, unitValue, unitMeasure,
                quantity: qtyFloat, totalValue: unitValue * qtyFloat, 
                deliveryDate: deliveryDate || null,
                type,
                category
            });

            setProduct('');
            setBrand('');
            setUnitMeasure('');
            setUnitValue(0);
            setQuantity('');
            setErrors({});
            alert('Cadastro realizado!');
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loadingData) return <div className="text-center p-10"><Loader2 className="animate-spin mx-auto text-heroRed" size={32}/></div>;

    // Design System Classes
    const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";
    const inputClass = (hasError: boolean, disabled: boolean = false) => 
        `w-full p-2.5 text-sm rounded-lg outline-none transition-all duration-200 
        ${disabled 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
            : hasError 
                ? 'bg-red-50 border border-red-300 text-red-900 focus:ring-2 focus:ring-red-200' 
                : 'bg-slate-50 border border-slate-300 text-slate-700 focus:bg-white focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed hover:border-slate-400'
        }`;

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card border border-slate-200 max-w-5xl mx-auto animate-fadeIn overflow-hidden">
            
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-heroRed rounded-full inline-block"></span>
                    Novo Pedido
                </h2>
                <p className="text-sm text-slate-500 mt-1 ml-3.5">Preencha os dados abaixo para registrar uma nova compra.</p>
            </div>
            
            <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Linha 1 */}
                    <div>
                        <label className={labelClass}>Data do Pedido</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass(false)}/>
                    </div>

                    <div>
                        <label className={labelClass}>Data de Vencimento</label>
                        <div className="flex gap-2">
                            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass(false)}/>
                            <button type="button" onClick={() => setDeliveryDate(new Date().toISOString().split('T')[0])} className="bg-slate-200 text-slate-700 px-3 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors">Hoje</button>
                        </div>
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

                    {/* Linha 2 */}
                    <div>
                        <label className={labelClass}>Categoria {errors.category && <span className="text-red-500">*</span>}</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass(errors.category)}>
                            <option value="">Selecione...</option>
                            {data.categories.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Produto {errors.product && <span className="text-red-500">*</span>}</label>
                        <select value={product} onChange={(e) => setProduct(e.target.value)} className={inputClass(errors.product)}>
                            <option value="">Selecione...</option>
                            {data.products.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Marca {errors.brand && <span className="text-red-500">*</span>}</label>
                        <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass(errors.brand)}>
                            <option value="">Selecione...</option>
                            {data.brands.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Linha 3 */}
                    <div>
                        <label className={labelClass}>Fornecedor {errors.supplier && <span className="text-red-500">*</span>}</label>
                        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputClass(errors.supplier)}>
                            <option value="">Selecione...</option>
                            {data.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Medida {errors.unitMeasure && <span className="text-red-500">*</span>}</label>
                        <select value={unitMeasure} onChange={(e) => setUnitMeasure(e.target.value)} className={inputClass(errors.unitMeasure)}>
                            <option value="">Selecione...</option>
                            {data.units.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Quantidade {errors.quantity && <span className="text-red-500">*</span>}</label>
                        <input type="text" value={quantity} onChange={handleQuantityChange} className={`${inputClass(errors.quantity)} text-right font-medium`} placeholder="0,000"/>
                    </div>

                    {/* Linha 4 */}
                    <div>
                        <label className={labelClass}>Valor Unitário (R$) {errors.unitValue && <span className="text-red-500">*</span>}</label>
                        <input type="text" value={formatCurrency(unitValue)} onChange={handleCurrencyChange} className={`${inputClass(errors.unitValue)} text-right font-medium`}/>
                    </div>
                    
                    <div className="relative">
                        <label className={labelClass}>Valor Total</label>
                        <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-right font-bold text-slate-800">{calculateTotal()}</div>
                    </div>

                    <div>
                        <label className={labelClass}>Tipo (Opcional)</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass(errors.type)}>
                             {data.types.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 border-t border-slate-100">
                    {submitError && (
                        <span className="text-red-600 text-sm font-medium flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                            <AlertCircle size={16}/> {submitError}
                        </span>
                    )}
                    <button 
                        disabled={saving} 
                        type="submit" 
                        className="w-full sm:w-auto bg-heroRed text-white font-semibold py-2.5 px-8 rounded-lg shadow-sm hover:bg-heroRedDark hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                        {saving ? 'Salvando...' : 'Registrar Pedido'}
                    </button>
                </div>
            </div>
        </form>
    );
};