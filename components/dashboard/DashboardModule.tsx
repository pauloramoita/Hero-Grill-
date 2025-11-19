
import React, { useState, useEffect } from 'react';
import { 
    getAppData, 
    getOrders, 
    getDailyTransactions, 
    getFinancialAccounts,
    formatCurrency
} from '../../services/storageService';
import { AppData, Order, DailyTransaction, FinancialAccount } from '../../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
    LayoutDashboard, TrendingUp, TrendingDown, DollarSign, 
    Calendar, Store, ArrowUpRight, ArrowDownRight, Wallet, Loader2
} from 'lucide-react';

export const DashboardModule: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    
    // Raw Data
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

    // Filters
    const [selectedStore, setSelectedStore] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [d, o, t, a] = await Promise.all([
            getAppData(),
            getOrders(),
            getDailyTransactions(),
            getFinancialAccounts()
        ]);
        setAppData(d);
        setOrders(o);
        setTransactions(t);
        setAccounts(a);
        setLoading(false);
    };

    // === DATA PROCESSING LOGIC ===

    // Helper: Check if item belongs to selected store
    const filterStore = (storeName: string) => !selectedStore || storeName === selectedStore;
    
    // Helper: Calculate Account Balances
    const calculateAccountBalances = () => {
        return accounts.filter(acc => filterStore(acc.store)).map(acc => {
            let balance = acc.initialBalance;
            transactions.forEach(t => {
                if (t.status === 'Pago') {
                    if (t.accountId === acc.id) {
                        if (t.type === 'Receita') balance += t.value;
                        if (t.type === 'Despesa' || t.type === 'Transferência') balance -= t.value;
                    }
                    if (t.type === 'Transferência' && t.destinationAccountId === acc.id) {
                        balance += t.value;
                    }
                }
            });
            return { ...acc, currentBalance: balance };
        });
    };

    const accountBalances = calculateAccountBalances();
    const totalBalance = accountBalances.reduce((sum, acc) => sum + acc.currentBalance, 0);

    // Helper: Get Historical Balance for Chart (Last 12 Months) - Approximate based on transaction dates
    const getHistoricalBalances = () => {
        const history: any[] = [];
        const today = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStr = d.toISOString().slice(0, 7);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 0).toISOString().split('T')[0];

            let monthlyBalance = 0;
            // Start with initial
            accounts.filter(acc => filterStore(acc.store)).forEach(acc => monthlyBalance += acc.initialBalance);

            // Apply transactions up to end of that month
            transactions.forEach(t => {
                if (t.status === 'Pago' && t.date <= endOfMonth && filterStore(t.store || '')) {
                     if (t.type === 'Receita') monthlyBalance += t.value;
                     if (t.type === 'Despesa') monthlyBalance -= t.value;
                }
            });

            history.push({
                month: `${d.getMonth() + 1}/${d.getFullYear().toString().substr(2)}`,
                saldo: monthlyBalance
            });
        }
        return history;
    };

    // Current Month Metrics
    const getMonthlyMetrics = () => {
        // 1. Despesas (Orders + Transactions type 'Despesa')
        const monthOrders = orders.filter(o => o.date.startsWith(currentMonth) && filterStore(o.store));
        const monthTrans = transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'Despesa' && filterStore(t.store));
        
        const totalOrdersVal = monthOrders.reduce((acc, o) => acc + o.totalValue, 0);
        const totalTransVal = monthTrans.reduce((acc, t) => acc + t.value, 0);
        
        const totalExpenses = totalOrdersVal + totalTransVal;

        // 2. Receitas (Transactions type 'Receita')
        const monthRevenues = transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'Receita' && filterStore(t.store));
        const totalRevenues = monthRevenues.reduce((acc, t) => acc + t.value, 0);

        // 3. Projections
        const today = new Date();
        const currentMonthDate = new Date(currentMonth + '-02'); // Avoid timezone issues
        const isSameMonth = today.getMonth() === currentMonthDate.getMonth() && today.getFullYear() === currentMonthDate.getFullYear();
        
        const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
        const daysPassed = isSameMonth ? today.getDate() : daysInMonth;
        
        const projectedExpenses = daysPassed > 0 ? (totalExpenses / daysPassed) * daysInMonth : totalExpenses;
        const projectedRevenues = daysPassed > 0 ? (totalRevenues / daysPassed) * daysInMonth : totalRevenues;

        return {
            totalExpenses,
            totalRevenues,
            projectedExpenses,
            projectedRevenues,
            monthOrders,
            monthTrans
        };
    };

    const metrics = getMonthlyMetrics();
    const historicalBalanceData = getHistoricalBalances();

    // Comparison Data (Month vs Month)
    const getComparisonData = () => {
        const data: any[] = [];
        const today = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const mStr = d.toISOString().slice(0, 7);
            
            // Calc Expenses
            const oVal = orders.filter(o => o.date.startsWith(mStr) && filterStore(o.store)).reduce((a, b) => a + b.totalValue, 0);
            const tVal = transactions.filter(t => t.date.startsWith(mStr) && t.type === 'Despesa' && filterStore(t.store)).reduce((a, b) => a + b.value, 0);
            
            // Calc Revenues
            const rVal = transactions.filter(t => t.date.startsWith(mStr) && t.type === 'Receita' && filterStore(t.store)).reduce((a, b) => a + b.value, 0);

            data.push({
                name: `${d.getMonth() + 1}/${d.getFullYear().toString().substr(2)}`,
                Despesas: oVal + tVal,
                Receitas: rVal
            });
        }
        return data;
    };

    const comparisonData = getComparisonData();

    const getExpenseLists = () => {
        // Combine Orders and Expense Transactions
        const allExpenses = [
            ...metrics.monthOrders.map(o => ({ 
                name: o.product, 
                val: o.totalValue, 
                type: o.type || 'Variável',
                origin: 'Pedido'
            })),
            ...metrics.monthTrans.map(t => ({ 
                name: t.description || t.category || 'Despesa Diversa', 
                val: t.value, 
                type: t.classification || 'Fixa', // Usa a classificação do banco, ou Fixa se vazio
                origin: 'Financeiro'
            }))
        ];

        const fixed = allExpenses.filter(e => e.type === 'Fixa');
        const variable = allExpenses.filter(e => e.type !== 'Fixa'); // Todo o resto é variável

        return {
            fixedAlpha: [...fixed].sort((a, b) => a.name.localeCompare(b.name)),
            fixedValue: [...fixed].sort((a, b) => b.val - a.val),
            varAlpha: [...variable].sort((a, b) => a.name.localeCompare(b.name)),
            varValue: [...variable].sort((a, b) => b.val - a.val),
        };
    };

    const expenseLists = getExpenseLists();

    if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin w-12 h-12 text-heroRed"/></div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="bg-heroBlack p-2 rounded text-white">
                        <LayoutDashboard size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 uppercase italic">Dashboard Gerencial</h1>
                        <p className="text-sm text-gray-500">Visão unificada do seu negócio</p>
                    </div>
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Store className="absolute left-3 top-3 text-gray-400" size={16} />
                        <select 
                            value={selectedStore} 
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold focus:ring-heroRed focus:border-heroRed"
                        >
                            <option value="">Todas as Lojas (Consolidado)</option>
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1 md:w-48">
                        <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input 
                            type="month" 
                            value={currentMonth}
                            onChange={(e) => setCurrentMonth(e.target.value)}
                            className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold focus:ring-heroRed focus:border-heroRed"
                        />
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* KPI Cards Row - Spanning Columns */}
                <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Balance */}
                    <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500 flex flex-col justify-between h-32 relative overflow-hidden">
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Saldo Acumulado</p>
                                <h3 className={`text-2xl font-black mt-1 ${totalBalance >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                                    {formatCurrency(totalBalance)}
                                </h3>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <Wallet size={24} />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-auto z-10">Total de todas as contas</p>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-50 rounded-full opacity-50"></div>
                    </div>

                    {/* Revenues */}
                    <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500 flex flex-col justify-between h-32 relative overflow-hidden">
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vendas do Mês</p>
                                <h3 className="text-2xl font-black text-green-700 mt-1">{formatCurrency(metrics.totalRevenues)}</h3>
                            </div>
                            <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                <TrendingUp size={24} />
                            </div>
                        </div>
                         <div className="flex items-center gap-1 mt-auto z-10 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded w-fit">
                            Projeção: {formatCurrency(metrics.projectedRevenues)}
                        </div>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-green-50 rounded-full opacity-50"></div>
                    </div>

                    {/* Expenses */}
                    <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500 flex flex-col justify-between h-32 relative overflow-hidden">
                         <div className="flex justify-between items-start z-10">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Despesas do Mês</p>
                                <h3 className="text-2xl font-black text-red-700 mt-1">{formatCurrency(metrics.totalExpenses)}</h3>
                            </div>
                            <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                <TrendingDown size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 mt-auto z-10 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded w-fit">
                            Projeção: {formatCurrency(metrics.projectedExpenses)}
                        </div>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-red-50 rounded-full opacity-50"></div>
                    </div>

                    {/* Result */}
                    <div className="bg-gray-900 p-6 rounded-xl shadow-md border-l-4 border-gray-700 flex flex-col justify-between h-32 relative overflow-hidden">
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resultado Líquido</p>
                                <h3 className={`text-2xl font-black mt-1 ${metrics.totalRevenues - metrics.totalExpenses >= 0 ? 'text-white' : 'text-red-400'}`}>
                                    {formatCurrency(metrics.totalRevenues - metrics.totalExpenses)}
                                </h3>
                            </div>
                            <div className="p-2 bg-gray-800 rounded-lg text-white">
                                <DollarSign size={24} />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-auto z-10">Receitas - Despesas</p>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-gray-800 rounded-full opacity-50"></div>
                    </div>
                </div>

                {/* Row 2: Charts Area */}
                <div className="lg:col-span-3 grid grid-cols-1 gap-6">
                    {/* Comparison Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-6 flex items-center gap-2">
                            <BarChart size={18} /> Comparativo Mensal: Receitas vs Despesas (6 Meses)
                        </h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                                    <YAxis tick={{fontSize: 12}} tickFormatter={(val) => `R$${val/1000}k`} />
                                    <Tooltip 
                                        formatter={(val: number) => formatCurrency(val)}
                                        contentStyle={{backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff'}}
                                    />
                                    <Legend />
                                    <Bar dataKey="Receitas" fill="#10B981" radius={[4,4,0,0]} barSize={30} />
                                    <Bar dataKey="Despesas" fill="#EF4444" radius={[4,4,0,0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* Evolution of Balance Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                         <h3 className="text-sm font-bold text-gray-700 uppercase mb-6 flex items-center gap-2">
                            <TrendingUp size={18} /> Evolução do Saldo (12 Meses)
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historicalBalanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" tick={{fontSize: 12}}/>
                                    <YAxis tick={{fontSize: 12}} tickFormatter={(val) => `R$${val/1000}k`}/>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3}/>
                                    <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{borderRadius: '8px'}}/>
                                    <Area type="monotone" dataKey="saldo" stroke="#3B82F6" fillOpacity={1} fill="url(#colorSaldo)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Row 2: Side Panel (Account Balances List) */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-700 uppercase text-xs">Saldos por Loja/Conta</h3>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-[650px] space-y-4">
                        {accountBalances.map(acc => (
                            <div key={acc.id} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                                <div>
                                    <div className="text-xs text-gray-400 font-bold">{acc.store}</div>
                                    <div className="text-sm font-medium text-gray-700 truncate w-28" title={acc.name}>{acc.name}</div>
                                </div>
                                <div className={`text-sm font-bold ${acc.currentBalance < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                    {formatCurrency(acc.currentBalance)}
                                </div>
                            </div>
                        ))}
                        {accountBalances.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Nenhuma conta.</p>}
                    </div>
                </div>

                {/* Row 3: Expense Details Grid */}
                <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Despesas Fixas */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 uppercase text-sm">Despesas Fixas</h3>
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Top 10</span>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-gray-100">
                            <div className="p-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Por Valor (Decrescente)</h4>
                                <ul className="space-y-2">
                                    {expenseLists.fixedValue.slice(0, 10).map((e, i) => (
                                        <li key={i} className="flex justify-between text-xs">
                                            <span className="truncate w-32" title={e.name}>{e.name}</span>
                                            <span className="font-bold">{formatCurrency(e.val)}</span>
                                        </li>
                                    ))}
                                    {expenseLists.fixedValue.length === 0 && <li className="text-xs text-gray-300 italic">Sem dados</li>}
                                </ul>
                            </div>
                            <div className="p-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Alfabética (A-Z)</h4>
                                <ul className="space-y-2">
                                    {expenseLists.fixedAlpha.slice(0, 10).map((e, i) => (
                                        <li key={i} className="flex justify-between text-xs">
                                            <span className="truncate w-32" title={e.name}>{e.name}</span>
                                            <span className="font-bold text-gray-500">{formatCurrency(e.val)}</span>
                                        </li>
                                    ))}
                                    {expenseLists.fixedAlpha.length === 0 && <li className="text-xs text-gray-300 italic">Sem dados</li>}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Despesas Variáveis */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 uppercase text-sm">Despesas Variáveis</h3>
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Top 10</span>
                        </div>
                         <div className="grid grid-cols-2 divide-x divide-gray-100">
                            <div className="p-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Por Valor (Decrescente)</h4>
                                <ul className="space-y-2">
                                    {expenseLists.varValue.slice(0, 10).map((e, i) => (
                                        <li key={i} className="flex justify-between text-xs">
                                            <span className="truncate w-32" title={e.name}>{e.name}</span>
                                            <span className="font-bold">{formatCurrency(e.val)}</span>
                                        </li>
                                    ))}
                                    {expenseLists.varValue.length === 0 && <li className="text-xs text-gray-300 italic">Sem dados</li>}
                                </ul>
                            </div>
                            <div className="p-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Alfabética (A-Z)</h4>
                                <ul className="space-y-2">
                                    {expenseLists.varAlpha.slice(0, 10).map((e, i) => (
                                        <li key={i} className="flex justify-between text-xs">
                                            <span className="truncate w-32" title={e.name}>{e.name}</span>
                                            <span className="font-bold text-gray-500">{formatCurrency(e.val)}</span>
                                        </li>
                                    ))}
                                    {expenseLists.varAlpha.length === 0 && <li className="text-xs text-gray-300 italic">Sem dados</li>}
                                </ul>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
