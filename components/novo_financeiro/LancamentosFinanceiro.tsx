
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getAppData, 
    getFinancialAccounts, 
    getDailyTransactions, 
    saveDailyTransaction, 
    deleteDailyTransaction, 
    formatCurrency, 
    getTodayLocalISO,
    formatDateBr,
    getOrders
} from '../../services/storageService';
import { AppData, FinancialAccount, DailyTransaction, Order, User } from '../../types';
import { CheckCircle, Trash2, Loader2, Search, Edit, DollarSign, EyeOff, Filter, Calculator, ArrowRight, Repeat, CalendarClock, Building2, Wallet, TrendingUp, TrendingDown, ArrowLeft, Landmark, Plus, Wand2, Download, Printer, X } from 'lucide-react';
import { EditLancamentoModal } from './EditLancamentoModal';
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

    const accountsByStore = useMemo(() => {
        const groups: Record<string, { accounts: FinancialAccount[], totalBalance: number }> = {};
        accounts.forEach(acc => {
            if (!groups[acc.store]) groups[acc.store] = { accounts: [], totalBalance: 0 };
            const currentBal = getBalanceForAccount(acc, endDate);
            groups[acc.store].accounts.push(acc);
            groups[acc.store].totalBalance += currentBal;
        });
        Object.values(groups).forEach(group => {
            group.accounts.sort((a, b) => a.name.localeCompare(b.name));
        });
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [accounts, transactions, endDate]);

    if (loading) return <Loader2 className="animate-spin mx-auto mt-10" />;

    const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1";
    const inputClass = "w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:border-heroRed focus:ring-4 focus:ring-heroRed/10 transition-all";
    const isSingleStore = availableStores.length === 1;

    return (
        <div className="space-y-8 pb-20 animate-fadeIn">
            {canViewBalances ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-700">
                            <Wallet size={20} />
                        </div>
                        <h3 className="font-bold text-lg text-slate-700">Saldos em Tempo Real</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {accountsByStore.map(([storeName, data]) => (
                            <div key={storeName} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all duration-300">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
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
                                            <div key={acc.id} className="flex justify-between items-center px-6 py-3 hover:bg-slate-50 transition-colors group">
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
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex items-center justify-center gap-3 text-slate-500">
                    <EyeOff size={20} />
                    <span className="text-sm font-bold">Visualização de saldos restrita ao Gerente/Administrador.</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-card border border-slate-100 animate-fadeIn relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-heroRed"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-100 pb-6 gap-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <div className="p-2 bg-heroRed/10 rounded-lg text-heroRed">
                                <DollarSign size={24} />
                            </div>
                            Novo Lançamento
                        </h2>
                        <p className="text-slate-400 text-sm mt-1 font-medium pl-1">Registre receitas, despesas ou transferências.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {recurrenceType !== 'none' && (
                            <span className="text-xs font-bold bg-purple-50 text-purple-700 px-4 py-2 rounded-full border border-purple-100 flex items-center gap-2 animate-pulse">
                                <Repeat size={14} /> Modo Repetição Ativo
                            </span>
                        )}
                        <button 
                            type="button" 
                            onClick={() => setShowAutoPixModal(true)}
                            className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-purple-700 flex items-center gap-2 shadow-md shadow-purple-200 transform transition-all active:scale-95 hover:-translate-y-0.5"
                        >
                            <Wand2 size={16} className="text-yellow-300"/>
                            Pix Automático
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className={labelClass}>Tipo de Operação</label>
                        <select 
                            value={type} 
                            onChange={e => {
                                const newType = e.target.value as any;
                                setType(newType);
                                if (newType === 'Transferência') {
                                    setPaymentMethod('Transferência bancária');
                                }
                            }} 
                            className={inputClass}
                        >
                            <option value="Despesa">🔴 Despesa (Saída)</option>
                            <option value="Receita">🟢 Receita (Entrada)</option>
                            <option value="Transferência">🟣 Transferência</option>
                        </select>
                    </div>
                     <div>
                        <label className={labelClass}>
                            Valor {recurrenceType === 'installment' ? 'da Parcela' : ''} (R$)
                        </label>
                        <input 
                            type="text" 
                            value={formatCurrency(value)} 
                            onChange={handleCurrencyChange} 
                            className={`${inputClass} text-right font-black text-lg text-slate-800`}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Método Pagamento</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputClass}>
                            <option value="Boleto">Boleto</option>
                            <option value="PiX">PiX</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Cartão">Cartão</option>
                            <option value="Transferência bancária">Transferência bancária</option>
                        </select>
                    </div>
                </div>

                {type === 'Transferência' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 bg-slate-50/80 p-6 rounded-xl border border-slate-200">
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700 pb-2 flex items-center gap-2 border-b border-slate-200">
                                <div className="bg-red-100 p-1 rounded text-red-600"><TrendingDown size={14}/></div> Origem (Sai de)
                            </h4>
                            <div>
                                <label className={labelClass}>Loja Origem</label>
                                <select 
                                    value={store} 
                                    onChange={e => setStore(e.target.value)} 
                                    className={`${inputClass} ${isSingleStore ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                                    disabled={isSingleStore}
                                >
                                    <option value="">Selecione...</option>
                                    {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Conta Origem</label>
                                <select value={accountId} onChange={e => setAccountId(e.target.value)} className={inputClass}>
                                    <option value="">Selecione...</option>
                                    {accounts.filter(a => !store || a.store === store).map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700 pb-2 flex items-center gap-2 border-b border-slate-200">
                                <div className="bg-emerald-100 p-1 rounded text-emerald-600"><TrendingUp size={14}/></div> Destino (Vai para)
                            </h4>
                             <div>
                                <label className={labelClass}>Loja Destino</label>
                                <select value={destinationStore} onChange={e => setDestinationStore(e.target.value)} className={inputClass}>
                                    <option value="">Selecione...</option>
                                    {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Conta Destino</label>
                                <select value={destinationAccountId} onChange={e => setDestinationAccountId(e.target.value)} className={inputClass}>
                                    <option value="">Selecione...</option>
                                    {accounts.filter(a => !destinationStore || a.store === destinationStore).map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className={labelClass}>Loja</label>
                            <select 
                                value={store} 
                                onChange={e => setStore(e.target.value)} 
                                className={`${inputClass} ${isSingleStore ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                                disabled={isSingleStore}
                            >
                                <option value="">Selecione...</option>
                                {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Conta {accountId === '' && <span className="text-heroRed">*</span>}</label>
                            <select value={accountId} onChange={e => setAccountId(e.target.value)} className={inputClass}>
                                <option value="">Selecione a Conta...</option>
                                {accounts.filter(a => !store || a.store === store).map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label className={labelClass}>Categoria</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                                <option value="">Selecione...</option>
                                {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className={labelClass}>Fornecedor (Opcional)</label>
                            <select value={supplier} onChange={e => setSupplier(e.target.value)} className={inputClass}>
                                <option value="">Selecione...</option>
                                {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Produto (Opcional)</label>
                            <select value={product} onChange={e => setProduct(e.target.value)} className={inputClass}>
                                <option value="">Selecione...</option>
                                {appData.products.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Classificação</label>
                            <select value={classification} onChange={e => setClassification(e.target.value)} className={inputClass}>
                                <option value="">Selecione...</option>
                                {appData.types.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div>
                        <label className={labelClass}>Data Vencimento</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass}/>
                    </div>
                    <div>
                        <label className={labelClass}>Data Pagamento</label>
                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={inputClass}/>
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelClass}>Descrição</label>
                        <input 
                            type="text" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            className={inputClass}
                            placeholder="Ex: Aluguel referente a Janeiro"
                            maxLength={100}
                        />
                    </div>
                </div>

                {/* Recurrence Panel */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold min-w-fit">
                            <Repeat size={20} className="text-slate-400"/>
                            <span className="text-sm">Repetição:</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button 
                                type="button"
                                onClick={() => setRecurrenceType('none')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${recurrenceType === 'none' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                            >
                                Único
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setRecurrenceType('installment'); setRecurrenceCount(2); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${recurrenceType === 'installment' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 hover:bg-blue-50 text-blue-600'}`}
                            >
                                Parcelado (x)
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setRecurrenceType('fixed'); setRecurrenceCount(12); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${recurrenceType === 'fixed' ? 'bg-purple-600 text-white shadow-md' : 'bg-white border border-slate-200 hover:bg-purple-50 text-purple-600'}`}
                            >
                                Fixo (Mensal)
                            </button>
                        </div>
                    </div>
                    
                    {recurrenceType !== 'none' && (
                        <div className="flex items-center gap-3 animate-fadeIn">
                            <span className="text-xs font-bold text-slate-500">
                                {recurrenceType === 'installment' ? 'Qtd. Parcelas:' : 'Repetir por (Meses):'}
                            </span>
                            <input 
                                type="number" 
                                min="2" 
                                max="120" 
                                value={recurrenceCount} 
                                onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 2)}
                                className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-center font-bold text-slate-700 focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed outline-none"
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <div className="flex gap-3">
                        <button 
                            type="button"
                            onClick={() => { setStatus('Pago'); if(!paymentDate) setPaymentDate(new Date().toISOString().split('T')[0]); }}
                            className={`px-6 py-3 text-xs font-bold rounded-lg transition-all border shadow-sm ${status === 'Pago' ? 'bg-green-600 text-white border-green-600 shadow-green-100' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                            PAGO
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setStatus('Pendente'); setPaymentDate(''); }}
                            className={`px-6 py-3 text-xs font-bold rounded-lg transition-all border shadow-sm ${status === 'Pendente' ? 'bg-amber-500 text-white border-amber-500 shadow-amber-100' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                            PENDENTE
                        </button>
                    </div>

                    <button disabled={saving} className="bg-heroBlack hover:bg-slate-800 text-white px-10 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-slate-200 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />} 
                        {saving ? 'Salvando...' : `LANÇAR ${recurrenceType !== 'none' ? 'MÚLTIPLOS' : ''}`}
                    </button>
                </div>
            </form>

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
