

import React, { useState, useEffect } from 'react';
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
import { CheckCircle, Trash2, Loader2, Search, Edit, DollarSign, AlertCircle, EyeOff, Filter, Calculator, ArrowRight } from 'lucide-react';
import { EditLancamentoModal } from './EditLancamentoModal';

interface LancamentosFinanceiroProps {
    user: User;
}

export const LancamentosFinanceiro: React.FC<LancamentosFinanceiroProps> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Data Sources
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);

    // Form State
    const [date, setDate] = useState(getTodayLocalISO()); // Data Vencimento
    const [paymentDate, setPaymentDate] = useState(getTodayLocalISO()); // Data Pagamento
    const [store, setStore] = useState('');
    const [type, setType] = useState<'Receita' | 'Despesa' | 'Transferência'>('Despesa'); // Default Despesa
    const [accountId, setAccountId] = useState('');
    
    // Transfer Specifics
    const [destinationStore, setDestinationStore] = useState('');
    const [destinationAccountId, setDestinationAccountId] = useState('');

    const [paymentMethod, setPaymentMethod] = useState('Boleto'); // Default Boleto
    const [product, setProduct] = useState('');
    const [category, setCategory] = useState('');
    const [classification, setClassification] = useState(''); // Novo campo: Tipo (Fixo/Variável)
    const [supplier, setSupplier] = useState('');
    const [value, setValue] = useState(0);
    const [status, setStatus] = useState<'Pago' | 'Pendente'>('Pendente');

    // Edit State
    const [editingItem, setEditingItem] = useState<DailyTransaction | null>(null);

    // Filter State
    const [filterStart, setFilterStart] = useState(getTodayLocalISO());
    const [filterEnd, setFilterEnd] = useState(getTodayLocalISO());
    const [filterStore, setFilterStore] = useState('');
    const [filterAccount, setFilterAccount] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterClassification, setFilterClassification] = useState(''); // Novo Filtro

    // Permission Check
    const canViewBalances = user.isMaster || user.permissions.modules?.includes('view_balances');

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

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setValue(floatValue);
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

        setSaving(true);
        try {
            await saveDailyTransaction({
                id: '',
                date,
                paymentDate: status === 'Pago' ? paymentDate : null,
                store,
                type,
                accountId,
                destinationStore: type === 'Transferência' ? destinationStore : undefined,
                destinationAccountId: type === 'Transferência' ? destinationAccountId : undefined,
                paymentMethod,
                product: type !== 'Transferência' ? product : '',
                category: type !== 'Transferência' ? category : '',
                supplier: (type === 'Despesa' && type !== 'Transferência') ? supplier : '',
                classification: type !== 'Transferência' ? classification : '', // Salvar Classificação
                value,
                status,
                origin: 'manual'
            });
            
            // Reset form basics
            setValue(0);
            setProduct('');
            alert('Lançamento Salvo!');
            loadData(); // Refresh list
        } catch (err: any) {
            console.error(err);
            if (err.message && (err.message.includes('destination_account_id') || err.message.includes('classification') || err.message.includes('schema cache'))) {
                alert('⚠️ ATENÇÃO: ATUALIZAÇÃO DE BANCO DE DADOS NECESSÁRIA\n\nO sistema detectou que colunas novas (como Classification) ainda não foram criadas no seu banco de dados.\n\nSOLUÇÃO:\n1. Vá até o módulo "Backup".\n2. Clique em "Ver SQL de Instalação/Correção".\n3. Copie o código SQL.\n4. Cole e execute no "SQL Editor" do seu painel Supabase.\n\nIsso corrigirá o erro permanentemente.');
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

            return matchesDate && matchesStore && matchesSupplier && matchesAccount && matchesClassification;
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

                return matchesDate && matchesStore && matchesSupplier && matchesAccount && matchesClassification;
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
                origin: 'pedido' as const
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

    if (loading) return <Loader2 className="animate-spin mx-auto mt-10" />;

    const filteredList = getFilteredList();
    const totalQty = filteredList.length;
    const totalReceitas = filteredList.filter(i => i.type === 'Receita').reduce((acc, i) => acc + i.value, 0);
    const totalDespesas = filteredList.filter(i => i.type === 'Despesa').reduce((acc, i) => acc + i.value, 0);
    const totalSaldo = totalReceitas - totalDespesas;

    return (
        <div className="space-y-8 pb-20">
            {canViewBalances ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-2">
                    {accounts.filter(a => !store || a.store === store).map(acc => {
                        const currentBal = getAccountCurrentBalance(acc);
                        return (
                            <div key={acc.id} className="bg-white p-4 rounded shadow border border-gray-200 min-w-[200px]">
                                <div className="text-xs text-gray-500 font-bold uppercase">{acc.store}</div>
                                <div className="font-bold text-gray-800 truncate">{acc.name}</div>
                                <div className={`text-xl font-black mt-1 ${currentBal < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                    {formatCurrency(currentBal)}
                                </div>
                            </div>
                        );
                    })}
                    {accounts.length === 0 && <div className="text-gray-400 italic p-4">Nenhuma conta cadastrada em Campos!</div>}
                </div>
            ) : (
                <div className="bg-gray-100 border border-gray-200 rounded p-4 flex items-center justify-center gap-2 text-gray-500">
                    <EyeOff size={20} />
                    <span className="text-sm font-bold">Visualização de saldos restrita ao Gerente/Administrador.</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Novo Lançamento</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Tipo de Lançamento</label>
                        <select 
                            value={type} 
                            onChange={e => {
                                const newType = e.target.value as any;
                                setType(newType);
                                if (newType === 'Transferência') {
                                    setPaymentMethod('Transferência bancária');
                                }
                            }} 
                            className="w-full p-2 border rounded bg-gray-50 font-bold"
                        >
                            <option value="Despesa">Despesa</option>
                            <option value="Receita">Receita</option>
                            <option value="Transferência">Transferência</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Valor (R$)</label>
                        <input 
                            type="text" 
                            value={formatCurrency(value)} 
                            onChange={handleCurrencyChange} 
                            className="w-full p-2 border rounded text-right font-bold text-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Método Pagamento</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 border rounded">
                            <option value="Boleto">Boleto</option>
                            <option value="PiX">PiX</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Cartão">Cartão</option>
                            <option value="Transferência bancária">Transferência bancária</option>
                        </select>
                    </div>
                </div>

                {type === 'Transferência' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4 bg-blue-50 p-4 rounded border border-blue-200">
                        <div className="space-y-3">
                            <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-1">Origem (De onde sai?)</h4>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Loja Origem</label>
                                <select value={store} onChange={e => setStore(e.target.value)} className="w-full p-2 border rounded">
                                    <option value="">Selecione...</option>
                                    {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Conta Origem</label>
                                <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full p-2 border rounded">
                                    <option value="">Selecione...</option>
                                    {accounts.filter(a => !store || a.store === store).map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h4 className="font-bold text-green-800 border-b border-green-200 pb-1">Destino (Para onde vai?)</h4>
                             <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Loja Destino</label>
                                <select value={destinationStore} onChange={e => setDestinationStore(e.target.value)} className="w-full p-2 border rounded">
                                    <option value="">Selecione...</option>
                                    {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Conta Destino</label>
                                <select value={destinationAccountId} onChange={e => setDestinationAccountId(e.target.value)} className="w-full p-2 border rounded">
                                    <option value="">Selecione...</option>
                                    {accounts.filter(a => !destinationStore || a.store === destinationStore).map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                            <select value={store} onChange={e => setStore(e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Selecione...</option>
                                {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Conta</label>
                            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Selecione...</option>
                                {accounts.filter(a => !store || a.store === store).map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Categoria</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Selecione...</option>
                                {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        {/* Fornecedor (Apenas para Despesa) */}
                        {type === 'Despesa' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Fornecedor</label>
                                <select value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-2 border rounded">
                                    <option value="">Selecione...</option>
                                    {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Produto (Opcional)</label>
                            <select value={product} onChange={e => setProduct(e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Selecione...</option>
                                {appData.products.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        {/* Campo de Classificação adicionado conforme solicitado */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Classificação (Tipo)</label>
                            <select value={classification} onChange={e => setClassification(e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Selecione...</option>
                                {appData.types.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Vencimento</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Pagamento</label>
                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 border rounded"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Status Inicial</label>
                        <div className="flex gap-2">
                            <button 
                                type="button"
                                onClick={() => setStatus('Pago')}
                                className={`flex-1 py-2 text-xs font-bold rounded ${status === 'Pago' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                            >
                                PAGO
                            </button>
                            <button 
                                type="button"
                                onClick={() => setStatus('Pendente')}
                                className={`flex-1 py-2 text-xs font-bold rounded ${status === 'Pendente' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
                            >
                                PENDENTE
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button disabled={saving} className="bg-green-700 hover:bg-green-800 text-white px-8 py-3 rounded font-bold flex items-center gap-2 shadow-lg">
                        {saving ? <Loader2 className="animate-spin" /> : <CheckCircle />} LANÇAR
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
                            <select value={filterStore} onChange={e => setFilterStore(e.target.value)} className="w-full border p-2 rounded text-sm">
                                <option value="">Todas</option>
                                {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
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
                         {/* Filtro de Classificação (Tipo) Adicionado */}
                         <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Tipo</label>
                            <select value={filterClassification} onChange={e => setFilterClassification(e.target.value)} className="w-full border p-2 rounded text-sm">
                                <option value="">Todos</option>
                                {appData.types.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-6 flex justify-end">
                             <button onClick={() => {setFilterStore(''); setFilterAccount(''); setFilterSupplier(''); setFilterClassification(''); setFilterStart(getTodayLocalISO()); setFilterEnd(getTodayLocalISO());}} className="text-xs text-gray-500 hover:text-red-500 font-bold flex items-center gap-1">
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
                                    <td className="px-4 py-3">{formatDateBr(item.date)}</td>
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
                                                <div className="font-bold text-gray-700">{item.category || item.supplier}</div>
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