
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
    Cell, ComposedChart, Line, Area, AreaChart
} from 'recharts';
import { 
    Loader2, Lock, Hammer, AlertCircle, Layers, TrendingUp, TrendingDown, Wallet, 
    DollarSign, PieChart, Activity, Building2, ArrowUpRight, ArrowDownRight, LayoutDashboard, ShieldCheck
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
    const [loans, setLoans] = useState<LoanTransaction[]>([]);
    const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);

    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    
    // Sorting & Grouping
    const [sortFixed, setSortFixed] = useState<'alpha' | 'value'>('value');
    const [sortVariable, setSortVariable] = useState<'alpha' | 'value'>('value');
    const [groupFixed, setGroupFixed] = useState<'desc' | 'cat' | 'sup'>('desc');
    const [groupVar, setGroupVar] = useState<'prod' | 'cat' | 'sup'>('prod');

    // Store Selection
    const availableStores = useMemo(() => {
        const allStores = appData?.stores || [];
        if (user.isMaster) return allStores;
        if (user.permissions?.stores && user.permissions.stores.length > 0) {
            return allStores.filter(s => user.permissions.stores.includes(s));
        }
        return allStores; // Investor/Observer sees all if no restriction
    }, [appData.stores, user]);

    const [selectedStore, setSelectedStore] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (availableStores.length === 1) setSelectedStore(availableStores[0]);
    }, [availableStores]);

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

    const calculateMetrics = () => {
        if (!transactions || !orders) return { totalRevenues: 0, totalFixed: 0, totalVariable: 0, netResult: 0 };

        const periodTransactions = transactions.filter(t => 
            t.date && t.date.startsWith(currentMonth) && filterStore(t.store)
        );
        const periodOrders = orders.filter(o => 
            o.date && o.date.startsWith(currentMonth) && filterStore(o.store)
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

        const totalVariable = variableTrans + variableOrders;
        const netResult = totalRevenues - (totalFixed + totalVariable);

        return { totalRevenues, totalFixed, totalVariable, netResult };
    };

    const calculateTotalBalance = () => {
        let total = 0;
        const accountsToSum = accounts.filter(a => filterStore(a.store));
        accountsToSum.forEach(acc => {
            let bal = acc.initialBalance || 0;
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

    const getLoansHistory = () => {
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
    };

    const get043History = () => {
        const relevant = transactions043.filter(t => filterStore(t.store) && t.date.slice(0, 7) <= currentMonth);
        const grouped: Record<string, { credit: number, debit: number }> = {};
        relevant.forEach(t => {
            const key = t.date.slice(0, 7);
            if (!grouped[key]) grouped[key] = { credit: 0, debit: 0 };
            if (t.type === 'CREDIT') grouped[key].credit += t.value;
            if (t.type === 'DEBIT') grouped[key].debit += t.value;
        });
        return Object.keys(grouped).sort().slice(-12).map(key => {
            const [y, m] = key.split('-');
            return { name: `${m}/${y}`, Credito: grouped[key].credit, Debito: grouped[key].debit };
        });
    };

    const getSaldosHistory = () => {
        const relevant = accountBalances.filter(b => filterStore(b.store) && `${b.year}-${b.month}` <= currentMonth);
        const grouped: Record<string, number> = {};
        relevant.forEach(b => {
            const key = `${b.year}-${b.month}`;
            grouped[key] = (grouped[key] || 0) + b.totalBalance;
        });
        return Object.keys(grouped).sort().slice(-12).map(key => {
            const [y, m] = key.split('-');
            return { name: `${m}/${y}`, value: grouped[key] };
        });
    };

    const getStorePerformance = () => {
        const stats: Record<string, { sales: number, expenses: number }> = {};
        availableStores.forEach(s => stats[s] = { sales: 0, expenses: 0 });
        if (availableStores.length === 0 && selectedStore) stats[selectedStore] = { sales: 0, expenses: 0 };

        const filter = (t: any) => t.date && t.date.startsWith(currentMonth) && filterStore(t.store);
        
        transactions.filter(t => filter(t) && t.type === 'Receita').forEach(t => stats[t.store].sales += t.value);
        transactions.filter(t => filter(t) && t.type === 'Despesa').forEach(t => stats[t.store].expenses += t.value);
        orders.filter(o => filter(o)).forEach(o => stats[o.store].expenses += o.totalValue);

        return Object.entries(stats).map(([store, s]) => ({
            store, sales: s.sales, expenses: s.expenses, result: s.sales - s.expenses
        })).sort((a, b) => b.sales - a.sales);
    };

    const metrics = calculateMetrics();
    const totalBalance = calculateTotalBalance();
    const dataLoans = getLoansHistory();
    const data043 = get043History();
    const dataSaldos = getSaldosHistory();
    const storePerf = getStorePerformance();

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-heroRed" size={48}/></div>;

    // --- Components ---
    
    const KpiCard = ({ title, value, colorClass, icon: Icon, trend }: any) => (
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col justify-between h-36 hover:shadow-card-hover transition-all duration-300 group">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                    <h3 className={`text-2xl font-black tracking-tight ${colorClass} break-all`}>{value}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${colorClass.includes('green') ? 'bg-green-50 text-green-600' : colorClass.includes('red') ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'} group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                </div>
            </div>
            {trend && (
                <div className="flex items-center gap-1 text-xs font-bold mt-2">
                    {trend === 'up' ? <ArrowUpRight className="text-green-500" size={16}/> : <ArrowDownRight className="text-red-500" size={16}/>}
                    <span className="text-slate-400">vs mês anterior</span>
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
                />
                <KpiCard 
                    title="Vendas do Mês" 
                    value={formatCurrency(metrics.totalRevenues)} 
                    colorClass="text-blue-600" 
                    icon={TrendingUp} 
                />
                <KpiCard 
                    title="Despesas Fixas" 
                    value={formatCurrency(metrics.totalFixed)} 
                    colorClass="text-slate-700" 
                    icon={Lock} 
                />
                <KpiCard 
                    title="Desp. Variáveis" 
                    value={formatCurrency(metrics.totalVariable)} 
                    colorClass="text-amber-600" 
                    icon={Activity} 
                />
                <div className={`bg-gradient-to-br ${metrics.netResult >= 0 ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600'} rounded-3xl p-6 shadow-lg text-white flex flex-col justify-between h-36 relative overflow-hidden group`}>
                    <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform">
                        <DollarSign size={64} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Lucro Líquido</p>
                        <h3 className="text-3xl font-black mt-1 tracking-tight">{formatCurrency(metrics.netResult)}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                        {metrics.netResult >= 0 ? 'Lucro' : 'Prejuízo'} Operacional
                    </div>
                </div>
            </div>

            {/* Store Performance Table */}
            <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-black text-slate-700 uppercase text-sm tracking-wider flex items-center gap-2">
                        <Layers size={18} className="text-heroRed"/> Desempenho por Loja
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-white border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-emerald-600 uppercase tracking-widest">Vendas</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-red-600 uppercase tracking-widest">Despesas</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-blue-600 uppercase tracking-widest">Resultado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {storePerf.map((item) => (
                                <tr key={item.store} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700 group-hover:text-heroBlack transition-colors">{item.store}</td>
                                    <td className="px-6 py-4 text-sm text-right font-mono font-medium text-emerald-600 bg-emerald-50/30">{formatCurrency(item.sales)}</td>
                                    <td className="px-6 py-4 text-sm text-right font-mono font-medium text-red-600 bg-red-50/30">{formatCurrency(item.expenses)}</td>
                                    <td className={`px-6 py-4 text-sm text-right font-mono font-black ${item.result >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                        {formatCurrency(item.result)}
                                    </td>
                                </tr>
                            ))}
                            {storePerf.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm font-medium">Sem dados para o período.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Charts Section */}
            {selectedStore === 'Hero Centro' ? (
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
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Controle 043 Chart */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-card border border-slate-100">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <ShieldCheck className="text-heroRed" size={20}/> Controle 043 <span className="text-slate-300 text-xs font-bold uppercase tracking-wide ml-auto">12 Meses</span>
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data043}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{fontSize: 10, fill: '#cbd5e1', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}}
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Bar dataKey="Credito" fill="#10B981" radius={[4, 4, 0, 0]} barSize={12} name="Crédito" />
                                    <Bar dataKey="Debito" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={12} name="Débito" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Saldo Contas Chart */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-card border border-slate-100">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Wallet className="text-blue-500" size={20}/> Saldo de Contas <span className="text-slate-300 text-xs font-bold uppercase tracking-wide ml-auto">Evolução</span>
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dataSaldos}>
                                    <defs>
                                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{fontSize: 10, fill: '#cbd5e1', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" name="Saldo Total" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
