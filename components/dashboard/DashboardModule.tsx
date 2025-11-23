
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getAppData, 
    getOrders, 
    getDailyTransactions, 
    getFinancialAccounts,
    getTransactions043,
    getAccountBalances,
    getLoanTransactions,
    formatCurrency
} from '../../services/storageService';
import { AppData, Order, DailyTransaction, FinancialAccount, Transaction043, AccountBalance, LoanTransaction, User } from '../../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell, ComposedChart, Line, Area, AreaChart, PieChart, Pie
} from 'recharts';
import { 
    Loader2, Lock, Hammer, AlertCircle, Layers, TrendingUp, TrendingDown, Wallet, 
    DollarSign, Activity, Building2, ArrowUpRight, ArrowDownRight, LayoutDashboard, ShieldCheck, Filter
} from 'lucide-react';

interface DashboardModuleProps {
    user: User;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [transactions043, setTransactions043] = useState<Transaction043[]>([]);
    const [loans, setLoans] = useState<LoanTransaction[]>([]);
    const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);

    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    
    // Store Selection
    const availableStores = useMemo(() => {
        const allStores = appData?.stores || [];
        if (user.isMaster) return allStores;
        if (user.permissions?.stores && user.permissions.stores.length > 0) {
            return allStores.filter(s => user.permissions.stores.includes(s));
        }
        return allStores;
    }, [appData.stores, user]);

    const [selectedStore, setSelectedStore] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (availableStores.length === 1 && !selectedStore) setSelectedStore(availableStores[0]);
    }, [availableStores, selectedStore]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [d, o, acc, t, t043, loanData, ab] = await Promise.all([
                getAppData(),
                getOrders().catch(() => []),
                getFinancialAccounts().catch(() => []),
                getDailyTransactions().catch(() => []),
                getTransactions043().catch(() => []),
                getLoanTransactions().catch(() => []),
                getAccountBalances().catch(() => [])
            ]);

            setAppData(d);
            setOrders(o);
            setTransactions(t);
            setAccounts(acc);
            setTransactions043(t043);
            setLoans(loanData);
            setAccountBalances(ab);
        } catch (error: any) {
            setErrorMsg(error.message || 'Erro ao carregar dados.');
        } finally {
            setLoading(false);
        }
    };

    const filterStore = (storeName: string | null | undefined) => !selectedStore || storeName === selectedStore;

    // --- CALCULATIONS ---

    const calculateMetrics = () => {
        if (!transactions || !orders) return { totalRevenues: 0, totalFixed: 0, totalVariable: 0, netResult: 0 };

        const periodTransactions = transactions.filter(t => 
            t.date && t.date.slice(0,7) === currentMonth && filterStore(t.store) && t.status === 'Pago'
        );
        const periodOrders = orders.filter(o => 
            o.date && o.date.slice(0,7) === currentMonth && filterStore(o.store)
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
            
        const variableOrders = periodOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0);

        // Total Variable
        const totalVariable = variableTrans + variableOrders;
        
        // Net Result
        const netResult = totalRevenues - (totalFixed + variableTrans + variableOrders);

        return { totalRevenues, totalFixed, totalVariable, netResult };
    };

    const calculateTotalBalance = () => {
        let total = 0;
        const accountsToSum = accounts.filter(a => filterStore(a.store));
        
        accountsToSum.forEach(acc => {
            let bal = acc.initialBalance || 0;
            // Sum all history for current balance
            transactions.filter(t => t.status === 'Pago').forEach(t => {
                if (t.accountId === acc.id) {
                    if (t.type === 'Receita') bal += t.value;
                    else if (t.type === 'Despesa' || t.type === 'Transferência') bal -= t.value;
                }
                if (t.type === 'Transferência' && t.destinationAccountId === acc.id) {
                    bal += t.value;
                }
            });
            total += bal;
        });
        return total;
    };

    const getGroupedData = (type: 'fixed' | 'variable') => {
        const data: { label: string, value: number, count: number }[] = [];
        const groups: Record<string, { value: number, count: number }> = {};

        if (type === 'fixed') {
            const items = transactions.filter(t => 
                t.date.slice(0,7) === currentMonth && 
                filterStore(t.store) && 
                t.type === 'Despesa' && 
                t.status === 'Pago' &&
                (t.classification === 'Fixa' || t.classification === 'Fixo')
            );
            items.forEach(item => {
                const key = item.category || item.description || 'Outros';
                if (!groups[key]) groups[key] = { value: 0, count: 0 };
                groups[key].value += item.value;
                groups[key].count += 1;
            });
        } else {
            // Variable Transactions
            const items = transactions.filter(t => 
                t.date.slice(0,7) === currentMonth && 
                filterStore(t.store) && 
                t.type === 'Despesa' && 
                t.status === 'Pago' &&
                t.classification !== 'Fixa' && t.classification !== 'Fixo'
            );
            items.forEach(item => {
                const key = item.category || item.product || 'Outros';
                if (!groups[key]) groups[key] = { value: 0, count: 0 };
                groups[key].value += item.value;
                groups[key].count += 1;
            });

            // Orders (Variable)
            const periodOrders = orders.filter(o => 
                o.date && o.date.slice(0,7) === currentMonth && filterStore(o.store)
            );
            periodOrders.forEach(o => {
                const key = o.product || 'Pedidos';
                if (!groups[key]) groups[key] = { value: 0, count: 0 };
                groups[key].value += o.totalValue;
                groups[key].count += 1;
            });
        }

        return Object.entries(groups)
            .map(([label, d]) => ({ label, value: d.value, count: d.count }))
            .sort((a, b) => b.value - a.value);
    };

    const getTrendData = () => {
        const months = [];
        const d = new Date(currentMonth + '-01');
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        
        // Last 6 months
        for(let i=0; i<6; i++){
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            months.unshift(`${y}-${m}`);
            d.setMonth(d.getMonth() - 1);
        }

        return months.map(m => {
            const tInMonth = transactions.filter(t => t.date.startsWith(m) && t.status === 'Pago' && filterStore(t.store));
            const oInMonth = orders.filter(o => o.date.startsWith(m) && filterStore(o.store));

            const revenues = tInMonth.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.value, 0);
            const expenses = tInMonth.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.value, 0) 
                           + oInMonth.reduce((sum, o) => sum + o.totalValue, 0);

            return {
                name: m.split('-').reverse().join('/'), // MM/YYYY
                Receitas: revenues,
                Despesas: expenses,
                Resultado: revenues - expenses
            };
        });
    };

    // --- DATA PREP ---
    const metrics = calculateMetrics();
    const totalBalance = calculateTotalBalance();
    
    const fixedExpensesData = getGroupedData('fixed');
    const variableExpensesData = getGroupedData('variable');
    const trendData = getTrendData();

    const dataLoans = useMemo(() => {
        const relevant = loans.filter(l => l.date.slice(0, 7) <= currentMonth);
        const dates = [];
        const d = new Date(currentMonth + '-01');
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        
        for (let i = 0; i < 12; i++) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            dates.unshift(`${y}-${m}`); 
            d.setMonth(d.getMonth() - 1);
        }
        
        const startDate = dates[0];
        let cumulativeBalance = relevant
            .filter(l => l.date.slice(0, 7) < startDate)
            .reduce((acc, l) => l.type === 'CREDIT' ? acc + l.value : acc - l.value, 0);

        return dates.map(key => {
            const monthLoans = relevant.filter(l => l.date.slice(0, 7) === key);
            const credit = monthLoans.filter(l => l.type === 'CREDIT').reduce((acc, l) => acc + l.value, 0);
            const debit = monthLoans.filter(l => l.type === 'DEBIT').reduce((acc, l) => acc + l.value, 0);
            
            cumulativeBalance = cumulativeBalance + credit - debit;
            const [y, m] = key.split('-');
            return { name: `${m}/${y}`, Entrada: credit, Saida: debit, SaldoDevedor: cumulativeBalance };
        });
    }, [loans, currentMonth]);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-heroRed" size={48}/></div>;

    const KpiCard = ({ title, value, colorClass, icon: Icon, subtext }: any) => (
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col justify-between h-40 hover:shadow-card-hover transition-all duration-300 group relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-125 duration-500`}>
                <Icon size={100} />
            </div>
            <div className="flex justify-between items-start relative z-10">
                <div className="w-full">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
                    <div className="w-full overflow-hidden" title={value}>
                        <h3 className={`text-2xl xl:text-3xl font-black tracking-tight ${colorClass} whitespace-nowrap text-ellipsis overflow-hidden`}>{value}</h3>
                    </div>
                </div>
                <div className={`p-3 rounded-2xl shadow-sm ml-2 shrink-0 ${colorClass.includes('emerald') ? 'bg-emerald-50 text-emerald-600' : colorClass.includes('red') ? 'bg-red-50 text-red-600' : colorClass.includes('blue') ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                    <Icon size={24} />
                </div>
            </div>
            {subtext && (
                <div className="relative z-10 mt-auto pt-2 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400">{subtext}</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-2 sm:p-4 space-y-8 animate-fadeIn pb-20">
            
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] shadow-card border border-slate-100">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <LayoutDashboard className="text-heroRed" /> Dashboard Gerencial
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Visão Estratégica do Negócio</p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                    <div className="relative group">
                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-heroRed transition-colors" />
                        <select 
                            value={selectedStore} 
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="pl-10 pr-10 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-slate-700 focus:ring-2 focus:ring-heroRed/20 cursor-pointer hover:bg-slate-100 transition-all appearance-none"
                            disabled={availableStores.length === 1}
                        >
                            {availableStores.length !== 1 && <option value="">Todas as Lojas</option>}
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <input 
                        type="month" 
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(e.target.value)}
                        className="py-3 px-4 bg-slate-50 border-none rounded-xl font-bold text-sm text-slate-700 focus:ring-2 focus:ring-heroRed/20 cursor-pointer hover:bg-slate-100 transition-all outline-none"
                    />
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                <KpiCard 
                    title="Saldo Acumulado" 
                    value={formatCurrency(totalBalance)} 
                    colorClass={totalBalance >= 0 ? "text-emerald-600" : "text-red-600"} 
                    icon={Wallet}
                    subtext="Todas as Contas"
                />
                <KpiCard 
                    title="Vendas do Mês" 
                    value={formatCurrency(metrics.totalRevenues)} 
                    colorClass="text-emerald-600" 
                    icon={TrendingUp}
                    subtext="Receitas confirmadas"
                />
                <KpiCard 
                    title="Despesas Fixas" 
                    value={formatCurrency(metrics.totalFixed)} 
                    colorClass="text-slate-700" 
                    icon={Lock}
                    subtext="Custos operacionais"
                />
                <KpiCard 
                    title="Desp. Variáveis" 
                    value={formatCurrency(metrics.totalVariable)} 
                    colorClass="text-amber-600" 
                    icon={Activity}
                    subtext="Pedidos + Variáveis"
                />
                <div className={`bg-gradient-to-br ${metrics.netResult >= 0 ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600'} rounded-3xl p-6 shadow-lg text-white flex flex-col justify-between h-40 relative overflow-hidden group col-span-1 sm:col-span-2 xl:col-span-1`}>
                    <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform">
                        <DollarSign size={80} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Lucro Líquido</p>
                        <div className="w-full overflow-hidden" title={formatCurrency(metrics.netResult)}>
                            <h3 className="text-2xl xl:text-3xl font-black mt-2 tracking-tight whitespace-nowrap text-ellipsis overflow-hidden">{formatCurrency(metrics.netResult)}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm mt-2">
                        {metrics.netResult >= 0 ? 'Lucro' : 'Prejuízo'} Operacional
                    </div>
                </div>
            </div>

            {/* Main Chart Section */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-card border border-slate-100 relative overflow-hidden">
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Activity className="text-heroRed"/> Evolução Financeira
                        </h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Entradas vs Saídas (Últimos 6 meses)</p>
                    </div>
                </div>
                <div className="h-80 w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tickFormatter={(v) => `${v/1000}k`} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)'}}
                                itemStyle={{fontWeight: 'bold', fontSize: '12px'}}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend iconType="circle" />
                            <Bar dataKey="Receitas" name="Receitas" fill="#10B981" radius={[6, 6, 0, 0]} barSize={20} />
                            <Bar dataKey="Despesas" name="Despesas" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Expense Breakdown Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Fixed Expenses Table */}
                <div className="bg-white rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-black text-slate-700 uppercase text-sm tracking-wider flex items-center gap-2">
                            <Lock size={18} className="text-slate-400"/> Despesas Fixas
                        </h3>
                        <span className="text-xs font-bold bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100 text-slate-500">
                            Total: {formatCurrency(metrics.totalFixed)}
                        </span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] custom-scrollbar p-2">
                        <table className="w-full">
                            <tbody className="divide-y divide-slate-50">
                                {fixedExpensesData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-heroRed transition-colors"></div>
                                                <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs font-medium text-slate-400 mr-3">{item.count} items</span>
                                            <span className="text-sm font-black font-mono text-slate-800">{formatCurrency(item.value)}</span>
                                        </td>
                                    </tr>
                                ))}
                                {fixedExpensesData.length === 0 && (
                                    <tr><td colSpan={2} className="p-8 text-center text-slate-400 text-sm italic">Nenhuma despesa fixa registrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Variable Expenses Table */}
                <div className="bg-white rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-black text-slate-700 uppercase text-sm tracking-wider flex items-center gap-2">
                            <Activity size={18} className="text-amber-500"/> Despesas Variáveis
                        </h3>
                        <span className="text-xs font-bold bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100 text-amber-600">
                            Total: {formatCurrency(metrics.totalVariable)}
                        </span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] custom-scrollbar p-2">
                        <table className="w-full">
                            <tbody className="divide-y divide-slate-50">
                                {variableExpensesData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-amber-200 group-hover:bg-amber-500 transition-colors"></div>
                                                <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs font-medium text-slate-400 mr-3">{item.count} items</span>
                                            <span className="text-sm font-black font-mono text-slate-800">{formatCurrency(item.value)}</span>
                                        </td>
                                    </tr>
                                ))}
                                {variableExpensesData.length === 0 && (
                                    <tr><td colSpan={2} className="p-8 text-center text-slate-400 text-sm italic">Nenhuma despesa variável registrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Loan Chart (Conditional) */}
            {selectedStore === 'Hero Centro' && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-card border border-indigo-100 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2">
                                <Wallet className="text-indigo-600"/> Evolução de Empréstimos
                            </h3>
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">Hero Centro &bull; Últimos 12 Meses</p>
                        </div>
                    </div>
                    <div className="h-80 w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={dataLoans} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                                <YAxis yAxisId="left" tickFormatter={(v) => `${v/1000}k`} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v/1000}k`} tick={{fontSize: 10, fill: '#6366f1'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)'}}
                                    itemStyle={{fontWeight: 'bold', fontSize: '12px'}}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Legend iconType="circle" />
                                <Bar yAxisId="left" dataKey="Entrada" name="Novos Empréstimos" fill="url(#colorCredit)" barSize={20} radius={[6, 6, 0, 0]} />
                                <Bar yAxisId="left" dataKey="Saida" name="Pagamentos" fill="#EF4444" barSize={20} radius={[6, 6, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="SaldoDevedor" name="Saldo Devedor" stroke="#6366f1" strokeWidth={4} dot={{r: 0}} activeDot={{r: 6, strokeWidth: 0}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};
