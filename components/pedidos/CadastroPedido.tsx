import React, { useState, useEffect } from 'react';
import { getAppData, saveOrder, getLastOrderForProduct, formatCurrency } from '../../services/storageService';
import { AppData } from '../../types';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';

export const CadastroPedido: React.FC = () => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    
    // Form States
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [store, setStore] = useState('');
    const [product, setProduct] = useState('');
    const [brand, setBrand] = useState('');
    const [supplier, setSupplier] = useState('');
    
    // unitValue is stored as a float but displayed formatted
    const [unitValue, setUnitValue] = useState<number>(0);
    
    const [unitMeasure, setUnitMeasure] = useState('');
    const [quantity, setQuantity] = useState<string>(''); // String for masking
    const [deliveryDate, setDeliveryDate] = useState('');

    // Validation State
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        setData(getAppData());
    }, []);

    // Auto-fill logic: When Product changes, fetch last order details
    useEffect(() => {
        if (product) {
            const lastOrder = getLastOrderForProduct(product);
            if (lastOrder) {
                setBrand(lastOrder.brand);
                // If user hasn't selected a supplier yet, use the one from history. 
                // If they have, we might want to keep their selection or overwrite. 
                // Logic here: if supplier is empty, fill it. If strict history needed, overwrite.
                // Given the requirement to "keep supplier" from previous manual entry, 
                // we only overwrite if the current supplier field is empty.
                if (!supplier) {
                    setSupplier(lastOrder.supplier);
                }
                setUnitMeasure(lastOrder.unitMeasure);
                setUnitValue(lastOrder.unitValue);
                setErrors(prev => ({
                    ...prev,
                    brand: false,
                    unitMeasure: false,
                    unitValue: false
                }));
            }
        }
    }, [product]);

    // Helper to parse the masked quantity string back to float
    const getQuantityFloat = (): number => {
        if (!quantity) return 0;
        // Remove thousands separator (.) and replace decimal separator (,) with dot (.)
        const cleanValue = quantity.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanValue) || 0;
    };

    const calculateTotal = () => {
        const qty = getQuantityFloat();
        return formatCurrency(unitValue * qty);
    };

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    // Handle Currency Input
    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setUnitValue(floatValue);
        if (errors.unitValue) setErrors({ ...errors, unitValue: false });
    };

    // Handle Quantity Input (Right to Left with 3 decimals)
    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 1. Get only numbers
        let rawValue = e.target.value.replace(/\D/g, '');
        
        if (!rawValue) {
            setQuantity('');
            return;
        }

        // 2. Convert to integer to handle leading zeros naturally
        const intValue = parseInt(rawValue, 10);

        // 3. Divide by 1000 to simulate 3 decimal places
        const formatted = (intValue / 1000).toLocaleString('pt-BR', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        });

        setQuantity(formatted);
        if (errors.quantity) setErrors({ ...errors, quantity: false });
    };

    const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<string>>, field: string, value: string) => {
        setter(value);
        if (errors[field]) setErrors({ ...errors, [field]: false });
    };

    const handleSubmit = (e: React.FormEvent) => {
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
            quantity: qtyFloat <= 0
        };

        setErrors(newErrors);

        if (Object.values(newErrors).some(Boolean)) {
            setSubmitError('Existem campos obrigatórios não preenchidos (marcados em vermelho).');
            return;
        }

        const newOrder = {
            id: generateId(),
            date,
            store,
            product,
            brand,
            supplier,
            unitValue: unitValue,
            unitMeasure,
            quantity: qtyFloat,
            totalValue: unitValue * qtyFloat,
            deliveryDate: deliveryDate || null
        };

        saveOrder(newOrder);
        
        // Reset Fields Logic
        // Requirements: Keep Date, Store, Supplier. Reset others.
        
        // setStore(''); // KEEPS STORE
        setProduct('');
        setBrand('');
        // setSupplier(''); // KEEPS SUPPLIER
        setUnitMeasure('');
        setUnitValue(0);
        setQuantity('');
        setDeliveryDate('');
        setErrors({});
        
        // Optional visual feedback toast could go here
        alert('Pedido cadastrado com sucesso!');
    };

    const getInputClass = (hasError: boolean) => 
        `w-full p-3 border rounded outline-none transition-all ${
            hasError 
            ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200' 
            : 'border-gray-300 bg-white focus:ring-2 focus:ring-heroRed'
        }`;

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 max-w-4xl mx-auto animate-fadeIn">
            <h2 className="text-2xl font-bold text-heroBlack mb-6 border-b-2 border-heroRed pb-2">Novo Pedido</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Date */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Data do Pedido</label>
                    <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-heroRed outline-none"
                    />
                </div>

                {/* Store */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Loja {errors.store && <span className="text-red-500">*</span>}</label>
                    <select 
                        value={store} 
                        onChange={(e) => handleFieldChange(setStore, 'store', e.target.value)}
                        className={getInputClass(errors.store)}
                    >
                        <option value="">Selecione...</option>
                        {data.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {data.stores.length === 0 && <p className="text-xs text-red-500 mt-1">Cadastre lojas em "Campos!"</p>}
                </div>

                {/* Product */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Produto {errors.product && <span className="text-red-500">*</span>}</label>
                    <select 
                        value={product} 
                        onChange={(e) => handleFieldChange(setProduct, 'product', e.target.value)}
                        className={getInputClass(errors.product)}
                    >
                        <option value="">Selecione...</option>
                        {data.products.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Brand */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Marca do Produto {errors.brand && <span className="text-red-500">*</span>}</label>
                    <select 
                        value={brand} 
                        onChange={(e) => handleFieldChange(setBrand, 'brand', e.target.value)}
                        className={getInputClass(errors.brand)}
                    >
                        <option value="">Selecione...</option>
                        {data.brands.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Supplier */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Fornecedor {errors.supplier && <span className="text-red-500">*</span>}</label>
                    <select 
                        value={supplier} 
                        onChange={(e) => handleFieldChange(setSupplier, 'supplier', e.target.value)}
                        className={getInputClass(errors.supplier)}
                    >
                        <option value="">Selecione...</option>
                        {data.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Unit Measure */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Medida da Unidade {errors.unitMeasure && <span className="text-red-500">*</span>}</label>
                    <select 
                        value={unitMeasure} 
                        onChange={(e) => handleFieldChange(setUnitMeasure, 'unitMeasure', e.target.value)}
                        className={getInputClass(errors.unitMeasure)}
                    >
                        <option value="">Selecione...</option>
                        {data.units.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Unit Value */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Valor da Unidade (R$) {errors.unitValue && <span className="text-red-500">*</span>}</label>
                    <input 
                        type="text"
                        value={formatCurrency(unitValue)} 
                        onChange={handleCurrencyChange}
                        className={`${getInputClass(errors.unitValue)} font-mono text-right`}
                        placeholder="R$ 0,00"
                    />
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Quantidade Pedida {errors.quantity && <span className="text-red-500">*</span>}</label>
                    <input 
                        type="text"
                        inputMode="numeric"
                        value={quantity} 
                        onChange={handleQuantityChange}
                        className={`${getInputClass(errors.quantity)} text-right font-mono`}
                        placeholder="0,000"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">Formato: 0,000 (Digite os números)</p>
                </div>

                {/* Total (Read Only) */}
                <div className="md:col-span-1 bg-gray-100 p-4 rounded border border-gray-200">
                    <label className="block text-sm font-bold text-gray-600 mb-1">Valor Total</label>
                    <div className="text-2xl font-black text-gray-800 text-right">{calculateTotal()}</div>
                </div>

                {/* Delivery Date */}
                <div className="md:col-span-1">
                     <label className="block text-sm font-bold text-gray-700 mb-1">Data da Entrega</label>
                     <div className="flex gap-2">
                        <input 
                            type="date" 
                            value={deliveryDate} 
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="flex-1 p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-heroRed outline-none"
                        />
                        <button 
                            type="button"
                            onClick={() => setDeliveryDate(new Date().toISOString().split('T')[0])}
                            className="bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition-colors"
                            title="Hoje"
                        >
                            <Calendar size={24} />
                        </button>
                     </div>
                </div>
            </div>

            {/* Submit Area */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-end gap-4">
                {submitError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                        <AlertCircle size={16} /> {submitError}
                    </div>
                )}
                
                <button 
                    type="submit" 
                    className="bg-heroRed text-white font-bold py-4 px-12 rounded-lg shadow-md hover:bg-red-800 hover:shadow-lg transform hover:-translate-y-1 transition-all flex items-center gap-3 text-lg"
                >
                    <CheckCircle size={24} />
                    CADASTRAR PEDIDO
                </button>
            </div>
        </form>
    );
};