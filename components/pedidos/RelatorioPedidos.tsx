
import React, { useState, useEffect } from 'react';
import { getOrders, getAppData, formatCurrency, deleteOrder, updateOrder, formatDateBr, exportToXML } from '../../services/storageService';
import { AppData, Order } from '../../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FileText, Edit, Trash2, FileSpreadsheet, Printer } from 'lucide-react';
import { EditOrderModal } from './EditOrderModal';

export const RelatorioPedidos: React.FC = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    const [filteredData, setFilteredData] = useState<Order[]>([]);
    
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        dateStart: firstDay,
        dateEnd: todayStr,
        store: '',
        product: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setAllOrders(getOrders());
        setAppData(getAppData());
    };

    const generateReport = () => {
        const sorted = allOrders
            .filter(o => {
                return o.date >= filters.dateStart && 
                       o.date <= filters.dateEnd &&
                       (filters.store === '' || o.store === filters.store) &&
                       (filters.product === '' || o.product === filters.product);
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setFilteredData(sorted);
    };

    // Re-generate report if data changes (e.g. after edit/delete)
    useEffect(() => {
        if (filteredData.length > 0 || allOrders.length > 0) {
            generateReport();
        }
    }, [allOrders]);

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeletingId(id);
    };

    const confirmDelete = () => {
        if (deletingId) {
            deleteOrder(deletingId);
            // Update local state immediately
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
        // Update local state immediately
        setAllOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    };

    const handleExport = () => {
        if (filteredData.length === 0) {
            alert("Gere o relatório antes de exportar.");
            return;
        }
        exportToXML(filteredData, 'relatorio_pedidos_personalizado');
    };

    const handlePrint = () => {
        window.print();
    };

    const chartData = filteredData.map(o => ({
        // Use simple string slice to avoid timezone shifts on dates
        date: formatDateBr(o.date).slice(0, 5), // dd/mm
        valorUnitario: o.unitValue,
        marca: o.brand
    }));

    return (
        <div className="space-y-8">
            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 no-print">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                            <option value="">Selecione (Obrigatório para gráfico preciso)</option>
                            {appData.products.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={generateReport} className="bg-heroRed text-white px-8 py-2 rounded font-bold hover:bg-red-800 flex items-center gap-2">
                        <FileText size={20} /> Gerar Relatório
                    </button>
                    {filteredData.length > 0 && (
                        <>
                            <button onClick={handleExport} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2">
                                <FileSpreadsheet size={20} /> Excel
                            </button>
                            <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 flex items-center gap-2">
                                <Printer size={20} /> Imprimir/PDF
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Chart */}
            {filteredData.length > 0 && filters.product && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-96">
                    <h3 className="text-lg font-bold text-heroBlack mb-4">Evolução de Preço Unitário: {filters.product}</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={['auto', 'auto']} tickFormatter={(val) => `R$ ${val}`} />
                            <Tooltip formatter={(val: number) => formatCurrency(val)} />
                            <Legend />
                            <Line type="monotone" dataKey="valorUnitario" stroke="#D32F2F" strokeWidth={3} activeDot={{ r: 8 }} name="Valor Unitário" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Detailed List */}
            {filteredData.length > 0 && (
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-800">Detalhamento do Período</h3>
                    </div>
                    <div className="overflow-x-auto">
                         <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Data', 'Loja', 'Produto', 'Marca', 'Fornecedor', 'Vl. Unit.', 'Qtd', 'Total', 'Ações'].map(h => (
                                        <th key={h} className={`px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider ${h === 'Ações' ? 'no-print' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredData.map((order) => (
                                    <tr key={order.id} className="break-inside-avoid">
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">{formatDateBr(order.date)}</td>
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{order.store}</td>
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">{order.product}</td>
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{order.brand}</td>
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{order.supplier}</td>
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(order.unitValue)}</td>
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{order.quantity.toFixed(3)}</td>
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 font-bold">{formatCurrency(order.totalValue)}</td>
                                        <td className="px-6 py-2 whitespace-nowrap text-sm no-print">
                                            <div className="flex gap-2">
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
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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