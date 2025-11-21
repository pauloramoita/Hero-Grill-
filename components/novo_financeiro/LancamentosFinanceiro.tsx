

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
import { CheckCircle, Trash2, Loader2, Search, Edit, DollarSign, EyeOff, Filter, Calculator, ArrowRight, Repeat, CalendarClock, Building2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { EditLancamentoModal } from './EditLancamentoModal';

interface LancamentosFinanceiroProps {
    user: User;
}

export const LancamentosFinanceiro: React.FC<LancamentosFinanceiroProps> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);

    const [date, setDate] = useState(getTodayLocalISO()); 
    const [paymentDate, setPaymentDate] = useState(getTodayLocalISO()); 
    const [store, setStore] = useState('');
    const [type, setType] = useState<'Receita' | 'Despesa' | 'Transferência'>('Despesa'); 
    const [accountId, setAccountId] = useState('');
    
    const [destinationStore, setDestinationStore] = useState('');
    const [destinationAccountId, setDestinationAccountId] = useState('');

    const [paymentMethod, setPaymentMethod] = useState('Boleto'); 
    const [product, setProduct] = useState('');
    const [category, setCategory] = useState('');
    const [classification, setClassification] = useState('Variável'); 
    const [supplier, setSupplier] = useState('');
    const [value, setValue] = useState(0);
    const [status, setStatus] = useState<'Pago' | 'Pendente'>('Pendente');
    const [description, setDescription] = useState(''); 

    const [recurrenceType, setRecurrenceType] = useState<'none' | 'installment' | 'fixed'>('none');
    const [recurrenceCount, setRecurrenceCount] = useState<number>(2);

    const [editingItem, setEditingItem] = useState<DailyTransaction | null>(null);

    const [filterStart, setFilterStart] = useState(getTodayLocalISO());
    const [filterEnd, setFilterEnd] = useState(getTodayLocalISO());
    const [filterStore, setFilterStore] = useState('');
    const [filterAccount, setFilterAccount] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterClassification, setFilterClassification] = useState('');

    const canViewBalances = user.isMaster || (user.permissions?.modules && user.permissions.modules.includes('view_balances'));

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
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
        setLoading(false);
    };

    // Determine available stores based on user permissions
    const availableStores = useMemo(() => {
        if (user.isMaster) return appData.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return appData.stores.filter(s => user.permissions.stores.includes(s));
        }
        return appData.stores;
    }, [appData.stores, user]);

    // Auto-select if only one store available
    useEffect(() => {
        if (availableStores.length === 1) {
            const singleStore = availableStores[0];
            setStore(singleStore);
            setFilterStore(singleStore);
        }
    }, [availableStores]);

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
            
            // Nota: Campos como Store, Account, Category, Supplier e Classification 
            // NÃO são resetados para facilitar lançamentos em sequência.
            
            alert(loopCount > 1 ? `${loopCount} Lançamentos Gerados com Sucesso!` : 'Lançamento Salvo!');
            loadData(); 
        } catch (err: any) {
            console.error(err);
            if (err.message && (err.message.includes('destination_account_id') || err.message.includes('classification') || err.message.includes('schema cache'))) {
                alert('⚠️ ATENÇÃO: ERRO DE BANCO DE DADOS\n\nColunas novas não encontradas. Vá ao módulo Backup > Ver SQL e execute o comando.');
            } else {
                alert('Erro ao salvar: ' + err.message);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Excluir lançamento?')) {
            await deleteDailyTransaction(id);
            loadData();
        }
    };

    const handlePay = async (t: DailyTransaction) => {
        if (!t.accountId || !t.paymentMethod || t.paymentMethod === '-' || !t.store) {
            alert("Para realizar o pagamento, é necessário preencher 'Conta' e 'Método de Pagamento'.\n\nClique no botão Editar (lápis) para completar o cadastro.");
            return;
        }

        if (window.confirm(`Confirmar pagamento de ${formatCurrency(t.value)}?`)) {
            const updated: DailyTransaction = { 
                ...t, 
                status: 'Pago', 
                paymentDate: getTodayLocalISO(),
                origin: 'manual' 
            };
            await saveDailyTransaction(updated);
            loadData();
        }
    };

    const handleEditClick = (item: DailyTransaction) => {
        setEditingItem(item);
    }

    const handleModalSave = async (updated: DailyTransaction) => {
        try {
            await saveDailyTransaction(updated);
            setEditingItem(null);
            loadData();
        } catch (e: any) {
            alert('Erro ao salvar: ' + e.message);
        }
    }

    const getAccountName = (id: string | null | undefined) => {
        if (!id) return '-';
        return accounts.find(a => a.id === id)?.name || 'Conta Removida';
    };

    const getFilteredList = () => {
        const filteredTrans = transactions.filter(t => {
            const matchesDate = t.date >= filterStart && t.date <= filterEnd;
            const matchesStore = !filterStore || t.store === filterStore;
            const matchesSupplier = !filterSupplier || t.supplier === filterSupplier;
            const matchesClassification = !filterClassification || t.classification === filterClassification;
            
            let matchesAccount = true;
            if (filterAccount) {
                if (t.type === 'Transferência') {
                    matchesAccount = t.accountId === filterAccount || t.destinationAccountId === filterAccount;
                } else {
                    matchesAccount = t.accountId === filterAccount;
                }
            }

            // Permission Check
            let allowed = true;
            if (availableStores.length > 0 && !user.isMaster) {
                // For transfers, check if user has access to origin store
                allowed = availableStores.includes(t.store);
            }

            return matchesDate && matchesStore && matchesSupplier && matchesAccount && matchesClassification && allowed;
        });
        
        const existingIds = new Set(transactions.map(t => t.id));

        const filteredOrders = orders
            .filter(o => {
                const dDate = o.deliveryDate || o.date; 
                const matchesDate = dDate >= filterStart && dDate <= filterEnd;
                const matchesStore = !filterStore || o.store === filterStore;
                const matchesSupplier = !filterSupplier || o.supplier === filterSupplier;
                const matchesAccount = !filterAccount;
                const matchesClassification = !filterClassification || (o.type || 'Variável') === filterClassification;

                 // Permission Check
                let allowed = true;
                if (availableStores.length > 0 && !user.isMaster) {
                    allowed = availableStores.includes(o.store);
                }

                return matchesDate && matchesStore && matchesSupplier && matchesAccount && matchesClassification && allowed;
            })
            .filter(o => !existingIds.has(o.id))
            .map(o => ({
                id: o.id,
                date: o.deliveryDate || o.date,
                paymentDate: null,
                store: o.store,
                type: 'Despesa' as const,
                accountId: null,
                paymentMethod: 'Boleto',
                product: o.product,
                category: o.category || '-',
                classification: o.type || 'Variável',
                supplier: o.supplier,
                value: o.totalValue,
                status: 'Pendente' as const,
                origin: 'pedido' as const,
                description: `Pedido ref. ${o.product}`
            }));

        const merged = [...filteredTrans, ...filteredOrders].sort((a, b) => b.date.localeCompare(a.date));
        return merged;
    };

    const getAccountCurrentBalance = (acc: FinancialAccount) => {
        let balance = acc.initialBalance;
        transactions.forEach(t => {
            if (t.status === 'Pago') {
                if (t.accountId === acc.id) {
                    if (t.type === 'Receita') balance += t.value;
                    if (t.type === 'Despesa') balance -= t.value;
                    if (t.type === 'Transferência') balance -= t.value;
                }
                if (t.type === 'Transferência' && t.destinationAccountId === acc.id) {
                    balance += t.value;
                }
            }
        });
        return balance;
    };

    // Group Accounts By Store Logic
    const accountsByStore = useMemo(() => {
        const groups: Record<string, { accounts: FinancialAccount[], totalBalance: number }> = {};
        
        accounts.forEach(acc => {
            if (store && acc.store !== store) return; // Filter by selected store (input form)
            
            if (!groups[acc.store]) {
                groups[acc.store] = { accounts: [], totalBalance: 0 };
            }
            
            const currentBal = getAccountCurrentBalance(acc);
            groups[acc.store].accounts.push(acc);
            groups[acc.store].totalBalance += currentBal;
        });

        // Ordenar as contas alfabeticamente dentro de cada loja
        Object.values(groups).forEach(group => {
            group.accounts.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Ordem personalizada das lojas
        const customOrder = ['Hero Joquei', 'Hero Shopping', 'Hero Centro'];

        return Object.entries(groups).sort((a, b) => {
            const storeA = a[0];
            const storeB = b[0];
            
            const indexA = customOrder.indexOf(storeA);
            const indexB = customOrder.indexOf(storeB);

            // Se ambas estão na lista personalizada, ordena pelo índice
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            
            // Se apenas A está na lista, A vem primeiro
            if (indexA !== -1) return -1;
            
            // Se apenas B está na lista, B vem primeiro
            if (indexB !== -1) return 1;
            
            // Se nenhuma está, ordem alfabética
            return storeA.localeCompare(storeB);
        });
    }, [accounts, transactions, store]);

    if (loading) return <Loader2 className="animate-spin mx-auto mt-10" />;

    const filteredList = getFilteredList();
    const totalQty = filteredList.length;
    const totalReceitas = filteredList.filter(i => i.type === 'Receita').reduce((acc, i) => acc + i.value, 0);
    const totalDespesas = filteredList.filter(i => i.type === 'Despesa').reduce((acc, i) => acc + i.value, 0);
    const totalSaldo = totalReceitas - totalDespesas;

    const isSingleStore = availableStores.length === 1;

    return (
        <div className="space-y-8 pb-20">
            {canViewBalances ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-heroRed p-1.5 rounded-md text-white">
                            <Wallet size={18} />
                        </div>
                        <h3 className="font-bold text-lg text-slate-700">Saldos em Tempo Real</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {accountsByStore.map(([storeName, data]) => (
                            <div key={storeName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
                                {/* Store Header */}
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
                                
                                {/* Accounts List */}
                                <div className="divide-y divide-slate-50">
                                    {data.accounts.map(acc => {
                                        const bal = getAccountCurrentBalance(acc);
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
                                        <div className="p-4 text-center text-xs text-slate-400 italic">Nenhuma conta cadastrada.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {accountsByStore.length === 0 && (
                            <div className="col-span-full text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400">
                                <Wallet size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>Nenhuma conta bancária encontrada.</p>
                                <p className="text-xs mt-1">Cadastre contas no menu "Campos Financeiro".</p>
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

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-card border border-slate-200 animate-fadeIn relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-heroRed"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <DollarSign className="text-heroRed" />
                            Novo Lançamento
                        </h2>
                        <p className="text-slate-400 text-xs mt-1">Registre receitas, despesas ou transferências.</p>
                    </div>
                    {recurrenceType !== 'none' && (
                        <span className="text-xs font-bold bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-100 flex items-center gap-1.5 animate-pulse">
                            <Repeat size={12} /> Modo Repetição Ativo
                        </span>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo de Operação</label>
                        <div className="relative">
                            <select 
                                value={type} 
                                onChange={e => {
                                    const newType = e.target.value as any;
                                    setType(newType);
                                    if (newType === 'Transferência') {
                                        setPaymentMethod('Transferência bancária');
                                    }
                                }} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed"
                            >
                                <option value="Despesa">🔴 Despesa (Saída)</option>
                                <option value="Receita">🟢 Receita (Entrada)</option>
                                <option value="Transferência">🟣 Transferência</option>
                            </select>
                        </div>
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                            Valor {recurrenceType === 'installment' ? 'da Parcela' : ''} (R$)
                        </label>
                        <input 
                            type="text" 
                            value={formatCurrency(value)} 
                            onChange={handleCurrencyChange} 
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-right font-black text-lg text-slate-800 focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Método Pagamento</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed outline-none text-sm font-medium">
                            <option value="Boleto">Boleto</option>
                            <option value="PiX">PiX</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Cartão">Cartão</option>
                            <option value="Transferência bancária">Transferência bancária</option>
                        </select>
                    </div>
                </div>

                {type === 'Transferência' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2 flex items-center gap-2">
                                <TrendingDown size={16} className="text-red-500"/> Origem (Sai de)
                            </h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Loja Origem</label>
                                <select 
                                    value={store} 
                                    onChange={e => setStore(e.target.value)} 
                                    className={`w-full p-2.5 border border-slate-300 rounded-lg ${isSingleStore ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                                    disabled={isSingleStore}
                                >
                                    <option value="">Selecione...</option>
                                    {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Conta Origem</label>
                                <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                                    <option value="">Selecione...</option>
                                    {accounts.filter(a => !store || a.store === store).map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2 flex items-center gap-2">
                                <TrendingUp size={16} className="text-emerald-500"/> Destino (Vai para)
                            </h4>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Loja Destino</label>
                                <select value={destinationStore} onChange={e => setDestinationStore(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                                    <option value="">Selecione...</option>
                                    {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Conta Destino</label>
                                <select value={destinationAccountId} onChange={e => setDestinationAccountId(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
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
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Loja</label>
                            <select 
                                value={store} 
                                onChange={e => setStore(e.target.value)} 
                                className={`w-full p-2.5 border border-slate-300 rounded-lg ${isSingleStore ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                                disabled={isSingleStore}
                            >
                                <option value="">Selecione...</option>
                                {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Conta {accountId === '' && <span className="text-red-500">*</span>}</label>
                            <select value={accountId} onChange={e => setAccountId(e.target.value)} className={`w-full p-2.5 border rounded-lg bg-white ${!accountId ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}>
                                <option value="">Selecione a Conta...</option>
                                {accounts.filter(a => !store || a.store === store).map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoria</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                                <option value="">Selecione...</option>
                                {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fornecedor (Opcional)</label>
                            <select value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                                <option value="">Selecione...</option>
                                {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Produto (Opcional)</label>
                            <select value={product} onChange={e => setProduct(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                                <option value="">Selecione...</option>
                                {appData.products.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Classificação</label>
                            <select value={classification} onChange={e => setClassification(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                                <option value="">Selecione...</option>
                                {appData.types.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data Vencimento</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data Pagamento</label>
                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm"/>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição</label>
                        <input 
                            type="text" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm placeholder-slate-400"
                            placeholder="Ex: Aluguel referente a Janeiro"
                            maxLength={100}
                        />
                    </div>
                </div>

                {/* Recurrence Panel */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold min-w-fit">
                            <Repeat size={18} />
                            <span className="text-sm">Repetição:</span>
                        </div>
                        <div className="flex gap-2 flex-1">
                            <button 
                                type="button"
                                onClick={() => setRecurrenceType('none')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${recurrenceType === 'none' ? 'bg-slate-800 text-white shadow' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                            >
                                Único
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setRecurrenceType('installment'); setRecurrenceCount(2); }}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${recurrenceType === 'installment' ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-200 hover:bg-blue-50 text-blue-600'}`}
                            >
                                Parcelado (x)
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setRecurrenceType('fixed'); setRecurrenceCount(12); }}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${recurrenceType === 'fixed' ? 'bg-purple-600 text-white shadow' : 'bg-white border border-slate-200 hover:bg-purple-50 text-purple-600'}`}
                            >
                                Fixo (Mensal)
                            </button>
                        </div>
                        
                        {recurrenceType !== 'none' && (
                            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm animate-fadeIn">
                                <span className="text-xs font-bold px-2 text-slate-500">
                                    {recurrenceType === 'installment' ? 'Qtd. Parcelas:' : 'Repetir por (Meses):'}
                                </span>
                                <input 
                                    type="number" 
                                    min="2" 
                                    max="120" 
                                    value={recurrenceCount} 
                                    onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 2)}
                                    className="w-16 p-1 border border-slate-200 rounded text-center font-bold text-slate-700 focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed outline-none"
                                />
                            </div>
                        )}
                    </div>
                    {recurrenceType === 'installment' && (
                        <p className="text-xs text-blue-600 mt-2 ml-1 flex items-center gap-1">
                            <CalendarClock size={12}/> O sistema criará {recurrenceCount} lançamentos mensais. A descrição terá o sufixo (1/{recurrenceCount}), etc.
                        </p>
                    )}
                    {recurrenceType === 'fixed' && (
                        <p className="text-xs text-purple-600 mt-2 ml-1 flex items-center gap-1">
                             <CalendarClock size={12}/> O sistema duplicará este lançamento pelos próximos {recurrenceCount - 1} meses automaticamente.
                        </p>
                    )}
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <button 
                            type="button"
                            onClick={() => { setStatus('Pago'); if(!paymentDate) setPaymentDate(new Date().toISOString().split('T')[0]); }}
                            className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all border ${status === 'Pago' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                        >
                            PAGO
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setStatus('Pendente'); setPaymentDate(''); }}
                            className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all border ${status === 'Pendente' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                        >
                            PENDENTE
                        </button>
                    </div>

                    <button disabled={saving} className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                        {saving ? <Loader2 className="animate-spin" /> : <CheckCircle />} 
                        {saving ? 'Salvando...' : `LANÇAR ${recurrenceType !== 'none' ? 'MÚLTIPLOS' : ''}`}
                    </button>
                </div>
            </form>

            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                            <Search size={18}/> Movimentações do Dia / Período
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Data Início</label>
                            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Data Fim</label>
                            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Loja</label>
                            <select 
                                value={filterStore} 
                                onChange={e => setFilterStore(e.target.value)} 
                                className={`w-full border p-2 rounded text-sm ${availableStores.length === 1 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                disabled={availableStores.length === 1}
                            >
                                {availableStores.length !== 1 && <option value="">Todas</option>}
                                {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Conta</label>
                            <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-full border p-2 rounded text-sm">
                                <option value="">Todas</option>
                                {accounts
                                    .filter(a => !filterStore || a.store === filterStore)
                                    .map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                                }
                            </select>
                        </div>
                         <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Fornecedor</label>
                            <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-full border p-2 rounded text-sm">
                                <option value="">Todos</option>
                                {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                         <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Tipo</label>
                            <select value={filterClassification} onChange={e => setFilterClassification(e.target.value)} className="w-full border p-2 rounded text-sm">
                                <option value="">Todos</option>
                                {appData.types.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-6 flex justify-end">
                             <button 
                                onClick={() => {
                                    if(availableStores.length !== 1) setFilterStore(''); 
                                    setFilterAccount(''); 
                                    setFilterSupplier(''); 
                                    setFilterClassification(''); 
                                    setFilterStart(getTodayLocalISO()); 
                                    setFilterEnd(getTodayLocalISO());
                                }} 
                                className="text-xs text-gray-500 hover:text-red-500 font-bold flex items-center gap-1"
                            >
                                <Filter size={12}/> Limpar Filtros
                             </button>
                        </div>
                    </div>
                </div>

                 <div className="bg-blue-50 p-4 border-b border-blue-100 flex flex-wrap gap-4 justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                        <Calculator size={16} className="text-blue-600"/>
                        <span className="font-bold text-gray-600">RESUMO DA SELEÇÃO:</span>
                    </div>
                    <div className="flex gap-6">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-500 uppercase">Qtd. Registros</span>
                            <span className="font-bold text-gray-800 text-lg">{totalQty}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-green-600 uppercase">Receitas</span>
                            <span className="font-bold text-green-700">{formatCurrency(totalReceitas)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-red-600 uppercase">Despesas</span>
                            <span className="font-bold text-red-700">{formatCurrency(totalDespesas)}</span>
                        </div>
                        <div className="flex flex-col items-end border-l pl-6 border-blue-200">
                            <span className="text-xs font-black text-blue-800 uppercase">Saldo (Total)</span>
                            <span className={`font-black text-lg ${totalSaldo >= 0 ? 'text-blue-800' : 'text-red-600'}`}>{formatCurrency(totalSaldo)}</span>
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 text-xs uppercase font-bold text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Vencimento</th>
                                <th className="px-4 py-3 text-left">Loja</th>
                                <th className="px-4 py-3 text-left">Origem</th>
                                <th className="px-4 py-3 text-left">Descrição / Destino</th>
                                <th className="px-4 py-3 text-left">Conta</th>
                                <th className="px-4 py-3 text-left">Tipo</th>
                                <th className="px-4 py-3 text-left">Método</th>
                                <th className="px-4 py-3 text-right">Valor</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-sm">
                            {filteredList.map((item, idx) => (
                                <tr key={item.id} className={`hover:bg-gray-50 ${item.origin === 'pedido' ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-4 py-3 whitespace-nowrap">{formatDateBr(item.date)}</td>
                                    <td className="px-4 py-3">{item.store}</td>
                                    <td className="px-4 py-3">
                                        {item.origin === 'pedido' ? (
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Cadastro</span>
                                        ) : item.type === 'Transferência' ? (
                                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold">Transf.</span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">Manual</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.type === 'Transferência' ? (
                                            <div className="flex items-center gap-1 text-purple-700 font-bold">
                                                 <ArrowRight size={12}/> {item.destinationStore} <span className="text-gray-400">|</span> {getAccountName(item.destinationAccountId)}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-bold text-gray-700">{item.description || item.category || item.supplier}</div>
                                                <div className="text-xs text-gray-500">{item.product}</div>
                                            </>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.accountId ? getAccountName(item.accountId) : <span className="text-red-400 text-xs italic font-bold">Definir Conta</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.classification && (
                                            <span className="text-[10px] bg-gray-100 px-1 rounded border border-gray-300 text-gray-600">{item.classification}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{item.paymentMethod}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${item.type === 'Receita' ? 'text-green-600' : item.type === 'Transferência' ? 'text-purple-600' : 'text-red-600'}`}>
                                        {item.type === 'Receita' ? '+' : '-'}{formatCurrency(item.value)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {item.status === 'Pago' ? (
                                            <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-1"><CheckCircle size={12}/> PAGO</span>
                                        ) : (
                                            <span className="text-yellow-600 font-bold text-xs bg-yellow-100 px-2 py-1 rounded">PENDENTE</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            {item.status === 'Pendente' && (
                                                <button 
                                                    onClick={() => handlePay(item as DailyTransaction)} 
                                                    className="text-green-600 hover:bg-green-100 p-1 rounded transition-colors" 
                                                    title={!item.accountId ? "Preencha a conta para pagar" : "Confirmar Pagamento"}
                                                >
                                                    <DollarSign size={16}/>
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleEditClick(item as DailyTransaction)} 
                                                className="text-blue-600 hover:bg-blue-100 p-1 rounded transition-colors"
                                                title="Editar / Completar Cadastro"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(item.id)} 
                                                className="text-red-500 hover:bg-red-100 p-1 rounded transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                             {filteredList.length === 0 && (
                                <tr><td colSpan={10} className="p-6 text-center text-gray-500">Nenhum lançamento encontrado.</td></tr>
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
        </div>
    );
};