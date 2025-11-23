
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getAppData, 
    getFinancialAccounts, 
    getDailyTransactions, 
    saveDailyTransaction, 
    deleteDailyTransaction, 
    formatCurrency, 
    formatDateBr,
    getOrders,
    getTodayLocalISO
} from '../../services/storageService';
import { AppData, FinancialAccount, DailyTransaction, Order, User } from '../../types';
import { CheckCircle, Trash2, Loader2, Search, Edit, DollarSign, EyeOff, Filter, Calculator, ArrowRight, Repeat, CalendarClock, Building2, Wallet, TrendingUp, TrendingDown, ArrowLeft, Landmark, Plus, Wand2, Download, Printer, X, PieChart } from 'lucide-react';
import { EditLancamentoModal } from './EditLancamentoModal';
import { ConfirmPaymentModal } from './ConfirmPaymentModal';
import { NovoLancamentoModal } from './NovoLancamentoModal';
import { BatchPaymentModal } from './BatchPaymentModal';
import { AutoPixModal } from './AutoPixModal';

interface LancamentosFinanceiroProps {
    user: User;
}

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

export const LancamentosFinanceiro: React.FC<LancamentosFinanceiroProps> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<DailyTransaction[]>([]);

    // Form
    const [date, setDate] = usePersistedState('hero_state_fin_date', getTodayLocalISO()); 
    const [paymentDate, setPaymentDate] = usePersistedState('hero_state_fin_paymentdate', getTodayLocalISO()); 
    const [store, setStore] = usePersistedState('hero_state_fin_store', '');
    const [type, setType] = usePersistedState<'Receita' | 'Despesa' | 'Transferência'>('hero_state_fin_type', 'Despesa'); 
    const [accountId, setAccountId] = usePersistedState('hero_state_fin_account', '');
    
    const [destinationStore, setDestinationStore] = usePersistedState('hero_state_fin_dest_store', '');
    const [destinationAccountId, setDestinationAccountId] = usePersistedState('hero_state_fin_dest_account', '');

    const [paymentMethod, setPaymentMethod] = usePersistedState('hero_state_fin_method', 'Boleto'); 
    const [product, setProduct] = usePersistedState('hero_state_fin_product', '');
    const [category, setCategory] = usePersistedState('hero_state_fin_category', '');
    const [classification, setClassification] = usePersistedState('hero_state_fin_classification', 'Variável'); 
    const [supplier, setSupplier] = usePersistedState('hero_state_fin_supplier', '');
    const [value, setValue] = usePersistedState<number>('hero_state_fin_value', 0);
    const [status, setStatus] = usePersistedState<'Pago' | 'Pendente'>('hero_state_fin_status', 'Pendente');
    const [description, setDescription] = usePersistedState('hero_state_fin_description', ''); 

    const [recurrenceType, setRecurrenceType] = usePersistedState<'none' | 'installment' | 'fixed'>('hero_state_fin_recurrence', 'none');
    const [recurrenceCount, setRecurrenceCount] = usePersistedState<number>('hero_state_fin_rec_count', 2);

    const [editingItem, setEditingItem] = useState<DailyTransaction | null>(null);
    const [showAutoPixModal, setShowAutoPixModal] = useState(false);

    const [endDate, setEndDate] = usePersistedState('hero_state_fin_filter_end', getTodayLocalISO());
    
    const canViewBalances = user.isMaster || (user.permissions?.modules && user.permissions.modules.includes('view_balances'));

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [d, acc, t, o] = await Promise.all([
                getAppData(), 
                getFinancialAccounts(), 
                getDailyTransactions(),
                getOrders()
            ]);
            setAppData(d);
            setAccounts(acc);
            setTransactions(t);
            setOrders(o);
        } catch (error) {
            console.error("Error loading data", error);
        } finally {
            setLoading(false);
        }
    };

    const availableStores = useMemo(() => {
        if (user.isMaster) return appData.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return appData.stores.filter(s => user.permissions.stores.includes(s));
        }
        return appData.stores;
    }, [appData.stores, user]);

    useEffect(() => {
        if (availableStores.length === 1) {
            const singleStore = availableStores[0];
            if(!store) setStore(singleStore);
        }
    }, [availableStores, store]);

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setValue(floatValue);
    };

    const addMonths = (dateStr: string, months: number): string => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        dateObj.setMonth(dateObj.getMonth() + months);
        
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (type === 'Transferência') {
            if (!store || !accountId || !destinationStore || !destinationAccountId || value <= 0) {
                alert('Preencha Origem, Destino e Valor.');
                return;
            }
        } else {
             if (!store || !accountId || value <= 0) {
                alert('Preencha Loja, Conta e Valor.');
                return;
            }
        }

        if (recurrenceType !== 'none' && recurrenceCount < 2) {
            alert('Para repetição/parcelamento, a quantidade mínima é 2.');
            return;
        }

        setSaving(true);
        try {
            const transactionsToCreate = [];
            const loopCount = recurrenceType === 'none' ? 1 : recurrenceCount;

            for (let i = 0; i < loopCount; i++) {
                const currentDueDate = i === 0 ? date : addMonths(date, i);
                
                let currentDesc = description;
                if (recurrenceType === 'installment') {
                    currentDesc = description ? `${description} (${i + 1}/${loopCount})` : `Parcela (${i + 1}/${loopCount})`;
                }

                const currentStatus = i === 0 ? status : 'Pendente';
                const currentPaymentDate = (i === 0 && status === 'Pago') ? paymentDate : null;

                transactionsToCreate.push({
                    id: '',
                    date: currentDueDate,
                    paymentDate: currentPaymentDate,
                    store,
                    type,
                    accountId,
                    destinationStore: type === 'Transferência' ? destinationStore : undefined,
                    destinationAccountId: type === 'Transferência' ? destinationAccountId : undefined,
                    paymentMethod,
                    product: type !== 'Transferência' ? product : '',
                    category: type !== 'Transferência' ? category : '',
                    supplier: type !== 'Transferência' ? supplier : '',
                    classification: type !== 'Transferência' ? classification : '',
                    value,
                    status: currentStatus,
                    description: currentDesc,
                    origin: 'manual' as const
                });
            }

            await Promise.all(transactionsToCreate.map(t => saveDailyTransaction(t)));
            
            setValue(0);
            setProduct('');
            setDescription('');
            setRecurrenceType('none');
            setRecurrenceCount(2);
            
            alert(loopCount > 1 ? `${loopCount} Lançamentos Gerados com Sucesso!` : 'Lançamento Salvo!');
            loadData(); 
        } catch (err: any) {
            console.error(err);
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleModalSave = async (updated: DailyTransaction) => {
        try {
            await saveDailyTransaction(updated);
            setEditingItem(null);
            loadData();
        } catch (e: any) {
            alert('Erro ao salvar: ' + e.message);
        }
    }

    const handleAutoPixSave = async (t: DailyTransaction) => {
        try {
            await saveDailyTransaction(t);
            setShowAutoPixModal(false);
            loadData();
            alert('Lançamento Automático Realizado com Sucesso!');
        } catch (e: any) {
            alert('Erro ao salvar: ' + e.message);
        }
    }

    const getBalanceForAccount = (acc: FinancialAccount, dateLimit: string) => {
        let balance = acc.initialBalance;
        
        transactions.forEach(t => {
            if (t.status !== 'Pago' || t.date > dateLimit) return;
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

    const getCurrentBalanceForModal = (accountId: string) => {
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) return 0;
        return getBalanceForAccount(acc, getTodayLocalISO());
    };

    const dashboardData = useMemo(() => {
        const SPECIAL_ACCOUNT_NAME = 'Aplicação PangBank';
        const STORE_ORDER = ['Hero Joquei', 'Hero Shopping', 'Hero Centro'];

        const groups: Record<string, { accounts: FinancialAccount[], totalBalance: number }> = {};
        let specialAccountData: { account: FinancialAccount, balance: number } | null = null;

        accounts.forEach(acc => {
            const currentBal = getBalanceForAccount(acc, endDate);

            // Check for Special Account to separate
            if (acc.name.trim() === SPECIAL_ACCOUNT_NAME) {
                specialAccountData = {
                    account: acc,
                    balance: currentBal
                };
                return; // Skip adding to groups (and store totals)
            }

            if (!groups[acc.store]) groups[acc.store] = { accounts: [], totalBalance: 0 };
            groups[acc.store].accounts.push(acc);
            groups[acc.store].totalBalance += currentBal;
        });

        // Sort accounts alphabetically within stores
        Object.values(groups).forEach(group => {
            group.accounts.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Sort Stores according to specification
        const sortedStoreEntries = Object.entries(groups).sort((a, b) => {
            const storeA = a[0];
            const storeB = b[0];
            
            const indexA = STORE_ORDER.indexOf(storeA);
            const indexB = STORE_ORDER.indexOf(storeB);

            // If both found in priority list, sort by index
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            
            // If only A is found, A comes first
            if (indexA !== -1) return -1;
            
            // If only B is found, B comes first
            if (indexB !== -1) return 1;

            // Default alphabetical
            return storeA.localeCompare(storeB);
        });

        return { sortedStoreEntries, specialAccountData };
    }, [accounts, transactions, endDate]);

    if (loading) return <Loader2 className="animate-spin mx-auto mt-10" />;

    // UI Components
    const SelectField = ({ label, ...props }: any) => (
        <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
            <div className="relative">
                <select 
                    className={`w-full px-4 py-3.5 rounded-xl bg-slate-50 border-2 border-transparent font-bold text-slate-700 outline-none appearance-none focus:bg-white focus:border-heroRed focus:shadow-input-focus transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                    {...props}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
    );

    const InputField = ({ label, ...props }: any) => (
        <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
            <input 
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border-2 border-transparent font-bold text-slate-700 outline-none focus:bg-white focus:border-heroRed focus:shadow-input-focus transition-all"
                {...props}
            />
        </div>
    );

    const isSingleStore = availableStores.length === 1;

    return (
        <div className="space-y-12 pb-20 animate-fadeIn max-w-5xl mx-auto">
            
            {/* Balances Section */}
            {canViewBalances ? (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2 pl-1">
                        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-700 shadow-sm">
                            <Wallet size={20} />
                        </div>
                        <h3 className="font-black text-xl text-slate-800 tracking-tight">Saldos em Tempo Real</h3>
                    </div>
                    
                    {/* Highlighted Special Account */}
                    {dashboardData.specialAccountData && (
                        <div className="bg-gradient-to-br from-slate-800 to-black rounded-[2rem] shadow-floating overflow-hidden text-white relative group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <PieChart size={180} />
                            </div>
                            <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                                <div className="flex items-center gap-5">
                                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                                        <Landmark size={32} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-[0.2em] mb-2">Investimento</h4>
                                        <span className="text-2xl font-black leading-none">{dashboardData.specialAccountData.account.name}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-widest">Saldo Atual</span>
                                    <span className="text-4xl font-black text-white tracking-tight">
                                        {formatCurrency(dashboardData.specialAccountData.balance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Store Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {dashboardData.sortedStoreEntries.map(([storeName, data]) => (
                            <div key={storeName} className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden hover:shadow-card-hover transition-all duration-500 group">
                                <div className="bg-slate-50/50 px-6 py-5 border-b border-slate-50 flex justify-between items-center backdrop-blur-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400">
                                            <Building2 size={16} />
                                        </div>
                                        <span className="font-black text-slate-700 text-sm uppercase tracking-wide truncate max-w-[120px]" title={storeName}>{storeName}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-widest mb-0.5">Total</span>
                                        <span className={`text-lg font-black ${data.totalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatCurrency(data.totalBalance)}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2">
                                    {data.accounts.map(acc => {
                                        const bal = getBalanceForAccount(acc, endDate);
                                        return (
                                            <div key={acc.id} className="flex justify-between items-center px-4 py-3 rounded-2xl hover:bg-slate-50 transition-colors group/item">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${bal >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                                                    <span className="text-xs font-bold text-slate-500 group-hover/item:text-slate-800 transition-colors">{acc.name}</span>
                                                </div>
                                                <span className={`text-xs font-black font-mono ${bal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {formatCurrency(bal)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-slate-400 text-center">
                    <EyeOff size={32} className="opacity-50" />
                    <span className="text-sm font-bold uppercase tracking-wide">Saldos Ocultos para este perfil</span>
                </div>
            )}

            {/* Form */}
            <div className="relative">
                <div className="absolute -top-6 left-0 w-full flex justify-between items-end px-4 z-10 pointer-events-none">
                    <div className="pointer-events-auto">
                         {recurrenceType !== 'none' && (
                            <span className="bg-purple-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-fadeIn">
                                <Repeat size={12} /> Repetição Ativa
                            </span>
                        )}
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setShowAutoPixModal(true)}
                        className="pointer-events-auto bg-white text-purple-600 border-2 border-purple-100 px-5 py-2 rounded-full text-xs font-black hover:bg-purple-50 flex items-center gap-2 shadow-sm transform transition-all hover:-translate-y-1 active:scale-95"
                    >
                        <Wand2 size={14}/>
                        Pix Automático
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-8 shadow-floating border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-heroRed to-orange-500"></div>
                    
                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            Novo Lançamento
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Registre as movimentações financeiras</p>
                    </div>
                    
                    {/* Main Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <SelectField 
                            label="Tipo de Operação"
                            value={type} 
                            onChange={(e: any) => {
                                const newType = e.target.value as any;
                                setType(newType);
                                if (newType === 'Transferência') setPaymentMethod('Transferência bancária');
                            }}
                        >
                            <option value="Despesa">🔴 Despesa (Saída)</option>
                            <option value="Receita">🟢 Receita (Entrada)</option>
                            <option value="Transferência">🟣 Transferência</option>
                        </SelectField>

                         <InputField
                            label={`Valor ${recurrenceType === 'installment' ? 'da Parcela' : ''} (R$)`}
                            value={formatCurrency(value)}
                            onChange={handleCurrencyChange}
                            style={{ textAlign: 'right', color: '#0F172A', fontSize: '1.125rem' }}
                        />

                        <SelectField 
                            label="Método Pagamento"
                            value={paymentMethod} 
                            onChange={(e: any) => setPaymentMethod(e.target.value)}
                        >
                            <option value="Boleto">Boleto</option>
                            <option value="PiX">PiX</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Cartão">Cartão</option>
                            <option value="Transferência bancária">Transferência bancária</option>
                        </SelectField>
                    </div>

                    {/* Dynamic Context Section */}
                    <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100">
                        {type === 'Transferência' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4 relative">
                                    <span className="absolute -top-3 -left-2 bg-white px-2 text-[10px] font-black text-red-500 uppercase tracking-widest border rounded-md">Origem</span>
                                    <SelectField 
                                        label="Loja" 
                                        value={store} 
                                        onChange={(e: any) => setStore(e.target.value)} 
                                        disabled={isSingleStore}
                                    >
                                        <option value="">Selecione...</option>
                                        {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </SelectField>
                                    <SelectField 
                                        label="Conta" 
                                        value={accountId} 
                                        onChange={(e: any) => setAccountId(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {accounts.filter(a => !store || a.store === store).map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </SelectField>
                                </div>
                                <div className="space-y-4 relative">
                                    <span className="absolute -top-3 -left-2 bg-white px-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest border rounded-md">Destino</span>
                                    <SelectField 
                                        label="Loja" 
                                        value={destinationStore} 
                                        onChange={(e: any) => setDestinationStore(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </SelectField>
                                    <SelectField 
                                        label="Conta" 
                                        value={destinationAccountId} 
                                        onChange={(e: any) => setDestinationAccountId(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {accounts.filter(a => !destinationStore || a.store === destinationStore).map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </SelectField>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField 
                                    label="Loja" 
                                    value={store} 
                                    onChange={(e: any) => setStore(e.target.value)} 
                                    disabled={isSingleStore}
                                >
                                    <option value="">Selecione...</option>
                                    {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                                </SelectField>
                                <SelectField 
                                    label="Conta" 
                                    value={accountId} 
                                    onChange={(e: any) => setAccountId(e.target.value)}
                                >
                                    <option value="">Selecione a Conta...</option>
                                    {accounts.filter(a => !store || a.store === store).map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </SelectField>
                                <SelectField 
                                    label="Classificação" 
                                    value={classification} 
                                    onChange={(e: any) => setClassification(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {appData.types.map(t => <option key={t} value={t}>{t}</option>)}
                                </SelectField>
                                
                                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SelectField 
                                        label="Categoria" 
                                        value={category} 
                                        onChange={(e: any) => setCategory(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </SelectField>
                                    <SelectField 
                                        label="Fornecedor (Opcional)" 
                                        value={supplier} 
                                        onChange={(e: any) => setSupplier(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                                    </SelectField>
                                    <SelectField 
                                        label="Produto (Opcional)" 
                                        value={product} 
                                        onChange={(e: any) => setProduct(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {appData.products.map(p => <option key={p} value={p}>{p}</option>)}
                                    </SelectField>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dates & Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <InputField label="Vencimento" type="date" value={date} onChange={(e: any) => setDate(e.target.value)} />
                        <InputField label="Pagamento" type="date" value={paymentDate} onChange={(e: any) => setPaymentDate(e.target.value)} />
                        <div className="md:col-span-2">
                            <InputField 
                                label="Descrição" 
                                value={description} 
                                onChange={(e: any) => setDescription(e.target.value)} 
                                placeholder="Detalhes adicionais..."
                                maxLength={100}
                            />
                        </div>
                    </div>

                    {/* Recurrence Panel */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-100 pt-6">
                        <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl">
                            <button 
                                type="button"
                                onClick={() => setRecurrenceType('none')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${recurrenceType === 'none' ? 'bg-white shadow-sm text-heroBlack' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Único
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setRecurrenceType('installment'); setRecurrenceCount(2); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${recurrenceType === 'installment' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Parcelado
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setRecurrenceType('fixed'); setRecurrenceCount(12); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${recurrenceType === 'fixed' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Recorrente
                            </button>
                        </div>
                        
                        {recurrenceType !== 'none' && (
                            <div className="flex items-center gap-2 animate-scaleIn">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Qtd:</span>
                                <input 
                                    type="number" 
                                    min="2" 
                                    max="120" 
                                    value={recurrenceCount} 
                                    onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 2)}
                                    className="w-16 px-2 py-2 bg-slate-50 rounded-lg font-bold text-center text-sm outline-none focus:ring-2 focus:ring-heroBlack"
                                />
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row justify-end items-center gap-4 mt-8">
                        <div className="flex gap-2 w-full md:w-auto">
                            <button 
                                type="button"
                                onClick={() => { setStatus('Pago'); if(!paymentDate) setPaymentDate(new Date().toISOString().split('T')[0]); }}
                                className={`flex-1 md:flex-none px-6 py-4 rounded-xl font-bold text-xs transition-all border-2 ${status === 'Pago' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                PAGO
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setStatus('Pendente'); setPaymentDate(''); }}
                                className={`flex-1 md:flex-none px-6 py-4 rounded-xl font-bold text-xs transition-all border-2 ${status === 'Pendente' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                PENDENTE
                            </button>
                        </div>

                        <button 
                            disabled={saving} 
                            className="w-full md:w-auto bg-heroBlack hover:bg-slate-800 text-white px-10 py-4 rounded-xl font-bold shadow-xl shadow-slate-200 transition-all transform active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />} 
                            {saving ? 'Salvando...' : `LANÇAR ${recurrenceType !== 'none' ? 'MÚLTIPLOS' : ''}`}
                        </button>
                    </div>
                </form>
            </div>

            {editingItem && (
                <EditLancamentoModal 
                    transaction={editingItem} 
                    onClose={() => setEditingItem(null)} 
                    onSave={handleModalSave} 
                />
            )}

            {showAutoPixModal && (
                <AutoPixModal 
                    accounts={accounts}
                    stores={availableStores}
                    preSelectedStore={store}
                    preSelectedAccount={accountId}
                    getCurrentBalance={getCurrentBalanceForModal}
                    onClose={() => setShowAutoPixModal(false)}
                    onSave={handleAutoPixSave}
                />
            )}
        </div>
    );
};
