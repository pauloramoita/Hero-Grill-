import React, { useState, useEffect } from 'react';
import { 
    getAppData, 
    getOrders, 
    getDailyTransactions, 
    getFinancialAccounts,
    getAccountBalances,
    formatCurrency
} from '../../services/storageService';
import { AppData, Order, DailyTransaction, FinancialAccount, AccountBalance } from '../../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { 
    LayoutDashboard, Store, Loader2, BarChart2, ArrowUpRight, SortAsc, SortDesc
} from 'lucide-react';

export const DashboardModule: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
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
            const [d, o, t, a, ab] = await Promise.all([
                getAppData(),
                getOrders(),
                getDailyTransactions(),
                getFinancialAccounts(),
                getAccountBalances()
            ]);
            setAppData(d);
            setOrders(o);
            setTransactions(t);
            setAccounts(a);
            setAccountBalances(ab);
        } catch (error) {
            console.error("Error loading dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const filterStore = (storeName: string | null | undefined) => !selectedStore || storeName === selectedStore;

    const getProjectionFactor = () => {
        const today = new Date();
        const [year, month] = currentMonth.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, 1);
        
        if (today.getMonth() !== selectedDate.getMonth() || today.getFullYear() !== selectedDate.getFullYear()) {
            return 1;
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        const daysPassed = today.getDate();
        
        if (daysPassed === 0) return 1;
        return daysInMonth / daysPassed;
    };

    const calculateMetrics = () => {
        const factor = getProjectionFactor();

        const expensesList = [
            ...orders
                .filter(o => o.date.startsWith(currentMonth) && filterStore(o.store))
                .map(o => ({
                    name: o.product,
                    value: o.totalValue,
                    type: o.type || 'Variável',
                    store: o.store
                })),
            ...transactions
                .filter(t => t.date.startsWith(currentMonth) && t.type === 'Despesa' && filterStore(t.store))
                .map(t => ({
                    name: t.description || t.category || t.supplier,
                    value: t.value,
                    type: t.classification || 'Variável',
                    store: t.store
                }))
        ];

        const revenuesList = transactions
            .filter(t => t.date.startsWith(currentMonth) && t.type === 'Receita' && filterStore(t.store))
            .map(t => ({
                name: t.description || t.category,
                value: t.value,
                store: t.store
            }));

        const totalRevenues = revenuesList.reduce((acc, item) => acc + item.value, 0);
        const totalExpenses = expensesList.reduce((acc, item) => acc + item.value, 0);
        const totalFixed = expensesList.filter(e => e.type === 'Fixa' || e.type === 'Fixo').reduce((acc, item) => acc + item.value, 0);
        
        return {
            totalRevenues,
            totalExpenses,
            totalFixed,
            netResult: totalRevenues - totalExpenses,
            projectedRevenues: totalRevenues * factor,
            projectedExpenses: totalExpenses * factor,
            expensesList,
            revenuesList
        };
    };

    const metrics = calculateMetrics();

    const getStorePerformance = () => {
        const stores = appData.stores.filter(s => filterStore(s));
        const factor = getProjectionFactor();
        const performanceData: any[] = [];

        stores.forEach(store => {
            const storeRev = transactions
                .filter(t => t.date.startsWith(currentMonth) && t.type === 'Receita' && t.store === store)
                .reduce((acc, t) => acc + t.value, 0);

            const storeOrd = orders
                .filter(o => o.date.startsWith(currentMonth) && o.store === store)
                .reduce((acc, o) => acc + o.totalValue, 0);
            
            const storeTransExp = transactions
                .filter(t => t.date.startsWith(currentMonth) && t.type === 'Despesa' && t.store === store)
                .reduce((acc, t) => acc + t.value, 0);

            const storeExp = storeOrd + storeTransExp;

            performanceData.push({
                store,
                revenue: storeRev,
                projRevenue: storeRev * factor,
                expense: storeExp,
                projExpense: storeExp * factor,
                result: storeRev - storeExp
            });
        });

        return performanceData.sort((a, b) => b.revenue - a.revenue);
    };

    const storePerformance = getStorePerformance();

    const getExpenseLists = () => {
        const fixed = metrics.expensesList.filter(e => e.type === 'Fixa' || e.type === 'Fixo');
        const variable = metrics.expensesList.filter(e => e.type === 'Variável' || e.type === 'Variavel' || !e.type);

        const groupAndSum = (list: any[]) => {
            const grouped: Record<string, number> = {};
            list.forEach(item => {
                grouped[item.name] = (grouped[item.name] || 0) + item.value;
            });
            return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        };

        const groupedFixed = groupAndSum(fixed);
        const groupedVariable = groupAndSum(variable);

        const sortFn = (type: 'alpha' | 'value') => (a: any, b: any) => {
            if (type === 'value') return b.value - a.value;
            return a.name.localeCompare(b.name);
        };

        return {
            fixed: groupedFixed.sort(sortFn(sortFixed)),
            variable: groupedVariable.sort(sortFn(sortVariable))
        };
    };

    const expenseLists = getExpenseLists();

    // --- Total Saldo Logic (from AccountBalances) ---
    const getCurrentTotalBalance = () => {
        const [y, m] = currentMonth.split('-');
        // Filter balances for current month selection
        const relevant = accountBalances.filter(b => 
            b.year === parseInt(y) && 
            b.month === m && 
            filterStore(b.store)
        );
        return relevant.reduce((acc, b) => acc + b.totalBalance, 0);
    };
    const totalBalance = getCurrentTotalBalance();

    const getBalanceHistory = () => {
        const grouped: Record<string, number> = {};
        accountBalances.forEach(b => {
            if (selectedStore && b.store !== selectedStore) return;
            const sortKey = `${b.year}-${b.month}`;
            if (!grouped[sortKey]) grouped[sortKey] = 0;
            grouped[sortKey] += b.totalBalance;
        });

        const data = Object.entries(grouped)
            .map(([key, value]) => {
                const [year, month] = key.split('-');
                return {
                    sortKey: key,
                    name: `${month}/${year.slice(2)}`,
                    Saldo: value
                };
            })
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        return data.slice(-12);
    };

    const balanceHistory = getBalanceHistory();

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

            {/* KPI Cards - New Design */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. Saldo Total (Black) */}
                <div className="bg-[#1A1A1A] text-white p-6 rounded-lg shadow-lg flex flex-col justify-center h-32">
                    <p className="text-xs font-bold uppercase opacity-70">SALDO TOTAL</p>
                    <h3 className="text-3xl font-black mt-1">{formatCurrency(totalBalance)}</h3>
                </div>

                {/* 2. Vendas Mês (Red) */}
                <div className="bg-[#C0392B] text-white p-6 rounded-lg shadow-lg flex flex-col justify-center h-32">
                    <p className="text-xs font-bold uppercase opacity-70">VENDAS MÊS</p>
                    <h3 className="text-3xl font-black mt-1">{formatCurrency(metrics.totalRevenues)}</h3>
                </div>

                {/* 3. Despesas Fixas (White) */}
                <div className="bg-white text-gray-800 p-6 rounded-lg shadow border border-gray-200 flex flex-col justify-center h-32">
                    <p className="text-xs font-bold text-gray-500 uppercase">DESPESAS FIXAS</p>
                    <h3 className="text-3xl font-black mt-1 text-heroBlack">{formatCurrency(metrics.totalFixed)}</h3>
                </div>

                {/* 4. Lucro Líquido (White with Green Text) */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col justify-center h-32">
                    <p className="text-xs font-bold text-gray-500 uppercase">LUCRO LÍQUIDO</p>
                    <h3 className={`text-3xl font-black mt-1 ${metrics.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(metrics.netResult)}
                    </h3>
                </div>
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Receitas x Despesas (Simplified) */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-heroRed font-bold uppercase text-sm mb-4 border-b pb-2 border-gray-100">RECEITAS X DESPESAS</h3>
                    <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{ name: 'Atual', receitas: metrics.totalRevenues, despesas: metrics.totalExpenses }]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" hide />
                                <YAxis tickFormatter={(val) => `R$${val/1000}k`} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Legend />
                                <Bar dataKey="receitas" name="Receita" fill="#2ECC71" barSize={60} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="despesas" name="Despesa" fill="#C0392B" barSize={60} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                 {/* Evolução de Saldo */}
                 <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-heroRed font-bold uppercase text-sm mb-4 border-b pb-2 border-gray-100">EVOLUÇÃO DO SALDO</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={balanceHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#C0392B" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#C0392B" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" tick={{fontSize: 10}} stroke="#9CA3AF" />
                                <YAxis tick={{fontSize: 10}} tickFormatter={(val) => `${val/1000}k`} stroke="#9CA3AF" />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip />
                                <Area 
                                    type="monotone" 
                                    dataKey="Saldo" 
                                    stroke="#C0392B" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorSaldo)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Tables */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Despesas Fixas List */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-600 font-bold uppercase text-sm">Despesas Fixas</h3>
                         <button onClick={() => setSortFixed(prev => prev === 'value' ? 'alpha' : 'value')} className="text-xs border px-2 py-1 rounded">
                            {sortFixed === 'value' ? 'Ordenar: Valor' : 'Ordenar: A-Z'}
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
                        {expenseLists.fixed.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm border-b border-gray-50 pb-1">
                                <span className="text-gray-600">{item.name}</span>
                                <span className="font-bold text-gray-800">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Despesas Variáveis List */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-600 font-bold uppercase text-sm">Despesas Variáveis</h3>
                        <button onClick={() => setSortVariable(prev => prev === 'value' ? 'alpha' : 'value')} className="text-xs border px-2 py-1 rounded">
                            {sortVariable === 'value' ? 'Ordenar: Valor' : 'Ordenar: A-Z'}
                        </button>
                    </div>
                     <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
                        {expenseLists.variable.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm border-b border-gray-50 pb-1">
                                <span className="text-gray-600">{item.name}</span>
                                <span className="font-bold text-gray-800">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Store Performance */}
             <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                 <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-gray-700 font-bold uppercase text-sm">Desempenho por Loja</h3>
                 </div>
                 <table className="min-w-full text-sm">
                    <thead className="bg-white text-gray-500">
                        <tr>
                            <th className="px-6 py-3 text-left font-bold uppercase">Loja</th>
                            <th className="px-6 py-3 text-right font-bold uppercase text-green-600">Vendas</th>
                            <th className="px-6 py-3 text-right font-bold uppercase text-red-600">Despesas</th>
                            <th className="px-6 py-3 text-right font-bold uppercase text-blue-600">Projeção Venda</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {storePerformance.map((s, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-bold text-gray-700">{s.store}</td>
                                <td className="px-6 py-3 text-right font-mono text-green-700">{formatCurrency(s.revenue)}</td>
                                <td className="px-6 py-3 text-right font-mono text-red-700">{formatCurrency(s.expense)}</td>
                                <td className="px-6 py-3 text-right font-mono font-bold text-blue-700">{formatCurrency(s.projRevenue)}</td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};