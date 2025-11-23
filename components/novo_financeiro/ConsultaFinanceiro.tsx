
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
    CheckCircle, 
    Trash2, 
    Edit, 
    Printer, 
    Download, 
    Filter, 
    Calculator,
    Loader2,
    ArrowRight,
    ArrowLeft,
    Calendar,
    Plus,
    ArrowLeftRight,
    Landmark,
    Wallet,
    Building2,
    EyeOff,
    FileSpreadsheet,
    RefreshCw,
    CheckSquare,
    Square,
    Layers
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
        setSelectedIds(new Set()); // Clear selection on filter change
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
            
            // Store Filter Logic (Enhanced for Transfers)
            const matchesStore = !filterStore || 
                                 t.store === filterStore || 
                                 (t.type === 'Transferência' && t.destinationStore === filterStore);

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

    // Selection Logic
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
            // Unselect all (only visible)
            setSelectedIds(new Set());
        } else {
            // Select all (only visible pending)
            setSelectedIds(new Set(pendingInView));
        }
    };

    // Batch Payment Logic
    const getSelectedTransactions = () => {
        return filteredTransactions.filter(t => selectedIds.has(t.id));
    };

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
            alert('Erro ao realizar pagamento em lote: ' + e.message);
        }
    };

    // Calculate Summary based on Selection
    const summary = useMemo(() => {
        // 1. Start with Initial Balances of relevant accounts
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
            // Check filters (Store, Account, Permissions)
            const matchesStore = !filterStore || t.store === filterStore || (t.type === 'Transferência' && t.destinationStore === filterStore);
            
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

            if (!matchesStore || !matchesAccount || !allowed) return;
            if (t.status !== 'Pago') return; // Only paid items affect the running balance

            // Date comparison
            const tDate = dateType === 'payment' ? (t.paymentDate || t.date) : t.date;
            
            if (tDate < startDate) {
                // Before period -> Affects Previous Balance
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
                // In period
                if (t.type === 'Receita') periodRevenues += t.value;
                else if (t.type === 'Despesa') periodExpenses += t.value;
            }
        });

        const prevBalance = initialSum + accumulatedDelta;
        const finalBalance = prevBalance + periodRevenues - periodExpenses;

        return { prevBalance, revenues: periodRevenues, expenses: periodExpenses, finalBalance };
    }, [transactions, accounts, startDate, endDate, filterStore, filterAccount, dateType, user]);

    const handlePay = async (t: DailyTransaction) => {
        const missingAccount = !t.accountId;
        const missingMethod = !t.paymentMethod || t.paymentMethod === '-';

        if (missingAccount || missingMethod) {
            setConfirmingItem(t);
            return;
        }

        if (window.confirm(`Confirmar pagamento de ${formatCurrency(t.value)} na data de hoje?`)) {
            const updated: DailyTransaction = {
                ...t,
                status: 'Pago',
                paymentDate: getTodayLocalISO()
            };
            await saveDailyTransaction(updated);
            setTransactions(prev => prev.map(item => item.id === t.id ? updated : item));
            loadData(); 
        }
    };

    const handlePaymentConfirmed = async (updated: DailyTransaction) => {
        await saveDailyTransaction(updated);
        setTransactions(prev => prev.map(item => item.id === updated.id ? updated : item));
        setConfirmingItem(null);
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Deseja realmente excluir este lançamento?')) {
            await deleteDailyTransaction(id);
            setTransactions(prev => prev.filter(item => item.id !== id));
            if (selectedIds.has(id)) {
                const newSet = new Set(selectedIds);
                newSet.delete(id);
                setSelectedIds(newSet);
            }
        }
    };

    const handleModalSave = async (updated: DailyTransaction) => {
        await saveDailyTransaction(updated);
        setEditingItem(null);
        loadData(); 
    };

    const handleNewTransactionSave = () => {
        setShowNewModal(false);
        loadData();
    }

    const handleExport = () => {
        let xmlContent = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Financeiro"><Table>';
        xmlContent += '<Row>';
        ['Cadastro', 'Data Vencimento', 'Data Pagamento', 'Loja', 'Tipo', 'Descrição', 'Conta', 'Categoria', 'Fornecedor', 'Valor', 'Status'].forEach(h => {
            xmlContent += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
        });
        xmlContent += '</Row>';

        filteredTransactions.forEach(t => {
            xmlContent += '<Row>';
            xmlContent += `<Cell><Data ss:Type="String">${t.createdAt ? formatDateBr(t.createdAt.split('T')[0]) : '-'}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${formatDateBr(t.date)}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.paymentDate ? formatDateBr(t.paymentDate) : '-'}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.store}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.type}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.description || ''}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${getAccountName(t.accountId)}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.category || ''}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.supplier || ''}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="Number">${t.value}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.status}</Data></Cell>`;
            xmlContent += '</Row>';
        });

        xmlContent += '</Table></Worksheet></Workbook>';
        const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'relatorio_financeiro_completo.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getAccountName = (id: string | null) => accounts.find(a => a.id === id)?.name || '-';

    if (loading) return <Loader2 className="animate-spin mx-auto mt-10" />;

    const filterInputClass = "w-full border border-slate-200 p-2 rounded text-sm focus:ring-2 focus:ring-heroRed/10 focus:border-heroRed outline-none bg-slate-50";
    const labelClass = "block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide";

    const selectedTotal = getSelectedTransactions().reduce((acc, t) => acc + t.value, 0);

    return (
        <div className="space-y-4 animate-fadeIn pb-20">
            {/* Filters Panel */}
            <div className="bg-white p-5 rounded-xl shadow-card border border-slate-200 no-print">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-slate-400"/>
                        <h3 className="font-bold text-slate-700">Filtros de Pesquisa</h3>
                    </div>
                    <div className="flex gap-4 text-xs items-center">
                        <span className="font-bold text-slate-500 uppercase">Referência de Data:</span>
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setDateType('due')} className={`px-3 py-1 rounded-md font-bold transition-all ${dateType === 'due' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Data de Vencimento</button>
                            <button onClick={() => setDateType('payment')} className={`px-3 py-1 rounded-md font-bold transition-all ${dateType === 'payment' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Data do Pagamento</button>
                            <button onClick={() => setDateType('created')} className={`px-3 py-1 rounded-md font-bold transition-all ${dateType === 'created' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Data de Cadastro</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className={labelClass}>Data Início</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={filterInputClass}/>
                    </div>
                    <div>
                        <label className={labelClass}>Data Fim</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={filterInputClass}/>
                    </div>
                    <div>
                        <label className={labelClass}>Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={filterInputClass}>
                            <option value="">Todos</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Loja (Origem/Destino)</label>
                        <select 
                            value={filterStore} 
                            onChange={e => {
                                setFilterStore(e.target.value);
                                setFilterAccount(''); // Reset account filter on store change
                            }} 
                            className={`${filterInputClass} ${availableStores.length === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                            disabled={availableStores.length === 1}
                        >
                            {availableStores.length !== 1 && <option value="">Todas</option>}
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Conta</label>
                        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className={filterInputClass}>
                            <option value="">Todas</option>
                            {accounts
                                .filter(a => !filterStore || a.store === filterStore)
                                .map(a => <option key={a.id} value={a.id}>{a.name} ({a.store})</option>)
                            }
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Fornecedor</label>
                        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className={filterInputClass}>
                            <option value="">Todos</option>
                            {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Categoria</label>
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={filterInputClass}>
                            <option value="">Todos</option>
                            {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Classificação</label>
                        <select value={filterClassification} onChange={e => setFilterClassification(e.target.value)} className={filterInputClass}>
                            <option value="">Todos</option>
                            {appData.types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="flex justify-end mt-2 pt-2 border-t border-slate-100">
                    <button 
                        onClick={() => {
                            setFilterStore(availableStores.length === 1 ? availableStores[0] : '');
                            setFilterAccount('');
                            setFilterCategory('');
                            setFilterSupplier('');
                            setFilterStatus('');
                            setFilterClassification('');
                            setStartDate(getTodayLocalISO());
                            setEndDate(getTodayLocalISO());
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                    >
                        <Filter size={12}/> Limpar Filtros
                    </button>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                <button 
                    onClick={() => setShowNewModal(true)}
                    className="bg-heroBlack text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={20}/> Novo Lançamento
                </button>

                <div className="flex gap-2">
                    <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 font-bold shadow-sm text-sm">
                        <FileSpreadsheet size={18}/> Exportar Excel
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-sm text-sm">
                        <Printer size={18}/> Imprimir
                    </button>
                </div>
            </div>

            {/* Summary Panel & Batch Actions */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm no-print relative overflow-hidden">
                
                {/* Title */}
                <div className="flex items-center gap-3 z-10">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Calculator size={20} />
                    </div>
                    <span className="font-bold text-blue-900 text-sm uppercase tracking-wide">Resumo da Seleção:</span>
                </div>

                {/* Batch Selection Active - Overlay Effect */}
                {selectedIds.size > 0 && (
                    <div className="absolute inset-0 bg-white/90 z-20 flex items-center justify-between px-6 animate-fadeIn border-2 border-green-200 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-2 rounded-full text-green-600">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <span className="block text-sm font-bold text-green-800">{selectedIds.size} itens selecionados</span>
                                <span className="block text-xs text-green-600 font-bold">Total: {formatCurrency(selectedTotal)}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowBatchModal(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Layers size={18} /> PAGAR SELECIONADOS
                        </button>
                    </div>
                )}

                {/* Default Summary */}
                <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm w-full md:w-auto z-10">
                    <div className="text-center md:text-right">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Saldo Anterior</span>
                        <span className="font-mono font-bold text-slate-600">{formatCurrency(summary.prevBalance)}</span>
                    </div>
                    <div className="text-center md:text-right">
                        <span className="block text-[10px] font-bold text-green-600 uppercase">Receitas</span>
                        <span className="font-mono font-bold text-green-600">+ {formatCurrency(summary.revenues)}</span>
                    </div>
                    <div className="text-center md:text-right">
                        <span className="block text-[10px] font-bold text-red-600 uppercase">Despesas</span>
                        <span className="font-mono font-bold text-red-600">- {formatCurrency(summary.expenses)}</span>
                    </div>
                    <div className="pl-4 md:border-l border-blue-200 text-center md:text-right bg-white md:bg-transparent p-2 md:p-0 rounded shadow-sm md:shadow-none">
                        <span className="block text-[10px] font-black text-blue-700 uppercase">Saldo Final</span>
                        <span className="font-mono font-black text-lg text-blue-800">{formatCurrency(summary.finalBalance)}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-3 py-4 text-center no-print w-10">
                                    <button 
                                        onClick={handleSelectAll} 
                                        className="text-slate-400 hover:text-heroBlack transition-colors"
                                        title="Selecionar Todos Pendentes Visíveis"
                                    >
                                        <CheckSquare size={18} />
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cadastro</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Loja</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição / Detalhes</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Conta</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider no-print">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {filteredTransactions.map((t) => (
                                <tr key={t.id} className={`transition-colors group ${selectedIds.has(t.id) ? 'bg-blue-50' : 'hover:bg-slate-50/80'}`}>
                                    <td className="px-3 py-4 text-center no-print">
                                        <button 
                                            onClick={() => t.status === 'Pendente' && toggleSelection(t.id)} 
                                            className={`transition-colors ${t.status === 'Pago' ? 'text-slate-200 cursor-not-allowed' : selectedIds.has(t.id) ? 'text-heroRed' : 'text-slate-300 hover:text-slate-500'}`}
                                            disabled={t.status === 'Pago'}
                                        >
                                            {selectedIds.has(t.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-400 font-mono flex items-center gap-1">
                                        <Calendar size={12}/>
                                        {t.createdAt ? formatDateBr(t.createdAt.split('T')[0]).slice(0, 5) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                        {formatDateBr(t.date)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {t.type === 'Transferência' ? (
                                            <div className="flex flex-col text-xs">
                                                <span className="text-red-500 font-bold flex items-center gap-1"><ArrowRight size={10}/> {t.store}</span>
                                                <span className="text-green-600 font-bold flex items-center gap-1"><ArrowLeft size={10}/> {t.destinationStore}</span>
                                            </div>
                                        ) : (
                                            t.store
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800">{t.description || t.product || 'Sem descrição'}</span>
                                            <span className="text-xs text-slate-400">{t.supplier}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {t.type === 'Transferência' ? (
                                            <div className="flex items-center gap-1 text-purple-600 font-bold text-xs bg-purple-50 px-2 py-1 rounded-full w-fit">
                                                <ArrowLeftRight size={12}/> Transferência
                                            </div>
                                        ) : (
                                            getAccountName(t.accountId)
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm text-slate-600">{t.category || '-'}</span>
                                            {t.classification && <span className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 w-fit text-slate-400">{t.classification}</span>}
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${t.type === 'Receita' ? 'text-green-600' : t.type === 'Despesa' ? 'text-red-600' : 'text-purple-600'}`}>
                                        {t.type === 'Receita' ? '+' : t.type === 'Despesa' ? '-' : ''}
                                        {formatCurrency(t.value)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {t.status === 'Pago' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                                <CheckCircle size={12}/> PAGO
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                                PENDENTE
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center no-print">
                                        <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {t.status === 'Pendente' && (
                                                <button onClick={() => handlePay(t)} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="Pagar">
                                                    <CheckCircle size={18}/>
                                                </button>
                                            )}
                                            <button onClick={() => setEditingItem(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                                <Edit size={18}/>
                                            </button>
                                            <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Excluir">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400 italic">Nenhum lançamento encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingItem && (
                <EditLancamentoModal 
                    transaction={editingItem} 
                    onClose={() => setEditingItem(null)} 
                    onSave={handleModalSave} 
                />
            )}

            {confirmingItem && (
                <ConfirmPaymentModal 
                    transaction={confirmingItem}
                    accounts={accounts}
                    onClose={() => setConfirmingItem(null)}
                    onConfirm={handlePaymentConfirmed}
                />
            )}

            {showNewModal && (
                <NovoLancamentoModal 
                    user={user}
                    onClose={() => setShowNewModal(false)}
                    onSave={handleNewTransactionSave}
                />
            )}

            {showBatchModal && (
                <BatchPaymentModal 
                    transactions={getSelectedTransactions()}
                    accounts={accounts}
                    onClose={() => setShowBatchModal(false)}
                    onConfirm={handleBatchConfirm}
                />
            )}
        </div>
    );
};
