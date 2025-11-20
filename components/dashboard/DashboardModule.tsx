
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
    AreaChart, Area, ComposedChart, Line
} from 'recharts';
import { 
    LayoutDashboard, TrendingUp, TrendingDown, DollarSign, 
    Calendar, Store, Wallet, Loader2, BarChart2, ArrowUpRight, ArrowDownRight, Filter, SortAsc, SortDesc
} from 'lucide-react';

export const DashboardModule: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

    const [selectedStore, setSelectedStore] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

    // Sorting States for Lists
    const [sortFixed, setSortFixed] = useState<'alpha' | 'value'>('value');
    const [sortVariable, setSortVariable] = useState<'alpha' | 'value'>('value');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
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
        } catch (error) {
            console.error("Error loading dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    // --- HELPER FUNCTIONS ---

    const filterStore = (storeName: string | null | undefined) => !selectedStore || storeName === selectedStore;

    const getProjectionFactor = () => {
        const today = new Date();
        const [year, month] = currentMonth.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, 1);
        
        // Se não for o mês atual, fator é 1 (sem projeção, usa real)
        if (today.getMonth() !== selectedDate.getMonth() || today.getFullYear() !== selectedDate.getFullYear()) {
            return 1;
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        const daysPassed = today.getDate();
        
        if (daysPassed === 0) return 1;
        return daysInMonth / daysPassed;
    };

    // --- DATA PROCESSING ---

    const calculateMetrics = () => {
        const factor = getProjectionFactor();

        // 1. Aggregate Expenses (Orders + Transactions type 'Despesa')
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

        // 2. Aggregate Revenues
        const revenuesList = transactions
            .filter(t => t.date.startsWith(currentMonth) && t.type === 'Receita' && filterStore(t.store))
            .map(t => ({
                name: t.description || t.category,
                value: t.value,
                store: t.store
            }));

        const totalRevenues = revenuesList.reduce((acc, item) => acc + item.value, 0);
        const totalExpenses = expensesList.reduce((acc, item) => acc + item.value, 0);
        
        return {
            totalRevenues,
            totalExpenses,
            projectedRevenues: totalRevenues * factor,
            projectedExpenses: totalExpenses * factor,
            expensesList,
            revenuesList
        };
    };

    const metrics = calculateMetrics();

    // --- STORE PERFORMANCE DATA ---

    const getStorePerformance = () => {
        const stores = appData.stores.filter(s => filterStore(s));
        const factor = getProjectionFactor();
        const performanceData: any[] = [];

        stores.forEach(store => {
            // Revenues
            const storeRev = transactions
                .filter(t => t.date.startsWith(currentMonth) && t.type === 'Receita' && t.store === store)
                .reduce((acc, t) => acc + t.value, 0);

            // Expenses (Orders + Trans)
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

    // --- LISTS DATA (FIXED vs VARIABLE) ---

    const getExpenseLists = () => {
        const fixed = metrics.expensesList.filter(e => e.type === 'Fixa' || e.type === 'Fixo');
        const variable = metrics.expensesList.filter(e => e.type === 'Variável' || e.type === 'Variavel' || !e.type);

        // Group by Name to avoid duplicates in list
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

    // --- HISTORICAL DATA ---

    const getComparisonData = () => {
        const data: any[] = [];
        const today = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const mStr = d.toISOString().slice(0, 7);
            
            const oVal = orders.filter(o => o.date.startsWith(mStr) && filterStore(o.store)).reduce((a, b) => a + b.totalValue, 0);
            const tExp = transactions.filter(t => t.date.startsWith(mStr) && t.type === 'Despesa' && filterStore(t.store)).reduce((a, b) => a + b.value, 0);
            const tRev = transactions.filter(t => t.date.startsWith(mStr) && t.type === 'Receita' && filterStore(t.store)).reduce((a, b) => a + b.value, 0);

            data.push({
                name: `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`,
                Receitas: tRev,
                Despesas: oVal + tExp,
            });
        }
        return data;
    };

    const comparisonData = getComparisonData();

    if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin w-12 h-12 text-heroRed"/></div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 animate-fadeIn">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="bg-heroBlack p-2 rounded text-white">
                        <LayoutDashboard size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 uppercase italic">Dashboard Gerencial</h1>
                        <p className="text-sm text-gray-500">Visão unificada e projeções</p>
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

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-gray-500 uppercase">Saldo Líquido (Real)</p>
                    <h3 className={`text-2xl font-black mt-1 ${metrics.totalRevenues - metrics.totalExpenses >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                        {formatCurrency(metrics.totalRevenues - metrics.totalExpenses)}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
                    <p className="text-xs font-bold text-gray-500 uppercase">Receitas (Real)</p>
                    <h3 className="text-2xl font-black mt-1 text-green-700">{formatCurrency(metrics.totalRevenues)}</h3>
                    <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded w-fit flex items-center gap-1">
                         <ArrowUpRight size={12}/> Projeção: {formatCurrency(metrics.projectedRevenues)}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
                    <p className="text-xs font-bold text-gray-500 uppercase">Despesas (Real)</p>
                    <h3 className="text-2xl font-black mt-1 text-red-700">{formatCurrency(metrics.totalExpenses)}</h3>
                    <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded w-fit flex items-center gap-1">
                         <ArrowUpRight size={12}/> Projeção: {formatCurrency(metrics.projectedExpenses)}
                    </div>
                </div>
                 <div className="bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-gray-600 text-white">
                    <p className="text-xs font-bold text-gray-400 uppercase">Resultado Projetado</p>
                    <h3 className={`text-2xl font-black mt-1 ${metrics.projectedRevenues - metrics.projectedExpenses >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(metrics.projectedRevenues - metrics.projectedExpenses)}
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* CHART: Comparativo Mensal */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-6 flex items-center gap-2">
                        <BarChart2 size={18} /> Comparativo Mensal: Receitas vs Despesas
                    </h3>
                    <div className="h-80 w-full">
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
                                <Bar dataKey="Receitas" fill="#10B981" radius={[4,4,0,0]} barSize={40} />
                                <Bar dataKey="Despesas" fill="#EF4444" radius={[4,4,0,0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TABLE: Performance por Loja */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                         <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                            <Store size={18} /> Performance por Loja
                        </h3>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <table className="min-w-full">
                            <thead className="bg-gray-100 text-xs uppercase font-bold text-gray-500">
                                <tr>
                                    <th className="px-4 py-2 text-left">Loja</th>
                                    <th className="px-4 py-2 text-right">Venda</th>
                                    <th className="px-4 py-2 text-right">Despesa</th>
                                    <th className="px-4 py-2 text-right">Proj. Venda</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {storePerformance.map((store, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-xs font-bold text-gray-700">{store.store}</td>
                                        <td className="px-4 py-3 text-xs text-right font-mono text-green-600">{formatCurrency(store.revenue)}</td>
                                        <td className="px-4 py-3 text-xs text-right font-mono text-red-600">{formatCurrency(store.expense)}</td>
                                        <td className="px-4 py-3 text-xs text-right font-mono font-bold text-blue-600 bg-blue-50">{formatCurrency(store.projRevenue)}</td>
                                    </tr>
                                ))}
                                {storePerformance.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400 text-xs">Sem dados</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* EXPENSE LISTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fixed Expenses */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                             <div className="w-3 h-3 bg-blue-500 rounded-full"></div> Despesas Fixas
                        </h3>
                        <button 
                            onClick={() => setSortFixed(prev => prev === 'value' ? 'alpha' : 'value')}
                            className="text-xs flex items-center gap-1 bg-white border px-2 py-1 rounded hover:bg-gray-100 font-bold text-gray-600"
                        >
                            {sortFixed === 'value' ? <><SortDesc size={14}/> Valor Maior</> : <><SortAsc size={14}/> A-Z</>}
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2">
                        {expenseLists.fixed.map((item, idx) => (
                             <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-50 hover:bg-blue-50/30 rounded transition-colors">
                                <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                                <span className="text-sm font-bold text-gray-800">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                        {expenseLists.fixed.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">Nenhuma despesa fixa encontrada.</p>}
                    </div>
                    <div className="p-3 bg-gray-50 text-right text-xs font-bold text-gray-500 border-t">
                        Total Fixas: {formatCurrency(expenseLists.fixed.reduce((a,b) => a + b.value, 0))}
                    </div>
                </div>

                {/* Variable Expenses */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                             <div className="w-3 h-3 bg-orange-500 rounded-full"></div> Despesas Variáveis
                        </h3>
                        <button 
                            onClick={() => setSortVariable(prev => prev === 'value' ? 'alpha' : 'value')}
                            className="text-xs flex items-center gap-1 bg-white border px-2 py-1 rounded hover:bg-gray-100 font-bold text-gray-600"
                        >
                            {sortVariable === 'value' ? <><SortDesc size={14}/> Valor Maior</> : <><SortAsc size={14}/> A-Z</>}
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2">
                         {expenseLists.variable.map((item, idx) => (
                             <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-50 hover:bg-orange-50/30 rounded transition-colors">
                                <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                                <span className="text-sm font-bold text-gray-800">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                         {expenseLists.variable.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">Nenhuma despesa variável encontrada.</p>}
                    </div>
                     <div className="p-3 bg-gray-50 text-right text-xs font-bold text-gray-500 border-t">
                        Total Variáveis: {formatCurrency(expenseLists.variable.reduce((a,b) => a + b.value, 0))}
                    </div>
                </div>
            </div>
        </div>
    );
};
