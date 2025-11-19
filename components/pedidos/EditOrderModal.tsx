
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
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    
    const [date, setDate] = useState(order.date);
    const [store, setStore] = useState(order.store);
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
        if (!store || !product || !brand || !supplier || unitValue <= 0 || !unitMeasure || !quantity) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const updatedOrder: Order = {
            ...order,
            date,
            store,
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-heroBlack">Editar Pedido</h3>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-red-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Data do Pedido</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border rounded"/>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Loja</label>
                        <select value={store} onChange={(e) => setStore(e.target.value)} className="w-full p-2 border rounded">
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Produto</label>
                        <select value={product} onChange={(e) => setProduct(e.target.value)} className="w-full p-2 border rounded">
                            {appData.products.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Marca</label>
                        <select value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full p-2 border rounded">
                            {appData.brands.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Fornecedor</label>
                        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full p-2 border rounded">
                            {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Unidade</label>
                        <select value={unitMeasure} onChange={(e) => setUnitMeasure(e.target.value)} className="w-full p-2 border rounded">
                            {appData.units.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Valor Unitário (R$)</label>
                        <input 
                            type="text" 
                            value={formatCurrency(unitValue)} 
                            onChange={handleCurrencyChange}
                            className="w-full p-2 border rounded text-right font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Quantidade</label>
                        <input 
                            type="number" step="0.001" 
                            value={quantity} onChange={(e) => setQuantity(e.target.value)} 
                            className="w-full p-2 border rounded text-right"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Total</label>
                        <div className="w-full p-2 border rounded bg-gray-100 text-right font-bold">
                            {formatCurrency(unitValue * parseFloat(quantity || '0'))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Data Entrega</label>
                        <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full p-2 border rounded"/>
                    </div>

                    <div className="md:col-span-2 flex justify-end pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="mr-4 px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                        <button type="submit" className="bg-heroRed text-white px-6 py-2 rounded hover:bg-red-800 flex items-center gap-2">
                            <Save size={18} /> Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
