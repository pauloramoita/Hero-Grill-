
import React, { useState, useEffect } from 'react';
import { getAppData, saveOrder, getLastOrderForProduct, formatCurrency } from '../../services/storageService';
import { AppData } from '../../types';
import { Calendar, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

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
    const [deliveryDate, setDeliveryDate] = useState(''); // Agora representa "Data Vencimento"

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
                id: '', // DB Generates
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
            setDeliveryDate('');
            // Mantém Tipo e Categoria para agilizar
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
        `w-full p-3 border rounded outline-none transition-all ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:ring-2 focus:ring-heroRed'}`;

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 max-w-4xl mx-auto animate-fadeIn">
            <h2 className="text-2xl font-bold text-heroBlack mb-6 border-b-2 border-heroRed pb-2">Novo Cadastro</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Data</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded bg-gray-50"/>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Loja {errors.store && '*'}</label>
                    <select value={store} onChange={(e) => setStore(e.target.value)} className={getInputClass(errors.store)}>
                        <option value="">Selecione...</option>
                        {data.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo {errors.type && '*'}</label>
                    <select value={type} onChange={(e) => setType(e.target.value)} className={getInputClass(errors.type)}>
                         {data.types.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={getInputClass(false)}>
                        <option value="">Selecione...</option>
                         {data.categories.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Produto {errors.product && '*'}</label>
                    <select value={product} onChange={(e) => setProduct(e.target.value)} className={getInputClass(errors.product)}>
                        <option value="">Selecione...</option>
                        {data.products.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Marca {errors.brand && '*'}</label>
                    <select value={brand} onChange={(e) => setBrand(e.target.value)} className={getInputClass(errors.brand)}>
                        <option value="">Selecione...</option>
                        {data.brands.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Fornecedor {errors.supplier && '*'}</label>
                    <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={getInputClass(errors.supplier)}>
                        <option value="">Selecione...</option>
                        {data.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Unidade {errors.unitMeasure && '*'}</label>
                    <select value={unitMeasure} onChange={(e) => setUnitMeasure(e.target.value)} className={getInputClass(errors.unitMeasure)}>
                        <option value="">Selecione...</option>
                        {data.units.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Valor (R$) {errors.unitValue && '*'}</label>
                    <input type="text" value={formatCurrency(unitValue)} onChange={handleCurrencyChange} className={`${getInputClass(errors.unitValue)} text-right`}/>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Quantidade {errors.quantity && '*'}</label>
                    <input type="text" value={quantity} onChange={handleQuantityChange} className={`${getInputClass(errors.quantity)} text-right`} placeholder="0,000"/>
                </div>
                <div className="bg-gray-100 p-4 rounded border">
                    <label className="block text-sm font-bold text-gray-600">Total</label>
                    <div className="text-2xl font-black text-gray-800 text-right">{calculateTotal()}</div>
                </div>
                <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">Data Vencimento</label>
                     <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full p-3 border rounded"/>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t flex flex-col items-end gap-4">
                {submitError && <div className="text-red-600 bg-red-50 px-4 py-2 rounded font-bold flex gap-2"><AlertCircle size={16} /> {submitError}</div>}
                <button disabled={saving} type="submit" className="bg-heroRed text-white font-bold py-4 px-12 rounded shadow hover:bg-red-800 flex items-center gap-3 text-lg disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin"/> : <CheckCircle size={24} />} CADASTRAR
                </button>
            </div>
        </form>
    );
};