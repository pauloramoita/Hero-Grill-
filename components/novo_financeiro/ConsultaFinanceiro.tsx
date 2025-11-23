
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getDailyTransactions, 
    getAppData, 
    getFinancialAccounts,
    getOrders,
    saveDailyTransaction, 
    deleteDailyTransaction,
    formatCurrency, 
    formatDateBr,
    getTodayLocalISO
} from '../../services/storageService';
import { AppData, DailyTransaction, FinancialAccount, User } from '../../types';
import { 
    CheckCircle, Trash2, Edit, Printer, Download, Filter, Calculator, Loader2,
    ArrowRight, ArrowLeft, Calendar, Plus, ArrowLeftRight, FileSpreadsheet,
    CheckSquare, Square, Layers, X
} from 'lucide-react';
import { EditLancamentoModal } from './EditLancamentoModal';
import { ConfirmPaymentModal } from './ConfirmPaymentModal';
import { NovoLancamentoModal } from './NovoLancamentoModal';
import { BatchPaymentModal } from './BatchPaymentModal';

interface ConsultaFinanceiroProps {
    user?: User;
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

export const ConsultaFinanceiro: React.FC<ConsultaFinanceiroProps> = ({ user }) => {
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<DailyTransaction[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [showNewModal, setShowNewModal] = useState(false);
    const [editingItem, setEditingItem] = useState<DailyTransaction | null>(null);
    const [confirmingItem, setConfirmingItem] = useState<DailyTransaction | null>(null);
    const [showBatchModal, setShowBatchModal] = useState(false);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filters with Persistence
    const [dateType, setDateType] = usePersistedState<'due' | 'payment' | 'created'>('hero_state_fin_list_dtype', 'due'); 
    const [startDate, setStartDate] = usePersistedState('hero_state_fin_list_start', getTodayLocalISO());
    const [endDate, setEndDate] = usePersistedState('hero_state_fin_list_end', getTodayLocalISO());
    
    const [filterStore, setFilterStore] = usePersistedState('hero_state_fin_list_store', '');
    const [filterAccount, setFilterAccount] = usePersistedState('hero_state_fin_list_account', '');
    const [filterCategory, setFilterCategory] = usePersistedState('hero_state_fin_list_category', '');
    const [filterSupplier, setFilterSupplier] = usePersistedState('hero_state_fin_list_supplier', '');
    const [filterStatus, setFilterStatus] = usePersistedState('hero_state_fin_list_status', ''); 
    const [filterClassification, setFilterClassification] = usePersistedState('hero_state_fin_list_class', '');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
        setSelectedIds(new Set());
    }, [transactions, startDate, endDate, filterStore, filterAccount, filterCategory, filterSupplier, filterStatus, dateType, filterClassification, user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [t, d, acc, o] = await Promise.all([
                getDailyTransactions(), 
                getAppData(),
                getFinancialAccounts(),
                getOrders()
            ]);

            const existingIds = new Set(t.map(item => item.id));
            const mappedOrders = o
                .filter(order => !existingIds.has(order.id))
                .map(order => ({
                    id: order.id,
                    date: order.deliveryDate || order.date, 
                    paymentDate: null,
                    store: order.store,
                    type: 'Despesa' as const, 
                    accountId: null,
                    destinationStore: undefined,
                    destinationAccountId: undefined,
                    paymentMethod: 'Boleto',
                    product: order.product,
                    category: order.category || '',
                    supplier: order.supplier,
                    classification: order.type || 'Variável',
                    value: order.totalValue,
                    status: 'Pendente' as const,
                    description: `Pedido ref. ${order.product}`,
                    origin: 'pedido' as const,
                    createdAt: order.createdAt || order.date 
                } as DailyTransaction));

            const merged = [...t, ...mappedOrders];

            setTransactions(merged);
            setAppData(d);
            setAccounts(acc);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };

    const availableStores = useMemo(() => {
        if (!user) return appData.stores;
        if (user.isMaster) return appData.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return appData.stores.filter(s => user.permissions.stores.includes(s));
        }
        return appData.stores;
    }, [appData.stores, user]);

