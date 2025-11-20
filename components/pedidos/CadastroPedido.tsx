
import React, { useState, useEffect } from 'react';
import { getAppData, saveOrder, getLastOrderForProduct, formatCurrency } from '../../services/storageService';
import { AppData } from '../../types';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export const CadastroPedido: React.FC = () => {
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
            // setDeliveryDate(''); // Mantendo a data de vencimento preenchida conforme solicitado
            setErrors({});
            alert('Cadastro realizado!');
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loadingData) return <div className="text-center p-10"><Loader2 className="animate-spin mx-auto" size={40}/></div>;

    const getInputClass = (hasError: boolean) => 
        `w-full p-2.5 border rounded text-sm outline-none transition-all ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-heroRed focus:ring-1 focus:ring-heroRed'}`;

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-5xl mx-auto animate-fadeIn">
            {/* Form Header Styled as requested */}
            <div className="px-8 py-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-heroRed uppercase tracking-wide">Novo Pedido</h2>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Linha 1: Datas e Loja */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Data do Pedido</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded text-sm"/>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Data do Vencimento</label>
                    <div className="flex gap-2">
                        <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded text-sm"/>
                        <button type="button" onClick={() => setDeliveryDate(new Date().toISOString().split('T')[0])} className="bg-heroBlack text-white px-3 rounded text-xs font-bold uppercase hover:bg-gray-800">Hoje</button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Loja {errors.store && '*'}</label>
                    <select value={store} onChange={(e) => setStore(e.target.value)} className={getInputClass(errors.store)}>
                        <option value="">Selecione...</option>
                        {data.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Linha 2: Categoria e Produto */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Categoria {errors.category && '*'}</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={getInputClass(errors.category)}>
                        <option value="">Selecione...</option>
                        {data.categories.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Produto {errors.product && '*'}</label>
                    <select value={product} onChange={(e) => setProduct(e.target.value)} className={getInputClass(errors.product)}>
                        <option value="">Selecione...</option>
                        {data.products.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Marca {errors.brand && '*'}</label>
                    <select value={brand} onChange={(e) => setBrand(e.target.value)} className={getInputClass(errors.brand)}>
                        <option value="">Selecione...</option>
                        {data.brands.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Linha 3: Detalhes do Item */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Fornecedor {errors.supplier && '*'}</label>
                    <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={getInputClass(errors.supplier)}>
                        <option value="">Selecione...</option>
                        {data.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Medida {errors.unitMeasure && '*'}</label>
                    <select value={unitMeasure} onChange={(e) => setUnitMeasure(e.target.value)} className={getInputClass(errors.unitMeasure)}>
                        <option value="">Selecione...</option>
                        {data.units.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Quantidade {errors.quantity && '*'}</label>
                    <input type="text" value={quantity} onChange={handleQuantityChange} className={`${getInputClass(errors.quantity)} text-right`} placeholder="0,000"/>
                </div>

                {/* Linha 4: Valores e Tipo */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor Unitário (R$) {errors.unitValue && '*'}</label>
                    <input type="text" value={formatCurrency(unitValue)} onChange={handleCurrencyChange} className={`${getInputClass(errors.unitValue)} text-right`}/>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor Total</label>
                    <div className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-right font-black text-gray-800">{calculateTotal()}</div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tipo (Opcional)</label>
                    <select value={type} onChange={(e) => setType(e.target.value)} className={getInputClass(errors.type)}>
                         {data.types.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-end items-center gap-4 rounded-b-lg">
                {submitError && <span className="text-red-600 text-sm font-bold flex items-center gap-1"><AlertCircle size={14}/> {submitError}</span>}
                <button disabled={saving} type="submit" className="bg-heroRed text-white font-bold py-3 px-8 rounded shadow hover:bg-red-700 flex items-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 className="animate-spin" size={18}/> : null} CADASTRAR PEDIDO
                </button>
            </div>
        </form>
    );
};
