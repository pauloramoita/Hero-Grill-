
import React, { useState, useEffect, useMemo } from 'react';
import { getOrders, getAppData, updateOrder, deleteOrder, exportToXML, formatCurrency, getTodayLocalISO, formatDateBr } from '../../services/storageService';
import { AppData, Order, User } from '../../types';
import { CheckCircle, Download, Trash2, Edit, Printer, Package, DollarSign, Loader2, Search, Filter, X } from 'lucide-react';
import { EditOrderModal } from './EditOrderModal';

interface ConsultaPedidosProps {
    user: User;
}

export const ConsultaPedidos: React.FC<ConsultaPedidosProps> = ({ user }) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
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
        supplier: '', 
        type: '',
        category: ''
    });

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

     // Determine available stores based on user permissions
     const availableStores = useMemo(() => {
        if (user.isMaster) return appData.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return appData.stores.filter(s => user.permissions.stores.includes(s));
        }
        return appData.stores;
    }, [appData.stores, user]);

    // Auto-select if only one store available and lock it
    useEffect(() => {
        if (availableStores.length === 1) {
            setFilters(prev => ({ ...prev, store: availableStores[0] }));
        }
    }, [availableStores]);

    useEffect(() => {
        let result = allOrders.filter(o => {
            const orderDate = o.date;
            // Basic filtering
            const matchesDate = orderDate >= filters.dateStart && orderDate <= filters.dateEnd;
            const matchesStore = filters.store === '' || o.store === filters.store;
            const matchesProduct = filters.product === '' || o.product === filters.product;
            const matchesBrand = filters.brand === '' || o.brand === filters.brand;
            const matchesSupplier = filters.supplier === '' || o.supplier === filters.supplier;
            const matchesCategory = filters.category === '' || o.category === filters.category;
            const matchesType = filters.type === '' || (o.type || 'Variável') === filters.type;
            
            let allowedStore = true;
            if (!user.isMaster && user.permissions.stores && user.permissions.stores.length > 0) {
                 allowedStore = user.permissions.stores.includes(o.store);
            }

            return matchesDate && matchesStore && matchesProduct && matchesBrand && matchesSupplier && matchesCategory && matchesType && allowedStore;
        });

        // Ordenação: Mais recente para o mais antigo
        result.sort((a, b) => b.date.localeCompare(a.date));

        setFilteredOrders(result);
    }, [allOrders, filters, user]);

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

    const handleExport = () => exportToXML(filteredOrders, 'relatorio_cadastro');

    const totalValue = filteredOrders.reduce((acc, o) => acc + o.totalValue, 0);
    
    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-heroRed" size={40}/></div>;

    const filterInputClass = "w-full border border-slate-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-heroRed/10 focus:border-heroRed outline-none bg-slate-50";
    const labelClass = "block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide";

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Filter Panel */}
            <div className="bg-white p-6 rounded-xl shadow-card border border-slate-200 no-print">
                <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                    <Filter size={18} className="text-heroRed"/>
                    <h3>Filtros de Pesquisa</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                        <label className={labelClass}>Data Início</label>
                        <input type="date" value={filters.dateStart} onChange={e => setFilters({...filters, dateStart: e.target.value})} className={filterInputClass}/>
                    </div>
                    <div>
                        <label className={labelClass}>Data Final</label>
                        <input type="date" value={filters.dateEnd} onChange={e => setFilters({...filters, dateEnd: e.target.value})} className={filterInputClass}/>
                    </div>
                    <div>
                        <label className={labelClass}>Loja</label>
                        <select 
                            value={filters.store} 
                            onChange={e => setFilters({...filters, store: e.target.value})} 
                            className={`${filterInputClass} ${availableStores.length === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                            disabled={availableStores.length === 1}
                        >
                            {availableStores.length !== 1 && <option value="">Todas</option>}
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Categoria</label>
                        <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className={filterInputClass}>
                            <option value="">Todas</option>
                            {appData.categories.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Produto</label>
                        <select value={filters.product} onChange={e => setFilters({...filters, product: e.target.value})} className={filterInputClass}>
                            <option value="">Todos</option>
                            {appData.products.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className={labelClass}>Fornecedor</label>
                        <select value={filters.supplier} onChange={e => setFilters({...filters, supplier: e.target.value})} className={filterInputClass}>
                            <option value="">Todos</option>
                            {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className={labelClass}>Tipo</label>
                        <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className={filterInputClass}>
                            <option value="">Todos</option>
                            {appData.types.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-4 mt-4">
                    <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors shadow-sm">
                        <Download size={16}/> Exportar Excel
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors shadow-sm">
                        <Printer size={16}/> Imprimir
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-card border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total de Itens</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{filteredOrders.length}</p>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-lg text-slate-600">
                        <Package size={24}/>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-card border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wide">Valor Total</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalValue)}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                        <DollarSign size={24}/>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-hidden bg-white rounded-xl shadow-card border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Data', 'Loja', 'Fornecedor', 'Produto', 'Valor Unit.', 'Total', 'Vencimento', 'Ações'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors break-inside-avoid">
                                    <td className="px-6 py-3 text-sm text-slate-600 font-medium">{formatDateBr(order.date)}</td>
                                    <td className="px-6 py-3 text-sm text-slate-600">{order.store}</td>
                                    <td className="px-6 py-3 text-sm text-slate-700">{order.supplier}</td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-800">{order.product}</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-medium">{order.brand}</span>
                                                {order.type && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-medium">{order.type}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-sm text-slate-600">{formatCurrency(order.unitValue)}</td>
                                    <td className="px-6 py-3 text-sm font-bold text-slate-800">{formatCurrency(order.totalValue)}</td>
                                    <td className="px-6 py-3 text-sm">
                                        {order.deliveryDate ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {formatDateBr(order.deliveryDate)}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                Pendente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-sm whitespace-nowrap no-print">
                                        <div className="flex items-center gap-2">
                                            {!order.deliveryDate && (
                                                <button onClick={(e) => quickDeliver(order, e)} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition-colors" title="Marcar como Pago">
                                                    <CheckCircle size={18}/>
                                                </button>
                                            )}
                                            <button onClick={(e) => {e.stopPropagation(); setEditingOrder(order)}} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Editar">
                                                <Edit size={18}/>
                                            </button>
                                            <button onClick={(e) => {e.stopPropagation(); setDeletingId(order.id)}} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Excluir">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredOrders.length === 0 && (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-400 text-sm">Nenhum pedido encontrado para os filtros selecionados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={handleEditSave} />}
            
            {deletingId && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full animate-fadeIn">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <div className="bg-red-100 p-2 rounded-full"><Trash2 size={24}/></div>
                            <h3 className="font-bold text-lg text-slate-800">Confirmar Exclusão</h3>
                        </div>
                        <p className="text-slate-600 mb-6 text-sm leading-relaxed">Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeletingId(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">Excluir Permanentemente</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};