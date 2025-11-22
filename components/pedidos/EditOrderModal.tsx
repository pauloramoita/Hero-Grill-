
import React, { useState, useEffect } from 'react';
import { AppData, Order } from '../../types';
import { getAppData, formatCurrency } from '../../services/storageService';
import { X, Save } from 'lucide-react';

interface EditOrderModalProps {
    order: Order;
    onClose: () => void;
    onSave: (updatedOrder: Order) => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, onClose, onSave }) => {
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    
    const [date, setDate] = useState(order.date);
    const [store, setStore] = useState(order.store);
    const [type, setType] = useState(order.type || 'Variável');
    const [category, setCategory] = useState(order.category || '');
    const [product, setProduct] = useState(order.product);
    const [brand, setBrand] = useState(order.brand);
    const [supplier, setSupplier] = useState(order.supplier);
    const [unitMeasure, setUnitMeasure] = useState(order.unitMeasure);
    const [unitValue, setUnitValue] = useState<number>(order.unitValue);
    const [quantity, setQuantity] = useState<string>(order.quantity.toString());
    const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate || '');

    useEffect(() => {
        const load = async () => {
            const data = await getAppData();
            setAppData(data);
        };
        load();
    }, []);

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setUnitValue(floatValue);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!store || !product || !brand || !supplier || unitValue <= 0 || !unitMeasure || !quantity || !type) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const updatedOrder: Order = {
            ...order,
            date,
            store,
            type,
            category,
            product,
            brand,
            supplier,
            unitValue,
            unitMeasure,
            quantity: parseFloat(quantity),
            totalValue: unitValue * parseFloat(quantity),
            deliveryDate: deliveryDate || null
        };

        onSave(updatedOrder);
    };

    const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1";
    const inputClass = "w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:border-heroRed focus:ring-4 focus:ring-heroRed/10 transition-all";

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Editar Cadastro</h3>
                        <p className="text-sm text-slate-400 font-medium">Atualize as informações do pedido.</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className={labelClass}>Data</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass}/>
                    </div>
                    
                    <div>
                        <label className={labelClass}>Loja</label>
                        <select value={store} onChange={(e) => setStore(e.target.value)} className={inputClass}>
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Tipo</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                            {appData.types.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                     <div>
                        <label className={labelClass}>Categoria</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                            <option value="">Selecione...</option>
                            {appData.categories.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Produto</label>
                        <select value={product} onChange={(e) => setProduct(e.target.value)} className={inputClass}>
                            {appData.products.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Marca</label>
                        <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass}>
                            {appData.brands.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Fornecedor</label>
                        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputClass}>
                            {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Unidade</label>
                        <select value={unitMeasure} onChange={(e) => setUnitMeasure(e.target.value)} className={inputClass}>
                            {appData.units.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Valor Unitário (R$)</label>
                        <input 
                            type="text" 
                            value={formatCurrency(unitValue)} 
                            onChange={handleCurrencyChange}
                            className={`${inputClass} text-right font-mono font-bold`}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Quantidade</label>
                        <input 
                            type="number" step="0.001" 
                            value={quantity} onChange={(e) => setQuantity(e.target.value)} 
                            className={`${inputClass} text-right font-bold`}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Total</label>
                        <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right font-black text-slate-800">
                            {formatCurrency(unitValue * parseFloat(quantity || '0'))}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Data Vencimento</label>
                        <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass}/>
                    </div>
                </form>

                <div className="md:col-span-2 flex justify-end gap-4 p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl mt-auto">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-bold hover:bg-white hover:shadow-sm rounded-lg transition-all">Cancelar</button>
                    <button onClick={handleSubmit} type="submit" className="bg-heroRed text-white px-8 py-3 rounded-lg hover:bg-red-700 font-bold shadow-md flex items-center gap-2 transition-all active:scale-95">
                        <Save size={20} /> Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};
