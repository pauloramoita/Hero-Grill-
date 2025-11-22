
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
    EyeOff
} from 'lucide-react';
import { EditLancamentoModal } from './EditLancamentoModal';
import { ConfirmPaymentModal } from './ConfirmPaymentModal';
import { NovoLancamentoModal } from './NovoLancamentoModal';

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

    const canViewBalances = user?.isMaster || (user?.permissions?.modules && user.permissions.modules.includes('view_balances'));

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
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

    const setDateRange = (type: 'hoje' | 'semana' | 'mes' | 'ano') => {
        const today = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        if (type === 'hoje') {
            const str = formatDate(today);
            setStartDate(str);
            setEndDate(str);
        } else if (type === 'semana') {
            const day = today.getDay();
            const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(today.setDate(diffToMon));
            const sunday = new Date(today.setDate(monday.getDate() + 6));
            setStartDate(formatDate(monday));
            setEndDate(formatDate(sunday));
        } else if (type === 'mes') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            setStartDate(formatDate(firstDay));
            setEndDate(formatDate(lastDay));
        } else if (type === 'ano') {
            const firstDay = new Date(today.getFullYear(), 0, 1);
            const lastDay = new Date(today.getFullYear(), 11, 31);
            setStartDate(formatDate(firstDay));
            setEndDate(formatDate(lastDay));
        }
    };

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
            // Optimistic update
            setTransactions(prev => prev.map(item => item.id === t.id ? updated : item));
            loadData(); // Reload to ensure IDs are correct if it was a converted order
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

    const getAccountName = (id: string | null | undefined) => {
        if (!id) return '-';
        return accounts.find(a => a.id === id)?.name || 'Conta Removida';
    };

    const clearFilters = () => {
        if (availableStores.length !== 1) {
             setFilterStore(''); 
        }
        setFilterAccount(''); 
        setFilterCategory(''); 
        setFilterSupplier(''); 
        setFilterStatus('');
        setFilterClassification('');
        setDateRange('hoje');
        setDateType('due');
    };

    // --- LÓGICA UNIFICADA DE SALDO (Same as Consulta) ---
    const getBalanceForAccount = (acc: FinancialAccount, dateLimit: string) => {
        let balance = acc.initialBalance;
        
        transactions.forEach(t => {
            if (t.status !== 'Pago' || t.date > dateLimit) return;

            if (filterSupplier && t.supplier !== filterSupplier) return;
            if (filterCategory && t.category !== filterCategory) return;
            if (filterClassification && t.classification !== filterClassification) return;
            
            const isDebit = t.accountId === acc.id;
            const isCredit = t.destinationAccountId === acc.id && t.type === 'Transferência';

            if (isDebit) {
                if (t.type === 'Despesa' || t.type === 'Transferência') balance -= t.value;
                if (t.type === 'Receita') balance += t.value;
            }
            
            if (isCredit) {
                balance += t.value;
            }
        });
        
        return balance;
    };

    // Wrapper for AutoPixModal (Gets balance up to TODAY, ignoring list filters)
    const getCurrentBalanceForModal = (accountId: string) => {
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) return 0;
        // Just calculate based on all transactions up to today, no extra filters
        let balance = acc.initialBalance;
        const todayLimit = getTodayLocalISO();
        transactions.forEach(t => {
            if (t.status !== 'Pago' || t.date > todayLimit) return;
            const isDebit = t.accountId === acc.id;
            const isCredit = t.destinationAccountId === acc.id && t.type === 'Transferência';
            if (isDebit) {
                if (t.type === 'Despesa' || t.type === 'Transferência') balance -= t.value;
                if (t.type === 'Receita') balance += t.value;
            }
            if (isCredit) balance += t.value;
        });
        return balance;
    };

    // --- SALDOS EM TEMPO REAL (Cartões) ---
    const accountsByStore = useMemo(() => {
        const groups: Record<string, { accounts: FinancialAccount[], totalBalance: number }> = {};
        
        accounts.forEach(acc => {
            if (filterStore && acc.store !== filterStore) return; 
            if (filterAccount && acc.id !== filterAccount) return;
            
            if (!groups[acc.store]) {
                groups[acc.store] = { accounts: [], totalBalance: 0 };
            }
            
            // Use endDate from filters as cut-off
            const currentBal = getBalanceForAccount(acc, endDate);
            
            groups[acc.store].accounts.push(acc);
            groups[acc.store].totalBalance += currentBal;
        });

        Object.values(groups).forEach(group => {
            group.accounts.sort((a, b) => a.name.localeCompare(b.name));
        });

        const customOrder = ['Hero Joquei', 'Hero Shopping', 'Hero Centro'];
        return Object.entries(groups).sort((a, b) => {
            const indexA = customOrder.indexOf(a[0]);
            const indexB = customOrder.indexOf(b[0]);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a[0].localeCompare(b[0]);
        });
    }, [accounts, transactions, filterStore, filterAccount, endDate, filterSupplier, filterCategory, filterClassification]);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" size={40}/></div>;

    const filteredList = filteredTransactions;
    
    // --- RESUMO DA SELEÇÃO ---
    const accountsInContext = accounts.filter(a => {
        if (filterAccount && a.id !== filterAccount) return false;
        if (filterStore && a.store !== filterStore) return false;
        if (availableStores.length > 0 && !user.isMaster && !availableStores.includes(a.store)) return false;
        return true;
    });

    const getYesterday = (d: string) => {
        const date = new Date(d);
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    };

    const previousBalance = accountsInContext.reduce((acc, a) => {
        return acc + getBalanceForAccount(a, getYesterday(startDate));
    }, 0);

    const finalBalance = accountsInContext.reduce((acc, a) => {
        return acc + getBalanceForAccount(a, endDate);
    }, 0);

    const totalReceitas = filteredList.reduce((acc, t) => {
        if (t.type === 'Receita') return acc + t.value;
        if (t.type === 'Transferência') {
            const isIncoming = (!filterStore && !filterAccount) || 
                               (filterStore && t.destinationStore === filterStore) ||
                               (filterAccount && t.destinationAccountId === filterAccount);
            if (isIncoming) return acc + t.value;
        }
        return acc;
    }, 0);

    const totalDespesas = filteredList.reduce((acc, t) => {
        if (t.type === 'Despesa') return acc + t.value;
        if (t.type === 'Transferência') {
            const isOutgoing = (!filterStore && !filterAccount) || 
                               (filterStore && t.store === filterStore) ||
                               (filterAccount && t.accountId === filterAccount);
            if (isOutgoing) return acc + t.value;
        }
        return acc;
    }, 0);

    const isSingleStore = availableStores.length === 1;

    return (
        <div className="space-y-6">
            {canViewBalances ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-heroRed p-1.5 rounded-md text-white">
                            <Wallet size={18} />
                        </div>
                        <h3 className="font-bold text-lg text-slate-700">Saldos em Tempo Real (Até {formatDateBr(endDate)})</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {accountsByStore.map(([storeName, data]) => (
                            <div key={storeName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
                                <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={18} className="text-slate-400" />
                                        <span className="font-bold text-slate-700 truncate max-w-[150px]" title={storeName}>{storeName}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Loja</span>
                                        <span className={`text-lg font-black ${data.totalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatCurrency(data.totalBalance)}
                                        </span>
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {data.accounts.map(acc => {
                                        const bal = getBalanceForAccount(acc, endDate);
                                        return (
                                            <div key={acc.id} className="flex justify-between items-center px-5 py-3 hover:bg-slate-50 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${bal >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                                                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{acc.name}</span>
                                                </div>
                                                <span className={`text-sm font-bold font-mono ${bal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {formatCurrency(bal)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {data.accounts.length === 0 && (
                                        <div className="p-4 text-center text-xs text-slate-400 italic">Nenhuma conta encontrada.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {accountsByStore.length === 0 && (
                            <div className="col-span-full text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400">
                                <Wallet size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>Nenhuma conta encontrada para os filtros selecionados.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-gray-100 border border-gray-200 rounded p-4 flex items-center justify-center gap-2 text-gray-500">
                    <EyeOff size={20} />
                    <span className="text-sm font-bold">Visualização de saldos restrita ao Gerente/Administrador.</span>
                </div>
            )}

            {/* Filters and List */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 no-print">
                {/* ... Filter Controls (Same as before) ... */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4">
                    <div className="flex gap-2">
                        <button onClick={() => setDateRange('hoje')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold uppercase text-gray-700">Hoje</button>
                        <button onClick={() => setDateRange('semana')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold uppercase text-gray-700">Esta Semana</button>
                        <button onClick={() => setDateRange('mes')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold uppercase text-gray-700">Este Mês</button>
                        <button onClick={() => setDateRange('ano')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold uppercase text-gray-700">Este Ano</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Referência de Data:</span>
                        <select 
                            value={dateType} 
                            onChange={e => setDateType(e.target.value as any)} 
                            className={`border p-2 rounded text-sm font-bold uppercase cursor-pointer ${dateType === 'payment' ? 'bg-blue-50 border-blue-300 text-blue-800' : dateType === 'created' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-yellow-50 border-yellow-300 text-yellow-800'}`}
                        >
                            <option value="due">Data de Vencimento</option>
                            <option value="payment">Data de Pagamento</option>
                            <option value="created">Data de Cadastro</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Início</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Fim</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full border p-2 rounded text-sm font-bold bg-gray-50">
                            <option value="">Todos</option>
                            <option value="Pago">Apenas Pagos</option>
                            <option value="Pendente">Apenas Pendentes</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Loja (Origem/Destino)</label>
                        <select 
                            value={filterStore} 
                            onChange={e => setFilterStore(e.target.value)} 
                            className={`w-full border p-2 rounded text-sm ${isSingleStore ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            disabled={isSingleStore}
                        >
                            {!isSingleStore && <option value="">Todas</option>}
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Conta</label>
                        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-full border p-2 rounded text-sm">
                            <option value="">Todas</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.store})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Fornecedor</label>
                        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-full border p-2 rounded text-sm">
                            <option value="">Todos</option>
                            {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Categoria</label>
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full border p-2 rounded text-sm">
                            <option value="">Todas</option>
                            {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Classificação</label>
                        <select value={filterClassification} onChange={e => setFilterClassification(e.target.value)} className="w-full border p-2 rounded text-sm">
                            <option value="">Todas</option>
                            {appData.types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500 font-bold flex items-center gap-1 mb-2">
                            <Filter size={12}/> Limpar Filtros
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center border-t pt-4 mt-4">
                    <div>
                        <button 
                            onClick={() => setShowNewModal(true)}
                            className="bg-heroBlack text-white px-6 py-2 rounded font-bold hover:bg-slate-800 flex items-center gap-2 shadow-lg transition-all active:scale-95"
                        >
                            <Plus size={20}/> Novo Lançamento
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 shadow-sm">
                            <Download size={18}/> Exportar Excel
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm">
                            <Printer size={18}/> Imprimir
                        </button>
                    </div>
                </div>
            </div>

            {/* Totals Banner */}
            <div className="bg-blue-50 p-4 border-b border-blue-100 flex flex-wrap gap-6 justify-between items-center text-sm rounded-lg shadow-sm border">
                <div className="flex items-center gap-2">
                    <Calculator size={20} className="text-blue-600"/>
                    <span className="font-bold text-gray-600">RESUMO DA SELEÇÃO:</span>
                </div>
                <div className="flex gap-6 md:gap-8 flex-wrap justify-end">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Saldo Anterior</span>
                        <span className="font-bold text-gray-600 font-mono text-lg">{formatCurrency(previousBalance)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-green-600 uppercase">Receitas</span>
                        <span className="font-bold text-green-700 font-mono">{formatCurrency(totalReceitas)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-red-600 uppercase">Despesas</span>
                        <span className="font-bold text-red-700 font-mono">{formatCurrency(totalDespesas)}</span>
                    </div>
                    <div className="flex flex-col items-end border-l pl-6 border-blue-200 bg-white/50 p-1 rounded">
                        <span className="text-xs font-black text-blue-800 uppercase flex items-center gap-1"><Landmark size={12}/> Saldo Final</span>
                        <span className={`font-black text-xl font-mono ${finalBalance >= 0 ? 'text-blue-800' : 'text-red-600'}`}>{formatCurrency(finalBalance)}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Cadastro</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Vencimento</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Loja</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Descrição / Detalhes</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Conta</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Categoria</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Valor</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase no-print">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTransactions.map((t) => {
                            const isIncoming = t.type === 'Transferência' && filterStore && t.destinationStore === filterStore;
                            const valueColor = t.type === 'Receita' || isIncoming ? 'text-green-600' : t.type === 'Transferência' ? 'text-purple-600' : 'text-red-600';
                            
                            return (
                                <tr key={t.id} className={`hover:bg-gray-50 break-inside-avoid ${t.origin === 'pedido' ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} className="text-gray-300"/>
                                            {t.createdAt ? formatDateBr(t.createdAt.split('T')[0]) : '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                        {formatDateBr(t.date)}
                                        {t.paymentDate && dateType !== 'due' && (
                                            <div className="text-[10px] text-green-600 font-bold">Pg: {formatDateBr(t.paymentDate)}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {isIncoming ? (
                                            <span className="font-bold text-green-700">{t.destinationStore}</span>
                                        ) : (
                                            t.store
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {t.type === 'Transferência' ? (
                                            <div className="flex items-center gap-1 font-bold">
                                                {isIncoming ? (
                                                    <div className="flex items-center gap-1 text-green-700">
                                                        <ArrowLeft size={12}/> Recebido de {t.store}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-purple-700">
                                                        <ArrowRight size={12}/> Enviado para {t.destinationStore}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-bold text-gray-700">{t.description || t.supplier}</div>
                                                {t.product && <div className="text-xs text-gray-500">{t.product}</div>}
                                            </>
                                        )}
                                        {t.origin === 'pedido' && <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-bold border border-blue-200">PEDIDO</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {t.type === 'Transferência' ? (
                                            <div className="flex flex-col text-xs">
                                                <span className="text-red-500">De: {getAccountName(t.accountId)}</span>
                                                <span className="text-green-500">Para: {getAccountName(t.destinationAccountId)}</span>
                                            </div>
                                        ) : (
                                            <span className={!t.accountId ? 'text-red-400 italic font-bold text-xs' : 'text-gray-600'}>
                                                {getAccountName(t.accountId) || 'Definir Conta'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {t.category || '-'}
                                        {t.classification && <div className="text-[10px] text-gray-400 border px-1 rounded w-fit mt-1">{t.classification}</div>}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold font-mono text-sm ${valueColor}`}>
                                        {t.type === 'Receita' || isIncoming ? '+' : t.type === 'Transferência' ? '-' : '-'}{formatCurrency(t.value)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {t.status === 'Pago' ? (
                                            <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-1"><CheckCircle size={14}/> PAGO</span>
                                        ) : (
                                            <span className="text-yellow-600 font-bold text-xs bg-yellow-100 px-2 py-1 rounded border border-yellow-200">PENDENTE</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap no-print">
                                        <div className="flex items-center justify-center gap-2">
                                            {t.status === 'Pendente' && (
                                                <button onClick={() => handlePay(t)} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Confirmar Pagamento">
                                                    <CheckCircle size={18}/>
                                                </button>
                                            )}
                                            <button onClick={() => setEditingItem(t)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Editar">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Excluir">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                                    Nenhum registro encontrado para os filtros selecionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showNewModal && (
                <NovoLancamentoModal 
                    user={user}
                    onClose={() => setShowNewModal(false)} 
                    onSave={handleNewTransactionSave} 
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

            {editingItem && (
                <EditLancamentoModal 
                    transaction={editingItem} 
                    onClose={() => setEditingItem(null)} 
                    onSave={handleModalSave} 
                />
            )}
        </div>
    );
};
