
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getAppData, 
    getOrders, 
    getDailyTransactions, 
    getFinancialAccounts,
    getTransactions043,
    getAccountBalances,
    formatCurrency
} from '../../services/storageService';
import { AppData, Order, DailyTransaction, FinancialAccount, Transaction043, AccountBalance, User } from '../../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell
} from 'recharts';
import { 
    Loader2,
    Lock,
    Hammer,
    AlertCircle
} from 'lucide-react';

interface DashboardModuleProps {
    user: User;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState('geral');
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [transactions043, setTransactions043] = useState<Transaction043[]>([]);
    const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);

    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    const [sortFixed, setSortFixed] = useState<'alpha' | 'value'>('value');
    const [sortVariable, setSortVariable] = useState<'alpha' | 'value'>('value');

    // Determine available stores based on user permissions
    const availableStores = useMemo(() => {
        const allStores = appData?.stores || [];
        
        if (user.isMaster) return allStores;
        
        // Se o usuário tem lojas especificadas, respeita o filtro.
        if (user.permissions?.stores && user.permissions.stores.length > 0) {
            return allStores.filter(s => user.permissions.stores.includes(s));
        }
        
        // IMPORTANTE: Para Investidores/Observadores (permissão dashboard apenas),
        // se a lista de lojas for vazia, assumimos que ele pode ver o CONSOLIDADO (Todas as lojas).
        return allStores; 
    }, [appData.stores, user]);

    // Initial State for Store Selection
    const [selectedStore, setSelectedStore] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    // Força seleção se houver apenas uma loja disponível
    useEffect(() => {
        if (availableStores.length === 1) {
            setSelectedStore(availableStores[0]);
        }
    }, [availableStores]);

    const loadData = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const [d, o, acc] = await Promise.all([
                getAppData(),
                getOrders().catch(e => { console.error('Orders load error', e); return []; }),
                getFinancialAccounts().catch(e => { console.error('Acc load error', e); return []; }),
            ]);
            
            const t = await getDailyTransactions().catch(e => { console.error('Trans load error', e); return []; });
            const t043 = await getTransactions043().catch(e => { console.error('043 load error', e); return []; });
            const ab = await getAccountBalances().catch(e => { console.error('Balances load error', e); return []; });

            setAppData(d);
            setOrders(o);
            setTransactions(t);
            setAccounts(acc);
            setTransactions043(t043);
            setAccountBalances(ab);
        } catch (error: any) {
            console.error("Critical Dashboard Error", error);
            setErrorMsg(error.message || 'Erro desconhecido ao carregar dados.');
        } finally {
            setLoading(false);
        }
    };

    const filterStore = (storeName: string | null | undefined) => !selectedStore || storeName === selectedStore;

    // --- KPIs Calculations ---

    const calculateFinancialMetrics = () => {
        // Safety check
        if (!transactions || !orders) return { totalRevenues: 0, totalFixed: 0, totalVariable: 0, netResult: 0 };

        const periodTransactions = transactions.filter(t => 
            t.date && t.date.startsWith(currentMonth) && 
            filterStore(t.store)
        );
        
        const periodOrders = orders.filter(o => 
            o.date && o.date.startsWith(currentMonth) && 
            filterStore(o.store)
        );

        const totalRevenues = periodTransactions
            .filter(t => t.type === 'Receita')
            .reduce((acc, t) => acc + (t.value || 0), 0);

        const totalFixed = periodTransactions
            .filter(t => t.type === 'Despesa' && (t.classification === 'Fixa' || t.classification === 'Fixo'))
            .reduce((acc, t) => acc + (t.value || 0), 0);

        const variableTrans = periodTransactions
            .filter(t => t.type === 'Despesa' && t.classification !== 'Fixa' && t.classification !== 'Fixo')
            .reduce((acc, t) => acc + (t.value || 0), 0);
            
        const variableOrders = periodOrders
            .reduce((acc, o) => acc + (o.totalValue || 0), 0);

        const totalVariable = variableTrans + variableOrders;
        const netResult = totalRevenues - (totalFixed + totalVariable);

        return {
            totalRevenues,
            totalFixed,
            totalVariable,
            netResult
        };
    };

    const calculateTotalBalance = () => {
        if (!accounts) return 0;
        let total = 0;
        // Only sum accounts that match the store filter
        const accountsToSum = accounts.filter(a => filterStore(a.store));

        accountsToSum.forEach(acc => {
            let bal = acc.initialBalance || 0;
            const accTrans = transactions.filter(t => t.status === 'Pago');
            accTrans.forEach(t => {
                if (t.accountId === acc.id) {
                    if (t.type === 'Receita') bal += t.value;
                    else if (t.type === 'Despesa') bal -= t.value;
                    else if (t.type === 'Transferência') bal -= t.value;
                }
                if (t.type === 'Transferência' && t.destinationAccountId === acc.id) {
                    bal += t.value;
                }
            });
            total += bal;
        });
        return total;
    };

    const getStorePerformance = () => {
        const storeStats: Record<string, { sales: number, expenses: number }> = {};
        
        // Init stores
        availableStores.forEach(s => {
            storeStats[s] = { sales: 0, expenses: 0 };
        });

        // Se nenhuma loja estiver disponível (caso raro de erro), evita crash
        if (availableStores.length === 0 && selectedStore) {
             storeStats[selectedStore] = { sales: 0, expenses: 0 };
        }

        transactions
            .filter(t => t.date && t.date.startsWith(currentMonth) && t.type === 'Receita' && filterStore(t.store))
            .forEach(t => {
                if (!storeStats[t.store]) storeStats[t.store] = { sales: 0, expenses: 0 };
                storeStats[t.store].sales += (t.value || 0);
            });

        transactions
            .filter(t => t.date && t.date.startsWith(currentMonth) && t.type === 'Despesa' && filterStore(t.store))
            .forEach(t => {
                if (!storeStats[t.store]) storeStats[t.store] = { sales: 0, expenses: 0 };
                storeStats[t.store].expenses += (t.value || 0);
            });

        orders
            .filter(o => o.date && o.date.startsWith(currentMonth) && filterStore(o.store))
            .forEach(o => {
                if (!storeStats[o.store]) storeStats[o.store] = { sales: 0, expenses: 0 };
                storeStats[o.store].expenses += (o.totalValue || 0);
            });

        return Object.entries(storeStats)
            .map(([store, stats]) => ({
                store,
                sales: stats.sales,
                expenses: stats.expenses,
                result: stats.sales - stats.expenses
            }))
            .sort((a, b) => b.sales - a.sales);
    };

    const getExpenseLists = () => {
        const periodTransactions = transactions.filter(t => 
            t.date && t.date.startsWith(currentMonth) && 
            filterStore(t.store) &&
            t.type === 'Despesa'
        );
        
        const periodOrders = orders.filter(o => 
            o.date && o.date.startsWith(currentMonth) && 
            filterStore(o.store)
        );

        const fixedList = periodTransactions
            .filter(t => t.classification === 'Fixa' || t.classification === 'Fixo')
            .map(t => ({ name: t.description || t.category || t.supplier || 'Sem Descrição', value: t.value || 0 }));

        const variableList = [
            ...periodTransactions
                .filter(t => t.classification !== 'Fixa' && t.classification !== 'Fixo')
                .map(t => ({ name: t.description || t.category || t.supplier || 'Sem Descrição', value: t.value || 0 })),
            ...periodOrders
                .map(o => ({ name: o.product || 'Produto', value: o.totalValue || 0 }))
        ];

        const groupAndSum = (list: any[]) => {
            const grouped: Record<string, number> = {};
            list.forEach(item => {
                grouped[item.name] = (grouped[item.name] || 0) + item.value;
            });
            return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        };

        const groupedFixed = groupAndSum(fixedList);
        const groupedVariable = groupAndSum(variableList);

        const sortFn = (type: 'alpha' | 'value') => (a: any, b: any) => {
            if (type === 'value') return b.value - a.value;
            return a.name.localeCompare(b.name);
        };

        return {
            fixed: groupedFixed.sort(sortFn(sortFixed)),
            variable: groupedVariable.sort(sortFn(sortVariable))
        };
    };

    const get043History = () => {
        const relevant = transactions043.filter(t => 
            filterStore(t.store) && t.date.slice(0, 7) <= currentMonth
        );
        const grouped: Record<string, { credit: number, debit: number }> = {};
        
        relevant.forEach(t => {
            const key = t.date.slice(0, 7);
            if (!grouped[key]) grouped[key] = { credit: 0, debit: 0 };
            if (t.type === 'CREDIT') grouped[key].credit += t.value;
            if (t.type === 'DEBIT') grouped[key].debit += t.value;
        });

        const sortedKeys = Object.keys(grouped).sort();
        const last12Keys = sortedKeys.slice(-12);

        return last12Keys.map(key => {
            const [y, m] = key.split('-');
            return { name: `${m}/${y}`, Credito: grouped[key].credit, Debito: grouped[key].debit };
        });
    };

    const getSaldosHistory = () => {
        const relevant = accountBalances.filter(b => {
            const key = `${b.year}-${b.month}`;
            return filterStore(b.store) && key <= currentMonth;
        });
        const grouped: Record<string, number> = {};
        relevant.forEach(b => {
            const key = `${b.year}-${b.month}`;
            if (!grouped[key]) grouped[key] = 0;
            grouped[key] += b.totalBalance;
        });

        const sortedKeys = Object.keys(grouped).sort();
        const last12Keys = sortedKeys.slice(-12);

        return last12Keys.map(key => {
            const [y, m] = key.split('-');
            return { name: `${m}/${y}`, value: grouped[key] };
        });
    };

    const metrics = calculateFinancialMetrics();
    const totalBalance = calculateTotalBalance();
    const storePerformance = getStorePerformance();
    const expenseLists = getExpenseLists();
    const data043 = get043History();
    const dataSaldos = getSaldosHistory();

    const tabs = [
        { id: 'geral', label: 'GERAL', disabled: false },
        { id: 'vendas', label: 'VENDAS', disabled: true, subtitle: 'Em Construção' },
        { id: 'compras', label: 'COMPRAS', disabled: true, subtitle: 'Em Construção' },
        { id: 'comparativo', label: 'COMPARATIVO', disabled: true, subtitle: 'Em Construção' },
        { id: 'fechamento', label: 'FECHAMENTO MÊS', disabled: true, subtitle: 'Em Construção' },
    ];

    if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin w-12 h-12 text-heroRed"/></div>;
    if (errorMsg) return <div className="p-8 text-center text-red-600 font-bold"><AlertCircle className="mx-auto mb-2"/>{errorMsg}</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6 animate-fadeIn">
             <div className="flex items-center justify-center mb-6">
                <h1 className="text-2xl font-black text-gray-700 uppercase">DASHBOARD GERENCIAL</h1>
            </div>

            {/* Tabs Navigation */}
            <div className="flex flex-wrap justify-center gap-3 mb-8 border-b border-gray-200 pb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                        disabled={tab.disabled}
                        className={`relative px-6 py-3 rounded-lg font-bold text-sm transition-all uppercase tracking-wide flex flex-col items-center min-w-[140px] ${
                            activeTab === tab.id 
                            ? 'bg-heroBlack text-white shadow-lg transform scale-105 z-10' 
                            : tab.disabled 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 hover:shadow-sm'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {tab.disabled && <Lock size={12} className="text-gray-400"/>}
                            {tab.label}
                        </div>
                        {tab.disabled && (
                            <span className="text-[8px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full mt-1 font-black tracking-wider flex items-center gap-1">
                                <Hammer size={8} /> EM CONSTRUÇÃO
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content - GERAL */}
            {activeTab === 'geral' && (
                <div className="animate-fadeIn">
                    {/* Top Filters */}
                    <div className="flex justify-end gap-4 mb-6 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                        <select 
                            value={selectedStore} 
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className={`bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-heroRed focus:border-heroRed block p-2.5 ${availableStores.length === 1 ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}`}
                            disabled={availableStores.length === 1}
                        >
                             {availableStores.length !== 1 && <option value="">Todas as Lojas</option>}
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input 
                            type="month" 
                            value={currentMonth}
                            onChange={(e) => setCurrentMonth(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-heroRed focus:border-heroRed block p-2.5"
                        />
                    </div>

                    {/* 1. KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <div className="bg-[#1A1A1A] text-white p-4 rounded-lg shadow-lg flex flex-col justify-center h-32">
                            <p className="text-xs font-bold uppercase opacity-70">SALDO TOTAL (ACUMULADO)</p>
                            <h3 className="text-2xl font-black mt-1 break-words">{formatCurrency(totalBalance)}</h3>
                        </div>
                        <div className="bg-[#C0392B] text-white p-4 rounded-lg shadow-lg flex flex-col justify-center h-32">
                            <p className="text-xs font-bold uppercase opacity-70">VENDAS MÊS</p>
                            <h3 className="text-2xl font-black mt-1 break-words">{formatCurrency(metrics.totalRevenues)}</h3>
                        </div>
                        <div className="bg-white text-gray-800 p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-center h-32">
                            <p className="text-xs font-bold text-gray-500 uppercase">DESPESAS FIXAS</p>
                            <h3 className="text-2xl font-black mt-1 text-heroBlack break-words">{formatCurrency(metrics.totalFixed)}</h3>
                        </div>
                        <div className="bg-white text-gray-800 p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-center h-32">
                            <p className="text-xs font-bold text-gray-500 uppercase">DESP. VARIÁVEIS</p>
                            <h3 className="text-2xl font-black mt-1 text-heroBlack break-words">{formatCurrency(metrics.totalVariable)}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-center h-32">
                            <p className="text-xs font-bold text-gray-500 uppercase">LUCRO LÍQUIDO</p>
                            <h3 className={`text-2xl font-black mt-1 break-words ${metrics.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(metrics.netResult)}
                            </h3>
                        </div>
                    </div>

                    {/* 2. Desempenho por Loja */}
                    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden mb-6">
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-gray-700 font-bold uppercase text-sm">DESEMPENHO POR LOJA (Mês Atual)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">LOJA</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-green-600 uppercase">VENDAS</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-red-600 uppercase">DESPESAS</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-blue-600 uppercase">RESULTADO</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {storePerformance.map((item) => (
                                        <tr key={item.store} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-sm font-bold text-gray-800">{item.store}</td>
                                            <td className="px-6 py-3 text-sm text-right font-mono text-green-700">{formatCurrency(item.sales)}</td>
                                            <td className="px-6 py-3 text-sm text-right font-mono text-red-700">{formatCurrency(item.expenses)}</td>
                                            <td className={`px-6 py-3 text-sm text-right font-mono font-bold ${item.result >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                                                {formatCurrency(item.result)}
                                            </td>
                                        </tr>
                                    ))}
                                    {storePerformance.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sem dados para o período.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. Charts Section (Last 12 Months) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        
                        {/* Controle 043 */}
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                            <h3 className="text-heroBlack font-bold uppercase text-sm mb-4 border-b pb-2 border-gray-100">CONTROLE 043 (Últimos 12 Meses)</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data043}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                                        <YAxis 
                                            tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)} 
                                            tick={{fontSize: 11}}
                                        />
                                        <Tooltip 
                                            formatter={(value: number) => formatCurrency(value)}
                                            cursor={{fill: 'transparent'}} 
                                        />
                                        <Legend />
                                        <Bar dataKey="Credito" name="Crédito" fill="#2ECC71" barSize={20} radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Debito" name="Débito" fill="#C0392B" barSize={20} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Saldo de Contas */}
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                            <h3 className="text-heroBlack font-bold uppercase text-sm mb-4 border-b pb-2 border-gray-100">SALDO DE CONTAS (Últimos 12 Meses)</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dataSaldos}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                                        <YAxis 
                                            tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)} 
                                            tick={{fontSize: 11}}
                                        />
                                        <Tooltip 
                                            formatter={(value: number) => formatCurrency(value)}
                                            cursor={{fill: 'rgba(0,0,0,0.05)'}} 
                                        />
                                        <Bar dataKey="value" name="Saldo Total" barSize={40} radius={[4, 4, 0, 0]}>
                                            {dataSaldos.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#1A1A1A' : '#C0392B'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* 4. Detailed Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Despesas Fixas List */}
                        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-gray-600 font-bold uppercase text-sm">DESPESAS FIXAS (Mês Atual)</h3>
                                <button onClick={() => setSortFixed(prev => prev === 'value' ? 'alpha' : 'value')} className="text-xs border px-2 py-1 rounded hover:bg-gray-50">
                                    {sortFixed === 'value' ? 'Ordenar: Valor' : 'Ordenar: A-Z'}
                                </button>
                            </div>
                            <div className="max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {expenseLists.fixed.length > 0 ? expenseLists.fixed.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm border-b border-gray-50 pb-1 hover:bg-gray-50">
                                        <span className="text-gray-600 truncate flex-1 mr-2">{item.name}</span>
                                        <span className="font-bold text-gray-800">{formatCurrency(item.value)}</span>
                                    </div>
                                )) : <p className="text-center text-gray-400 text-xs py-4">Nenhuma despesa fixa no período.</p>}
                            </div>
                        </div>

                        {/* Despesas Variáveis List */}
                        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-gray-600 font-bold uppercase text-sm">DESPESAS VARIÁVEIS (Mês Atual)</h3>
                                <button onClick={() => setSortVariable(prev => prev === 'value' ? 'alpha' : 'value')} className="text-xs border px-2 py-1 rounded hover:bg-gray-50">
                                    {sortVariable === 'value' ? 'Ordenar: Valor' : 'Ordenar: A-Z'}
                                </button>
                            </div>
                            <div className="max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {expenseLists.variable.length > 0 ? expenseLists.variable.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm border-b border-gray-50 pb-1 hover:bg-gray-50">
                                        <span className="text-gray-600 truncate flex-1 mr-2">{item.name}</span>
                                        <span className="font-bold text-gray-800">{formatCurrency(item.value)}</span>
                                    </div>
                                )) : <p className="text-center text-gray-400 text-xs py-4">Nenhuma despesa variável no período.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
