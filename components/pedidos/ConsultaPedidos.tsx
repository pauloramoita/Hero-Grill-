
import React, { useState, useEffect, useMemo } from 'react';
import { getOrders, getAppData, updateOrder, deleteOrder, exportToXML, formatCurrency, getTodayLocalISO, formatDateBr } from '../../services/storageService';
import { AppData, Order, User } from '../../types';
import { CheckCircle, Download, Trash2, Edit, Printer, Package, DollarSign, Loader2, Search, Filter, X, ChevronDown } from 'lucide-react';
import { EditOrderModal } from './EditOrderModal';

interface ConsultaPedidosProps {
    user: User;
}

// Hook para persistência de estado
function usePersistedState<T>(key: string, initialState: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        const storageValue = localStorage.getItem(key);
        if (storageValue) {
            try { return JSON.parse(storageValue); } catch {}
        }
        return initialState;
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState];
}

export const ConsultaPedidos: React.FC<ConsultaPedidosProps> = ({ user }) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loading, setLoading] = useState(true);
    
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Datas
    const todayStr = getTodayLocalISO();
    const [y, m, d] = todayStr.split('-');
    const firstDayStr = `${y}-${m}-01`;

    // Persistindo filtros
    const [filters, setFilters] = usePersistedState('hero_state_cons_ped_filters', {
        dateStart: firstDayStr,
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

     const availableStores = useMemo(() => {
        if (user.isMaster) return appData.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return appData.stores.filter(s => user.permissions.stores.includes(s));
        }
        return appData.stores;
    }, [appData.stores, user]);

    useEffect(() => {
        if (availableStores.length === 1) {
            setFilters(prev => ({ ...prev, store: availableStores[0] }));
        }
    }, [availableStores]);

    useEffect(() => {
        let result = allOrders.filter(o => {
            const orderDate = o.date;
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

    const totalValue = filteredOrders.reduce((acc, o) => acc + (Number(o.totalValue) || 0), 0);
    
    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-heroRed" size={40}/></div>;

    const filterInputClass = "w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-heroRed/10 focus:border-heroRed outline-none bg-slate-50 hover:bg-white hover:border-slate-300 transition-all";
    const labelClass = "block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide";

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Filter Panel */}
            <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 no-print">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700">
                        <div className="bg-slate-100 p-2 rounded-lg">
                            <Filter size={20} className="text-slate-500"/>
                        </div>
                        <h3 className="font-bold text-lg">Filtros de Pesquisa</h3>
                    </div>
                    <button 
                        onClick={() => setFilters({
                            dateStart: firstDayStr, dateEnd: todayStr, store: availableStores.length === 1 ? availableStores[0] : '',
                            product: '', brand: '', supplier: '', type: '', category: ''
                        })}
                        className="text-xs text-red-500 hover:text-red-700 font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                        <X size={14} /> Limpar Filtros
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
                        <div className="relative">
                            <select 
                                value={filters.store} 
                                onChange={e => setFilters({...filters, store: e.target.value})} 
                                className={`${filterInputClass} appearance-none ${availableStores.length === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                                disabled={availableStores.length === 1}
                            >
                                {availableStores.length !== 1 && <option value="">Todas</option>}
                                {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Categoria</label>
                        <div className="relative">
                            <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className={`${filterInputClass} appearance-none`}>
                                <option value="">Todas</option>
                                {appData.categories.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Produto</label>
                        <div className="relative">
                            <select value={filters.product} onChange={e => setFilters({...filters, product: e.target.value})} className={`${filterInputClass} appearance-none`}>
                                <option value="">Todos</option>
                                {appData.products.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                        </div>
                    </div>
                     <div>
                        <label className={labelClass}>Fornecedor</label>
                        <div className="relative">
                            <select value={filters.supplier} onChange={e => setFilters({...filters, supplier: e.target.value})} className={`${filterInputClass} appearance-none`}>
                                <option value="">Todos</option>
                                {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                        </div>
                    </div>
                     <div>
                        <label className={labelClass}>Tipo</label>
                        <div className="relative">
                            <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className={`${filterInputClass} appearance-none`}>
                                <option value="">Todos</option>
                                {appData.types.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-3 pt-6 mt-2">
                    <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 text-sm font-bold transition-all shadow-sm active:scale-95">
                        <Download size={18}/> Exportar Excel
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-700 text-white px-5 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-bold transition-all shadow-sm active:scale-95">
                        <Printer size={18}/> Imprimir
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total de Itens</p>
                        <p className="text-3xl font-black text-slate-800">{filteredOrders.length}</p>
                    </div>
                    <div className="bg-slate-100 p-4 rounded-xl text-slate-500">
                        <Package size={28}/>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Valor Total</p>
                        <p className="text-3xl font-black text-blue-600">{formatCurrency(totalValue)}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl text-blue-600">
                        <DollarSign size={28}/>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-hidden bg-white rounded-2xl shadow-card border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Data', 'Loja', 'Fornecedor', 'Produto', 'Valor Unit.', 'Total', 'Vencimento', 'Ações'].map(h => (
                                    <th key={h} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors break-inside-avoid group">
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium whitespace-nowrap">{formatDateBr(order.date)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{order.store}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{order.supplier}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800">{order.product}</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-medium">{order.brand}</span>
                                                {order.type && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-medium">{order.type}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{formatCurrency(order.unitValue)}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-800 font-mono">{formatCurrency(order.totalValue)}</td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                                        {order.deliveryDate ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                {formatDateBr(order.deliveryDate)}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                                Pendente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap no-print">
                                        <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {!order.deliveryDate && (
                                                <button onClick={(e) => quickDeliver(order, e)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors" title="Marcar como Pago">
                                                    <CheckCircle size={18}/>
                                                </button>
                                            )}
                                            <button onClick={(e) => {e.stopPropagation(); setEditingOrder(order)}} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Editar">
                                                <Edit size={18}/>
                                            </button>
                                            <button onClick={(e) => {e.stopPropagation(); setDeletingId(order.id)}} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Excluir">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredOrders.length === 0 && (
                                <tr><td colSpan={8} className="p-12 text-center text-slate-400 text-sm italic">Nenhum pedido encontrado para os filtros selecionados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={handleEditSave} />}
            
            {deletingId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full animate-scaleIn">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="bg-red-50 p-4 rounded-full mb-4">
                                <Trash2 size={32} className="text-red-500"/>
                            </div>
                            <h3 className="font-black text-xl text-slate-800">Confirmar Exclusão</h3>
                            <p className="text-slate-500 mt-2 text-sm">Tem certeza que deseja excluir este pedido? <br/>Esta ação não pode ser desfeita.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
