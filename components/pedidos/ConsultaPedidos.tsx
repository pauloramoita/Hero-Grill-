import React, { useState, useEffect } from 'react';
import { getOrders, getAppData, updateOrder, deleteOrder, exportToXML, formatCurrency, getTodayLocalISO, formatDateBr } from '../../services/storageService';
import { AppData, Order } from '../../types';
import { CheckCircle, AlertTriangle, Download, Trash2, Edit, Printer, Package, DollarSign, Loader2 } from 'lucide-react';
import { EditOrderModal } from './EditOrderModal';

export const ConsultaPedidos: React.FC = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    const [loading, setLoading] = useState(true);
    
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        dateStart: firstDay,
        dateEnd: todayStr,
        store: '',
        product: '',
        brand: '',
        supplier: ''
    });
    const [onlyPending, setOnlyPending] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [orders, data] = await Promise.all([getOrders(), getAppData()]);
            setAllOrders(orders);
            setAppData(data);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        let result = allOrders.filter(o => {
            const orderDate = o.date;
            return orderDate >= filters.dateStart && 
                   orderDate <= filters.dateEnd &&
                   (filters.store === '' || o.store === filters.store) &&
                   (filters.product === '' || o.product === filters.product) &&
                   (filters.brand === '' || o.brand === filters.brand) &&
                   (filters.supplier === '' || o.supplier === filters.supplier);
        });

        if (onlyPending) {
            result = result.filter(o => !o.deliveryDate);
        }
        setFilteredOrders(result);
    }, [allOrders, onlyPending, filters]);

    const quickDeliver = async (order: Order, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = { ...order, deliveryDate: getTodayLocalISO() };
        await updateOrder(updated);
        setAllOrders(prev => prev.map(o => o.id === order.id ? updated : o));
    };

    const confirmDelete = async () => {
        if (deletingId) {
            await deleteOrder(deletingId);
            setAllOrders(prev => prev.filter(o => o.id !== deletingId));
            setDeletingId(null);
        }
    };

    const handleEditSave = async (updatedOrder: Order) => {
        await updateOrder(updatedOrder);
        setEditingOrder(null);
        setAllOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    };

    const handleExport = () => exportToXML(filteredOrders, 'relatorio_pedidos');

    const totalValue = filteredOrders.reduce((acc, o) => acc + o.totalValue, 0);
    
    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" size={40}/></div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 no-print">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Início</label>
                        <input type="date" value={filters.dateStart} onChange={e => setFilters({...filters, dateStart: e.target.value})} className="w-full border p-2 rounded"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Final</label>
                        <input type="date" value={filters.dateEnd} onChange={e => setFilters({...filters, dateEnd: e.target.value})} className="w-full border p-2 rounded"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                        <select value={filters.store} onChange={e => setFilters({...filters, store: e.target.value})} className="w-full border p-2 rounded">
                            <option value="">Todas</option>
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Produto</label>
                        <select value={filters.product} onChange={e => setFilters({...filters, product: e.target.value})} className="w-full border p-2 rounded">
                            <option value="">Todos</option>
                            {appData.products.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-4 border-t pt-4 mt-2">
                    <div className="flex gap-2">
                        <button onClick={() => setOnlyPending(!onlyPending)} className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold ${onlyPending ? 'bg-orange-100 text-orange-700' : 'bg-gray-100'}`}>
                            <AlertTriangle size={16}/> {onlyPending ? 'Mostrando Pendentes' : 'Mostrar Pendentes'}
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                            <Download size={18}/> Excel
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            <Printer size={18}/> Imprimir
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded border flex flex-col">
                    <span className="text-gray-500 font-bold text-xs uppercase flex items-center gap-2"><Package size={14}/> Total Pedidos</span>
                    <div className="text-2xl font-black">{filteredOrders.length}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded border flex flex-col">
                    <span className="text-blue-600 font-bold text-xs uppercase flex items-center gap-2"><DollarSign size={14}/> Valor Total</span>
                    <div className="text-2xl font-black text-blue-800">{formatCurrency(totalValue)}</div>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow border">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Data', 'Loja', 'Produto', 'Marca', 'Valor', 'Qtd', 'Total', 'Entrega', 'Ações'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50 break-inside-avoid">
                                <td className="px-4 py-2 text-sm">{formatDateBr(order.date)}</td>
                                <td className="px-4 py-2 text-sm">{order.store}</td>
                                <td className="px-4 py-2 text-sm font-medium">{order.product}</td>
                                <td className="px-4 py-2 text-sm">{order.brand}</td>
                                <td className="px-4 py-2 text-sm">{formatCurrency(order.unitValue)}</td>
                                <td className="px-4 py-2 text-sm">{order.quantity}</td>
                                <td className="px-4 py-2 text-sm font-bold">{formatCurrency(order.totalValue)}</td>
                                <td className="px-4 py-2 text-sm">
                                    {order.deliveryDate ? <span className="text-green-600">{formatDateBr(order.deliveryDate)}</span> : <span className="text-orange-500">Pendente</span>}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap no-print">
                                    <div className="flex items-center gap-2">
                                        {!order.deliveryDate && <button onClick={(e) => quickDeliver(order, e)} className="text-blue-600 p-1"><CheckCircle size={18}/></button>}
                                        <button onClick={(e) => {e.stopPropagation(); setEditingOrder(order)}} className="text-gray-600 p-1"><Edit size={18}/></button>
                                        <button onClick={(e) => {e.stopPropagation(); setDeletingId(order.id)}} className="text-red-500 p-1"><Trash2 size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={handleEditSave} />}
            
            {deletingId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
                    <div className="bg-white p-6 rounded shadow-xl max-w-md">
                        <h3 className="font-bold mb-4">Confirmar Exclusão</h3>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeletingId(null)} className="px-4 py-2 bg-gray-100 rounded">Cancelar</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};