
import React, { useState, useEffect } from 'react';
import { getOrders, getAppData, updateOrder, deleteOrder, exportToXML, formatCurrency, getTodayLocalISO, formatDateBr } from '../../services/storageService';
import { AppData, Order } from '../../types';
import { CheckCircle, Search, AlertTriangle, Download, Trash2, Edit, Printer } from 'lucide-react';
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
    
    // Add persistent state for "Pending Only" mode
    const [onlyPending, setOnlyPending] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setAllOrders(getOrders());
        setAppData(getAppData());
    };

    // Re-apply filters when data OR filter state changes
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
        // Immediate update without confirmation dialog as requested
        const todayISO = getTodayLocalISO();
        const updated = { ...order, deliveryDate: todayISO };
        
        updateOrder(updated);
        
        // Optimistically update local state to reflect change immediately in UI
        setAllOrders(prev => prev.map(o => o.id === order.id ? updated : o));
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Open the confirmation modal
        setDeletingId(id);
    };

    const confirmDelete = () => {
        if (deletingId) {
            deleteOrder(deletingId);
            // Optimistically update local state
            setAllOrders(prev => prev.filter(o => o.id !== deletingId));
            setDeletingId(null); // Close modal
        }
    };

    const handleEditClick = (order: Order, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingOrder(order);
    };

    const handleEditSave = (updatedOrder: Order) => {
        updateOrder(updatedOrder);
        setEditingOrder(null);
        // Update state to reflect edits
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

    const hiddenCount = allOrders.length - filteredOrders.length;

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 no-print">
                <div>
                    <label className="block text-xs font-bold text-gray-600">Data Início</label>
                    <input type="date" value={filters.dateStart} onChange={e => setFilters({...filters, dateStart: e.target.value})} className="w-full border p-2 rounded"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600">Data Final</label>
                    <input type="date" value={filters.dateEnd} onChange={e => setFilters({...filters, dateEnd: e.target.value})} className="w-full border p-2 rounded"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600">Loja</label>
                    <select value={filters.store} onChange={e => setFilters({...filters, store: e.target.value})} className="w-full border p-2 rounded">
                        <option value="">Todas</option>
                        {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600">Produto</label>
                    <select value={filters.product} onChange={e => setFilters({...filters, product: e.target.value})} className="w-full border p-2 rounded">
                        <option value="">Todos</option>
                        {appData.products.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600">Marca</label>
                    <select value={filters.brand} onChange={e => setFilters({...filters, brand: e.target.value})} className="w-full border p-2 rounded">
                        <option value="">Todas</option>
                        {appData.brands.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-600">Fornecedor</label>
                    <select value={filters.supplier} onChange={e => setFilters({...filters, supplier: e.target.value})} className="w-full border p-2 rounded">
                        <option value="">Todos</option>
                        {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 no-print">
                <button 
                    onClick={() => setOnlyPending(false)} 
                    className={`flex items-center gap-2 px-6 py-2 rounded hover:bg-gray-800 transition-colors ${!onlyPending ? 'bg-heroBlack text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    <Search size={18}/> Pesquisar Todos
                </button>
                <button 
                    onClick={() => setOnlyPending(true)} 
                    className={`flex items-center gap-2 px-6 py-2 rounded hover:bg-orange-700 transition-colors ${onlyPending ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    <AlertTriangle size={18}/> Pedidos Não Entregues
                </button>
                <div className="ml-auto flex gap-2">
                    <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                        <Download size={18}/> Excel
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        <Printer size={18}/> Imprimir / PDF
                    </button>
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
                                    {hiddenCount > 0 ? (
                                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg inline-block">
                                            <p className="font-bold text-orange-700 flex items-center justify-center gap-2 mb-1">
                                                <AlertTriangle size={20}/> Atenção!
                                            </p>
                                            <p className="text-orange-800">
                                                Existem <span className="font-black text-lg">{hiddenCount}</span> pedidos registrados no banco de dados, 
                                                mas eles estão ocultos pelos filtros atuais (Datas ou Campos).
                                            </p>
                                            <p className="text-sm text-orange-600 mt-2">
                                                Verifique se a <strong>Data Final</strong> está correta para visualizar os dados importados.
                                            </p>
                                        </div>
                                    ) : (
                                        "Nenhum pedido encontrado."
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingOrder && (
                <EditOrderModal 
                    order={editingOrder} 
                    onClose={() => setEditingOrder(null)} 
                    onSave={handleEditSave} 
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] no-print">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 border-l-4 border-heroRed animate-fadeIn">
                        <h3 className="text-xl font-bold text-heroBlack mb-2">Confirmar Exclusão</h3>
                        <p className="text-gray-600 mb-6">
                            Tem certeza que deseja excluir este lançamento? <br/>
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