    useEffect(() => {
        if (availableStores.length === 1) {
            setFilterStore(availableStores[0]);
        }
    }, [availableStores]);

    const applyFilters = () => {
        const result = transactions.filter(t => {
            let targetDate = t.date; 
            
            if (dateType === 'payment') {
                targetDate = t.paymentDate || '';
            } else if (dateType === 'created') {
                targetDate = t.createdAt ? t.createdAt.split('T')[0] : '';
            }
            
            if ((dateType === 'payment' || dateType === 'created') && !targetDate) return false;

            const matchesDate = targetDate >= startDate && targetDate <= endDate;
            const matchesStore = !filterStore || t.store === filterStore || (t.type === 'Transferência' && t.destinationStore === filterStore);
            const matchesCategory = !filterCategory || t.category === filterCategory;
            const matchesSupplier = !filterSupplier || t.supplier === filterSupplier;
            const matchesStatus = !filterStatus || t.status === filterStatus;
            const matchesClassification = !filterClassification || t.classification === filterClassification;
            
            let matchesAccount = true;
            if (filterAccount) {
                if (t.type === 'Transferência') {
                    matchesAccount = t.accountId === filterAccount || t.destinationAccountId === filterAccount;
                } else {
                    matchesAccount = t.accountId === filterAccount;
                }
            }

            let allowed = true;
            if (user && !user.isMaster && user.permissions.stores && user.permissions.stores.length > 0) {
                 allowed = user.permissions.stores.includes(t.store) || 
                           (t.type === 'Transferência' && !!t.destinationStore && user.permissions.stores.includes(t.destinationStore));
            }

            return matchesDate && matchesStore && matchesCategory && matchesSupplier && matchesAccount && matchesStatus && matchesClassification && allowed;
        });

        result.sort((a, b) => {
            if (dateType === 'created') {
                 const dateA = a.createdAt || '';
                 const dateB = b.createdAt || '';
                 return dateB.localeCompare(dateA);
            }
            if (dateType === 'payment') {
                const dateA = a.paymentDate || '';
                const dateB = b.paymentDate || '';
                return dateB.localeCompare(dateA);
            }
            if (a.status === 'Pendente' && b.status === 'Pago') return -1;
            if (a.status === 'Pago' && b.status === 'Pendente') return 1;
            return a.date.localeCompare(b.date);
        });

        setFilteredTransactions(result);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        const pendingInView = filteredTransactions.filter(t => t.status === 'Pendente').map(t => t.id);
        if (pendingInView.every(id => selectedIds.has(id)) && pendingInView.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(pendingInView));
        }
    };

    const getSelectedTransactions = () => filteredTransactions.filter(t => selectedIds.has(t.id));

    const handleBatchConfirm = async (details: { accountId: string, paymentMethod: string, paymentDate: string }) => {
        const itemsToPay = getSelectedTransactions();
        try {
            await Promise.all(itemsToPay.map(t => {
                const updated: DailyTransaction = {
                    ...t,
                    accountId: details.accountId,
                    paymentMethod: details.paymentMethod,
                    paymentDate: details.paymentDate,
                    status: 'Pago',
                    origin: t.origin || 'manual'
                };
                return saveDailyTransaction(updated);
            }));
            alert(`${itemsToPay.length} lançamentos pagos com sucesso!`);
            setShowBatchModal(false);
            setSelectedIds(new Set());
            loadData();
        } catch (e: any) {
            alert('Erro: ' + e.message);
        }
    };

    // Calculate Summary
    const summary = useMemo(() => {
        let initialSum = 0;
        const relevantAccounts = accounts.filter(a => !filterStore || a.store === filterStore);
        if (filterAccount) {
             const acc = accounts.find(a => a.id === filterAccount);
             if (acc) initialSum = acc.initialBalance;
        } else {
             initialSum = relevantAccounts.reduce((acc, a) => acc + a.initialBalance, 0);
        }

        let accumulatedDelta = 0;
        let periodRevenues = 0;
        let periodExpenses = 0;

        transactions.forEach(t => {
            const matchesStore = !filterStore || t.store === filterStore || (t.type === 'Transferência' && t.destinationStore === filterStore);
            let matchesAccount = true;
            if (filterAccount) {
                matchesAccount = t.type === 'Transferência' ? (t.accountId === filterAccount || t.destinationAccountId === filterAccount) : (t.accountId === filterAccount);
            }
            
            let allowed = true;
            if (user && !user.isMaster && user.permissions.stores && user.permissions.stores.length > 0) {
                 allowed = user.permissions.stores.includes(t.store) || (t.type === 'Transferência' && !!t.destinationStore && user.permissions.stores.includes(t.destinationStore));
            }

            if (!matchesStore || !matchesAccount || !allowed) return;
            if (t.status !== 'Pago') return; 

            const tDate = dateType === 'payment' ? (t.paymentDate || t.date) : t.date;
            
            if (tDate < startDate) {
                if (t.type === 'Receita') accumulatedDelta += t.value;
                else if (t.type === 'Despesa') accumulatedDelta -= t.value;
                else if (t.type === 'Transferência') {
                    if (filterAccount) {
                        if (t.accountId === filterAccount) accumulatedDelta -= t.value; 
                        if (t.destinationAccountId === filterAccount) accumulatedDelta += t.value; 
                    } else if (filterStore) {
                         if (t.store === filterStore && t.destinationStore !== filterStore) accumulatedDelta -= t.value;
                         if (t.store !== filterStore && t.destinationStore === filterStore) accumulatedDelta += t.value;
                    }
                }
            } else if (tDate <= endDate) {
                if (t.type === 'Receita') periodRevenues += t.value;
                else if (t.type === 'Despesa') periodExpenses += t.value;
            }
        });

        const prevBalance = initialSum + accumulatedDelta;
        return { prevBalance, revenues: periodRevenues, expenses: periodExpenses, finalBalance: prevBalance + periodRevenues - periodExpenses };
    }, [transactions, accounts, startDate, endDate, filterStore, filterAccount, dateType, user]);

    const handlePay = async (t: DailyTransaction) => {
        if (!t.accountId || !t.paymentMethod || t.paymentMethod === '-') {
            setConfirmingItem(t);
            return;
        }
        if (window.confirm(`Confirmar pagamento de ${formatCurrency(t.value)}?`)) {
            await saveDailyTransaction({ ...t, status: 'Pago', paymentDate: getTodayLocalISO() });
            loadData(); 
        }
    };

    const handlePaymentConfirmed = async (updated: DailyTransaction) => {
        await saveDailyTransaction(updated);
        setConfirmingItem(null);
        loadData();
    };

    const handleModalSave = async (updated: DailyTransaction) => {
        try {
            await saveDailyTransaction(updated);
            setEditingItem(null);
            loadData();
        } catch (e: any) {
            alert('Erro ao salvar: ' + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Excluir lançamento?')) {
            await deleteDailyTransaction(id);
            setTransactions(prev => prev.filter(item => item.id !== id));
            if (selectedIds.has(id)) {
                const newSet = new Set(selectedIds);
                newSet.delete(id);
                setSelectedIds(newSet);
            }
        }
    };

    const getAccountName = (id: string | null) => accounts.find(a => a.id === id)?.name || '-';

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-heroRed" size={48} /></div>;

    const FilterSelect = ({ label, ...props }: any) => (
        <div className="group">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest group-focus-within:text-heroRed transition-colors">{label}</label>
            <div className="relative">
                <select className="w-full p-3 rounded-xl bg-slate-50 border-2 border-transparent outline-none font-bold text-sm text-slate-700 appearance-none focus:bg-white focus:border-heroRed focus:shadow-sm transition-all" {...props} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto pb-20 animate-fadeIn space-y-6">
            
            {/* Filters Panel */}
            <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100 no-print relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-50 pb-4 gap-4">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        <Filter size={20} className="text-heroRed"/> Filtros
                    </h3>
                    
                    <div className="flex bg-slate-50 rounded-xl p-1 gap-1">
                        {['due', 'payment', 'created'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setDateType(type as any)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${dateType === type ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {type === 'due' ? 'Vencimento' : type === 'payment' ? 'Pagamento' : 'Cadastro'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Início</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border-2 border-transparent font-bold text-sm text-slate-700 outline-none focus:bg-white focus:border-heroRed focus:shadow-sm transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Fim</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border-2 border-transparent font-bold text-sm text-slate-700 outline-none focus:bg-white focus:border-heroRed focus:shadow-sm transition-all" />
                    </div>
                    <FilterSelect label="Status" value={filterStatus} onChange={(e: any) => setFilterStatus(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Pago">Pago</option>
                    </FilterSelect>
                    <FilterSelect label="Loja" value={filterStore} onChange={(e: any) => { setFilterStore(e.target.value); setFilterAccount(''); }} disabled={availableStores.length === 1}>
                        {availableStores.length !== 1 && <option value="">Todas</option>}
                        {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                    </FilterSelect>
                    <FilterSelect label="Conta" value={filterAccount} onChange={(e: any) => setFilterAccount(e.target.value)}>
                        <option value="">Todas</option>
                        {accounts.filter(a => !filterStore || a.store === filterStore).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </FilterSelect>
                    <FilterSelect label="Fornecedor" value={filterSupplier} onChange={(e: any) => setFilterSupplier(e.target.value)}>
                        <option value="">Todos</option>
                        {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    </FilterSelect>
                    <FilterSelect label="Categoria" value={filterCategory} onChange={(e: any) => setFilterCategory(e.target.value)}>
                        <option value="">Todas</option>
                        {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </FilterSelect>
                    <FilterSelect label="Classificação" value={filterClassification} onChange={(e: any) => setFilterClassification(e.target.value)}>
                        <option value="">Todas</option>
                        {appData.types.map(t => <option key={t} value={t}>{t}</option>)}
                    </FilterSelect>
                </div>
                
                <div className="flex justify-end mt-6 pt-4 border-t border-slate-50">
                    <button 
                        onClick={() => {
                            setFilterStore(availableStores.length === 1 ? availableStores[0] : '');
                            setFilterAccount(''); setFilterCategory(''); setFilterSupplier(''); setFilterStatus(''); setFilterClassification('');
                            setStartDate(getTodayLocalISO()); setEndDate(getTodayLocalISO());
                        }}
                        className="text-xs font-bold text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <X size={14}/> Limpar Filtros
                    </button>
                </div>
            </div>

            {/* Actions & Summary Bar */}
            <div className="flex flex-col-reverse lg:flex-row justify-between items-end lg:items-center gap-6">
                
                {/* Left: Actions */}
                <div className="flex gap-3 w-full lg:w-auto no-print">
                    <button onClick={() => setShowNewModal(true)} className="bg-heroBlack text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2">
                        <Plus size={18}/> <span className="hidden sm:inline">Novo Lançamento</span>
                    </button>
                    <div className="h-10 w-px bg-slate-200 mx-1"></div>
                    <button onClick={() => { /* Export Logic */ }} className="bg-white text-slate-600 border border-slate-200 px-4 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <FileSpreadsheet size={18}/> Excel
                    </button>
                    <button onClick={() => window.print()} className="bg-white text-slate-600 border border-slate-200 px-4 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Printer size={18}/>
                    </button>
                </div>

                {/* Right: Summary Pills */}
                <div className="flex gap-4 overflow-x-auto pb-2 w-full lg:w-auto scrollbar-hide">
                    <div className="flex flex-col bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm min-w-[120px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Saldo Anterior</span>
                        <span className="font-mono font-bold text-slate-600">{formatCurrency(summary.prevBalance)}</span>
                    </div>
                    <div className="flex flex-col bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 min-w-[120px]">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Receitas</span>
                        <span className="font-mono font-bold text-emerald-700 text-lg">+{formatCurrency(summary.revenues)}</span>
                    </div>
                    <div className="flex flex-col bg-red-50 px-5 py-3 rounded-2xl border border-red-100 min-w-[120px]">
                        <span className="text-[10px] font-bold text-red-600 uppercase">Despesas</span>
                        <span className="font-mono font-bold text-red-700 text-lg">-{formatCurrency(summary.expenses)}</span>
                    </div>
                    <div className="flex flex-col bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-lg min-w-[140px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Saldo Final</span>
                        <span className="font-mono font-black text-xl tracking-tight">{formatCurrency(summary.finalBalance)}</span>
                    </div>
                </div>
            </div>

            {/* Batch Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-slideUp border border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 text-white p-1.5 rounded-full">
                            <CheckCircle size={16} fill="currentColor" className="text-slate-900" />
                        </div>
                        <span className="font-bold text-sm">{selectedIds.size} itens selecionados</span>
                    </div>
                    <button 
                        onClick={() => setShowBatchModal(true)}
                        className="bg-white text-slate-900 px-5 py-2 rounded-full text-xs font-black uppercase tracking-wide hover:bg-slate-200 transition-colors flex items-center gap-2"
                    >
                        <Layers size={14}/> Pagar em Lote
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-[2rem] shadow-card border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-5 text-center w-12">
                                    <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-800 transition-colors">
                                        <CheckSquare size={20}/>
                                    </button>
                                </th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Loja / Conta</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest no-print">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.map((t) => (
                                <tr key={t.id} className={`group transition-colors ${selectedIds.has(t.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}>
                                    <td className="px-4 py-4 text-center">
                                        <button 
                                            onClick={() => t.status === 'Pendente' && toggleSelection(t.id)}
                                            disabled={t.status === 'Pago'}
                                            className={`${t.status === 'Pago' ? 'opacity-20 cursor-default' : 'hover:scale-110 active:scale-95 transition-transform'} ${selectedIds.has(t.id) ? 'text-heroRed' : 'text-slate-300'}`}
                                        >
                                            {selectedIds.has(t.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">{formatDateBr(t.date)}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencimento</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800 line-clamp-1">{t.description || t.product || 'Sem descrição'}</span>
                                            {t.supplier && <span className="text-xs text-slate-500 font-medium">{t.supplier}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {t.type === 'Transferência' ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1 text-xs font-bold text-slate-600"><ArrowRight size={12} className="text-red-400"/> {t.store}</div>
                                                <div className="flex items-center gap-1 text-xs font-bold text-slate-600"><ArrowLeft size={12} className="text-green-400"/> {t.destinationStore}</div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">{t.store}</span>
                                                <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1">{getAccountName(t.accountId)}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                            {t.category || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-mono font-black text-sm ${t.type === 'Receita' ? 'text-emerald-600' : t.type === 'Despesa' ? 'text-red-600' : 'text-indigo-600'}`}>
                                            {t.type === 'Receita' ? '+' : t.type === 'Despesa' ? '-' : ''} {formatCurrency(t.value)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {t.status === 'Pago' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 tracking-wide">
                                                <CheckCircle size={12} /> Pago
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 tracking-wide">
                                                Pendente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center no-print">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {t.status === 'Pendente' && (
                                                <button onClick={() => handlePay(t)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Pagar">
                                                    <CheckCircle size={18}/>
                                                </button>
                                            )}
                                            <button onClick={() => setEditingItem(t)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Editar">
                                                <Edit size={18}/>
                                            </button>
                                            <button onClick={() => handleDelete(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Excluir">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-slate-400 font-medium italic">
                                        Nenhum lançamento encontrado para os filtros aplicados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {editingItem && <EditLancamentoModal transaction={editingItem} onClose={() => setEditingItem(null)} onSave={handleModalSave} />}
            {confirmingItem && <ConfirmPaymentModal transaction={confirmingItem} accounts={accounts} onClose={() => setConfirmingItem(null)} onConfirm={handlePaymentConfirmed} />}
            {showNewModal && <NovoLancamentoModal user={user} onClose={() => setShowNewModal(false)} onSave={() => { setShowNewModal(false); loadData(); }} />}
            {showBatchModal && <BatchPaymentModal transactions={getSelectedTransactions()} accounts={accounts} onClose={() => setShowBatchModal(false)} onConfirm={handleBatchConfirm} />}
        </div>
    );
};
