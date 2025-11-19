
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
    getOrders,
    updateOrder
} from '../../services/storageService';
import { AppData, FinancialAccount, DailyTransaction, Order } from '../../types';
import { CheckCircle, Trash2, Loader2, ArrowUpCircle, ArrowDownCircle, Calendar, Search, Edit, DollarSign } from 'lucide-react';

export const LancamentosFinanceiro: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Data Sources
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [orders, setOrders] = useState<Order[]>([]); // To merge into list

    // Form State
    const [date, setDate] = useState(getTodayLocalISO()); // Data Vencimento
    const [paymentDate, setPaymentDate] = useState(getTodayLocalISO()); // Data Pagamento
    const [store, setStore] = useState('');
    const [type, setType] = useState<'Receita' | 'Despesa' | 'Transferência'>('Despesa');
    const [accountId, setAccountId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
    const [product, setProduct] = useState('');
    const [category, setCategory] = useState('');
    const [supplier, setSupplier] = useState('');
    const [value, setValue] = useState(0);
    const [status, setStatus] = useState<'Pago' | 'Pendente'>('Pendente');

    // Filter State (For List)
    const [filterStart, setFilterStart] = useState(getTodayLocalISO());
    const [filterEnd, setFilterEnd] = useState(getTodayLocalISO());

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
        if (!store || !accountId || value <= 0) {
            alert('Preencha Loja, Conta e Valor.');
            return;
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
                paymentMethod,
                product,
                category,
                supplier,
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
            alert('Erro: ' + err.message);
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

    const markAsPaid = async (t: DailyTransaction) => {
        const updated = { ...t, status: 'Pago', paymentDate: getTodayLocalISO() } as DailyTransaction;
        await saveDailyTransaction(updated);
        loadData();
    };

    // Helper to get Account Name
    const getAccountName = (id: string | null) => {
        if (!id) return '-';
        return accounts.find(a => a.id === id)?.name || 'Conta Removida';
    };

    // Filtered List merging Transactions and Orders
    const getFilteredList = () => {
        // 1. Filter Daily Transactions
        const filteredTrans = transactions.filter(t => t.date >= filterStart && t.date <= filterEnd);
        
        // 2. Filter Orders (Map to display structure)
        const filteredOrders = orders.filter(o => {
             // Use deliveryDate as due date
             const dDate = o.deliveryDate || o.date; 
             return dDate >= filterStart && dDate <= filterEnd;
        }).map(o => ({
            id: o.id,
            date: o.deliveryDate || o.date,
            paymentDate: null, // Orders don't track payment date strictly yet
            store: o.store,
            type: 'Despesa' as const, // Usually orders are expenses
            accountId: null,
            paymentMethod: '-',
            product: o.product,
            category: o.category || '-',
            supplier: o.supplier,
            value: o.totalValue,
            status: o.deliveryDate ? 'Pendente' : 'Pendente', // Logic check: deliveryDate in Orders usually means "Due Date".
            origin: 'pedido' as const
        }));

        // 3. Merge and Sort
        // We only show Orders in the list for visibility. Editing them implies managing them in "Cadastro" or importing them (future feature).
        // For now, users asked to "Search for launches made in Cadastro".
        
        const merged = [...filteredTrans, ...filteredOrders].sort((a, b) => b.date.localeCompare(a.date));
        return merged;
    };

    // Calculate Account Balances (Dynamic)
    const getAccountCurrentBalance = (acc: FinancialAccount) => {
        // Start with initial
        let balance = acc.initialBalance;
        // Apply all PAID transactions
        transactions.forEach(t => {
            if (t.accountId === acc.id && t.status === 'Pago') {
                if (t.type === 'Receita') balance += t.value;
                if (t.type === 'Despesa') balance -= t.value;
                // Transfer needs "From" and "To". Simplified here as simple debit/credit.
            }
        });
        return balance;
    };

    if (loading) return <Loader2 className="animate-spin mx-auto mt-10" />;

    const filteredList = getFilteredList();

    return (
        <div className="space-y-8 pb-20">
            {/* Top Section: Account Balances */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-2">
                {accounts.filter(a => !store || a.store === store).map(acc => (
                    <div key={acc.id} className="bg-white p-4 rounded shadow border border-gray-200 min-w-[200px]">
                        <div className="text-xs text-gray-500 font-bold uppercase">{acc.store}</div>
                        <div className="font-bold text-gray-800 truncate">{acc.name}</div>
                        <div className="text-xl font-black text-green-700 mt-1">{formatCurrency(getAccountCurrentBalance(acc))}</div>
                    </div>
                ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Novo Lançamento</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                        <select value={store} onChange={e => setStore(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">Selecione...</option>
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Tipo</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 border rounded">
                            <option value="Despesa">Despesa</option>
                            <option value="Receita">Receita</option>
                            <option value="Transferência">Transferência</option>
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
                        <label className="block text-xs font-bold text-gray-600 mb-1">Método Pagamento</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 border rounded">
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="PiX">PiX</option>
                            <option value="Boleto">Boleto</option>
                            <option value="Cartão">Cartão</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Categoria</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">Selecione...</option>
                            {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Fornecedor</label>
                        <select value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">Selecione...</option>
                            {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Produto (Opcional)</label>
                        <select value={product} onChange={e => setProduct(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">Selecione...</option>
                            {appData.products.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Valor (R$)</label>
                        <input 
                            type="text" 
                            value={formatCurrency(value)} 
                            onChange={handleCurrencyChange} 
                            className="w-full p-2 border rounded text-right font-bold"
                        />
                    </div>
                </div>

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

            {/* Filter & List */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-4 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-4">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2"><Search size={18}/> Movimentações do Dia / Período</h3>
                    <div className="flex items-center gap-2">
                        <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="border p-1 rounded text-sm"/>
                        <span className="text-gray-400">até</span>
                        <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="border p-1 rounded text-sm"/>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 text-xs uppercase font-bold text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Vencimento</th>
                                <th className="px-4 py-3 text-left">Loja</th>
                                <th className="px-4 py-3 text-left">Origem</th>
                                <th className="px-4 py-3 text-left">Categoria/Prod</th>
                                <th className="px-4 py-3 text-left">Conta</th>
                                <th className="px-4 py-3 text-right">Valor</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-sm">
                            {filteredList.map((item, idx) => (
                                <tr key={idx} className={`hover:bg-gray-50 ${item.origin === 'pedido' ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-4 py-3">{formatDateBr(item.date)}</td>
                                    <td className="px-4 py-3">{item.store}</td>
                                    <td className="px-4 py-3">
                                        {item.origin === 'pedido' ? (
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Cadastro</span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">Manual</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-700">{item.category || item.supplier}</div>
                                        <div className="text-xs text-gray-500">{item.product}</div>
                                    </td>
                                    <td className="px-4 py-3">{getAccountName(item.accountId)}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${item.type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
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
                                        {item.origin === 'manual' && (
                                            <div className="flex justify-center gap-2">
                                                {item.status === 'Pendente' && (
                                                    <button onClick={() => markAsPaid(item as DailyTransaction)} className="text-green-600 hover:bg-green-100 p-1 rounded" title="Pagar">
                                                        <DollarSign size={16}/>
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-100 p-1 rounded">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        )}
                                        {item.origin === 'pedido' && (
                                            <span className="text-gray-400 text-xs italic">Gerenciar em Cadastro</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                             {filteredList.length === 0 && (
                                <tr><td colSpan={8} className="p-6 text-center text-gray-500">Nenhum lançamento encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
