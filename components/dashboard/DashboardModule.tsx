import React, { useState, useEffect } from 'react';
import { 
    getAppData, 
    getOrders, 
    getDailyTransactions, 
    getFinancialAccounts,
    getTransactions043,
    getAccountBalances,
    formatCurrency
} from '../../services/storageService';
import { AppData, Order, DailyTransaction, FinancialAccount, Transaction043, AccountBalance } from '../../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell
} from 'recharts';
import { 
    Loader2
} from 'lucide-react';

export const DashboardModule: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [transactions043, setTransactions043] = useState<Transaction043[]>([]);
    const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);

    const [selectedStore, setSelectedStore] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

    const [sortFixed, setSortFixed] = useState<'alpha' | 'value'>('value');
    const [sortVariable, setSortVariable] = useState<'alpha' | 'value'>('value');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [d, o, t, a, t043, ab] = await Promise.all([
                getAppData(),
                getOrders(),
                getDailyTransactions(),
                getFinancialAccounts(),
                getTransactions043(),
                getAccountBalances()
            ]);
            setAppData(d);
            setOrders(o);
            setTransactions(t);
            setAccounts(a);
            setTransactions043(t043);
            setAccountBalances(ab);
        } catch (error) {
            console.error("Error loading dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const filterStore = (storeName: string | null | undefined) => !selectedStore || storeName === selectedStore;

    // --- KPIs Calculations ---

    const calculateFinancialMetrics = () => {
        const periodTransactions = transactions.filter(t => 
            t.date.startsWith(currentMonth) && 
            filterStore(t.store)
        );
        
        const periodOrders = orders.filter(o => 
            o.date.startsWith(currentMonth) && 
            filterStore(o.store)
        );

        const totalRevenues = periodTransactions
            .filter(t => t.type === 'Receita')
            .reduce((acc, t) => acc + t.value, 0);

        const totalFixed = periodTransactions
            .filter(t => t.type === 'Despesa' && (t.classification === 'Fixa' || t.classification === 'Fixo'))
            .reduce((acc, t) => acc + t.value, 0);

        const variableTrans = periodTransactions
            .filter(t => t.type === 'Despesa' && t.classification !== 'Fixa' && t.classification !== 'Fixo')
            .reduce((acc, t) => acc + t.value, 0);
            
        const variableOrders = periodOrders
            .reduce((acc, o) => acc + o.totalValue, 0);

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
        let total = 0;
        const accountsToSum = accounts.filter(a => filterStore(a.store));

        accountsToSum.forEach(acc => {
            let bal = acc.initialBalance;
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
        
        // Init stores (to show even those with 0)
        appData.stores.forEach(s => {
            if (filterStore(s)) {
                storeStats[s] = { sales: 0, expenses: 0 };
            }
        });

        // Sales
        transactions
            .filter(t => t.date.startsWith(currentMonth) && t.type === 'Receita' && filterStore(t.store))
            .forEach(t => {
                if (!storeStats[t.store]) storeStats[t.store] = { sales: 0, expenses: 0 };
                storeStats[t.store].sales += t.value;
            });

        // Expenses (Transactions)
        transactions
            .filter(t => t.date.startsWith(currentMonth) && t.type === 'Despesa' && filterStore(t.store))
            .forEach(t => {
                if (!storeStats[t.store]) storeStats[t.store] = { sales: 0, expenses: 0 };
                storeStats[t.store].expenses += t.value;
            });

        // Expenses (Orders)
        orders
            .filter(o => o.date.startsWith(currentMonth) && filterStore(o.store))
            .forEach(o => {
                if (!storeStats[o.store]) storeStats[o.store] = { sales: 0, expenses: 0 };
                storeStats[o.store].expenses += o.totalValue;
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
            t.date.startsWith(currentMonth) && 
            filterStore(t.store) &&
            t.type === 'Despesa'
        );
        
        const periodOrders = orders.filter(o => 
            o.date.startsWith(currentMonth) && 
            filterStore(o.store)
        );

        const fixedList = periodTransactions
            .filter(t => t.classification === 'Fixa' || t.classification === 'Fixo')
            .map(t => ({ name: t.description || t.category || t.supplier, value: t.value }));

        const variableList = [
            ...periodTransactions
                .filter(t => t.classification !== 'Fixa' && t.classification !== 'Fixo')
                .map(t => ({ name: t.description || t.category || t.supplier, value: t.value })),
            ...periodOrders
                .map(o => ({ name: o.product, value: o.totalValue }))
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

    // --- NEW: 043 DATA ---
    const get043Data = () => {
        const filtered = transactions043.filter(t => t.date.startsWith(currentMonth) && filterStore(t.store));
        const credit = filtered.filter(t => t.type === 'CREDIT').reduce((a, b) => a + b.value, 0);
        const debit = filtered.filter(t => t.type === 'DEBIT').reduce((a, b) => a + b.value, 0);
        
        return [{
            name: 'Geral',
            Credito: credit,
            Debito: debit
        }];
    };

    // --- NEW: SALDO CONTAS DATA ---
    const getSaldosData = () => {
        const [yearStr, monthStr] = currentMonth.split('-');
        const year = parseInt(yearStr);
        
        const filtered = accountBalances.filter(b => 
            b.year === year && 
            b.month === monthStr && 
            filterStore(b.store)
        );

        if (selectedStore) {
            // Breakdown accounts for specific store
            if (filtered.length === 0) return [];
            const b = filtered[0];
            return [
                { name: 'CX. Econ', value: b.caixaEconomica },
                { name: 'Cofre', value: b.cofre },
                { name: 'Loteria', value: b.loteria },
                { name: 'PagBank H', value: b.pagbankH },
                { name: 'PagBank D', value: b.pagbankD },
                { name: 'Inv.', value: b.investimentos },
            ];
        } else {
            // Compare stores
            return filtered.map(b => ({
                name: b.store,
                value: b.totalBalance
            }));
        }
    };

    const metrics = calculateFinancialMetrics();
    const totalBalance = calculateTotalBalance();
    const storePerformance = getStorePerformance();
    const expenseLists = getExpenseLists();
    const data043 = get043Data();
    const dataSaldos = getSaldosData();

    if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin w-12 h-12 text-heroRed"/></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6 animate-fadeIn">
             <div className="flex items-center justify-center mb-4">
                <h1 className="text-lg font-bold text-gray-600 uppercase">DASHBOARD GERENCIAL</h1>
            </div>

            {/* Top Filters */}
            <div className="flex justify-end gap-4 mb-6 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <select 
                    value={selectedStore} 
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-heroRed focus:border-heroRed block p-2.5"
                >
                    <option value="">Todas as Lojas</option>
                    {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input 
                    type="month" 
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-heroRed focus:border-heroRed block p-2.5"
                />
            </div>

            {/* 1. KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-gray-700 font-bold uppercase text-sm">DESEMPENHO POR LOJA</h3>
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

            {/* 3. Charts Section (CHANGED) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Controle 043 */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-heroBlack font-bold uppercase text-sm mb-4 border-b pb-2 border-gray-100">CONTROLE 043 (Mês Atual)</h3>
                    <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data043}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" hide />
                                <YAxis 
                                    tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)} 
                                    tick={{fontSize: 11}}
                                />
                                <Tooltip 
                                    formatter={(value: number) => formatCurrency(value)}
                                    cursor={{fill: 'transparent'}} 
                                />
                                <Legend />
                                <Bar dataKey="Credito" name="Crédito (043)" fill="#2ECC71" barSize={60} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Debito" name="Débito (043)" fill="#C0392B" barSize={60} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                 {/* Saldo de Contas */}
                 <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-heroBlack font-bold uppercase text-sm mb-4 border-b pb-2 border-gray-100">SALDO DE CONTAS (Mês Atual)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={dataSaldos} layout={selectedStore ? 'horizontal' : 'horizontal'}>
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
                                <Bar dataKey="value" name="Saldo" barSize={40} radius={[4, 4, 0, 0]}>
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
                        <h3 className="text-gray-600 font-bold uppercase text-sm">DESPESAS FIXAS</h3>
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
                        <h3 className="text-gray-600 font-bold uppercase text-sm">DESPESAS VARIÁVEIS</h3>
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
    );
};