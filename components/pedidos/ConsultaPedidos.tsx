
import React, { useState, useEffect } from 'react';
import { getOrders, getAppData, updateOrder, deleteOrder, exportToXML, formatCurrency, getTodayLocalISO, formatDateBr } from '../../services/storageService';
import { AppData, Order } from '../../types';
import { CheckCircle, Search, AlertTriangle, Download, Trash2, Edit, Printer, Package, DollarSign } from 'lucide-react';
import { EditOrderModal } from './EditOrderModal';

export const ConsultaPedidos: React.FC = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    
    // Edit State
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    // Delete Confirmation State
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Filters
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
        loadData();
    }, []);

    const loadData = () => {
        setAllOrders(getOrders());
        setAppData(getAppData());
    };

    useEffect(() => {
        handleFilter();
    }, [allOrders, onlyPending, filters]);

    const handleFilter = () => {
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
    };

    const quickDeliver = (order: Order, e: React.MouseEvent) => {
        e.stopPropagation();
        const todayISO = getTodayLocalISO();
        const updated = { ...order, deliveryDate: todayISO };
        updateOrder(updated);
        setAllOrders(prev => prev.map(o => o.id === order.id ? updated : o));
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeletingId(id);
    };

    const confirmDelete = () => {
        if (deletingId) {
            deleteOrder(deletingId);
            setAllOrders(prev => prev.filter(o => o.id !== deletingId));
            setDeletingId(null);
        }
    };

    const handleEditClick = (order: Order, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingOrder(order);
    };

    const handleEditSave = (updatedOrder: Order) => {
        updateOrder(updatedOrder);
        setEditingOrder(null);
        setAllOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    };

    const handleExport = () => {
        if (filteredOrders.length === 0) {
            alert('Nenhum dado para exportar.');
            return;
        }
        exportToXML(filteredOrders, 'relatorio_pedidos');
    };

    const handlePrint = () => {
        window.print();
    };

    // Totals Calculation
    const totalValue = filteredOrders.reduce((acc, o) => acc + o.totalValue, 0);
    const totalItems = filteredOrders.length;
    const pendingItems = filteredOrders.filter(o => !o.deliveryDate).length;

    return (
        <div className="space-y-6">
            {/* Filters Panel - Style match Controle 043 */}
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
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Marca</label>
                        <select value={filters.brand} onChange={e => setFilters({...filters, brand: e.target.value})} className="w-full border p-2 rounded">
                            <option value="">Todas</option>
                            {appData.brands.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Fornecedor</label>
                        <select value={filters.supplier} onChange={e => setFilters({...filters, supplier: e.target.value})} className="w-full border p-2 rounded">
                            <option value="">Todos</option>
                            {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {/* Actions Row inside Filter Panel */}
                <div className="flex flex-wrap justify-between items-center gap-4 border-t pt-4 mt-2">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setOnlyPending(!onlyPending)} 
                            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-colors ${onlyPending ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}
                        >
                            <AlertTriangle size={16}/> {onlyPending ? 'Mostrando Apenas Pendentes' : 'Mostrar Pendentes'}
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors shadow-sm">
                            <Download size={18}/> Excel
                        </button>
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors shadow-sm">
                            <Printer size={18}/> Imprimir / PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Totals Banner - New Addition matching 043 style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded border border-gray-200 flex flex-col">
                    <span className="text-gray-500 font-bold text-xs uppercase flex items-center gap-2"><Package size={14}/> Total de Pedidos</span>
                    <div className="text-2xl font-black text-gray-800">{totalItems}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded border border-orange-200 flex flex-col">
                    <span className="text-orange-600 font-bold text-xs uppercase flex items-center gap-2"><AlertTriangle size={14}/> Pendentes</span>
                    <div className="text-2xl font-black text-orange-800">{pendingItems}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded border border-blue-200 flex flex-col">
                    <span className="text-blue-600 font-bold text-xs uppercase flex items-center gap-2"><DollarSign size={14}/> Valor Total</span>
                    <div className="text-2xl font-black text-blue-800">{formatCurrency(totalValue)}</div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Data', 'Loja', 'Produto', 'Marca', 'Fornecedor', 'Un.', 'Valor', 'Qtd', 'Total', 'Entrega', 'Ações'].map(h => (
                                <th key={h} className={`px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider ${h === 'Ações' ? 'no-print' : ''}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50 break-inside-avoid">
                                <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">{formatDateBr(order.date)}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{order.store}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 font-medium">{order.product}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{order.brand}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{order.supplier}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{order.unitMeasure}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{formatCurrency(order.unitValue)}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{order.quantity.toFixed(3)}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 font-bold">{formatCurrency(order.totalValue)}</td>
                                <td className="px-4 py-2 text-sm">
                                    {order.deliveryDate ? (
                                        <span className="text-green-600 font-medium">{formatDateBr(order.deliveryDate)}</span>
                                    ) : (
                                        <span className="text-orange-500 font-medium">Pendente</span>
                                    )}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap no-print">
                                    <div className="flex items-center gap-2">
                                        {!order.deliveryDate && (
                                            <button 
                                                type="button"
                                                onClick={(e) => quickDeliver(order, e)}
                                                className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer"
                                                title="Entregar Hoje"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                        <button 
                                            type="button"
                                            onClick={(e) => handleEditClick(order, e)}
                                            className="text-gray-600 hover:text-gray-900 p-1 cursor-pointer"
                                            title="Editar"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => handleDeleteClick(order.id, e)}
                                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                            <tr>
                                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                                    Nenhum pedido encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingOrder && (
                <EditOrderModal 
                    order={editingOrder} 
                    onClose={() => setEditingOrder(null)} 
                    onSave={handleEditSave} 
                />
            )}

            {deletingId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] no-print">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 border-l-4 border-heroRed animate-fadeIn">
                        <h3 className="text-xl font-bold text-heroBlack mb-2">Confirmar Exclusão</h3>
                        <p className="text-gray-600 mb-6">
                            Tem certeza que deseja excluir este pedido? <br/>
                            <span className="text-sm text-red-500 font-semibold">Esta ação não pode ser desfeita.</span>
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setDeletingId(null)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-heroRed text-white rounded-lg font-medium hover:bg-red-800 transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={18} /> Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
