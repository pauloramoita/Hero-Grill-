
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
    Loader2, Lock, Activity, Building2, Wallet, 
    TrendingUp, DollarSign, ArrowDownAZ, ArrowDown10, LayoutDashboard, Filter, RefreshCw,
    Calendar
} from 'lucide-react';

interface DashboardModuleProps {
    user: User;
}

type GroupByOption = 'product' | 'category' | 'supplier';
type SortOption = 'value' | 'alpha';

export const DashboardModule: React.FC<DashboardModuleProps> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [transactions043, setTransactions043] = useState<Transaction043[]>([]);
    const [loans, setLoans] = useState<LoanTransaction[]>([]);
    const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);

    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedStore, setSelectedStore] = useState('');

    // Estado dos Controles das Tabelas
    const [fixedGroupBy, setFixedGroupBy] = useState<GroupByOption>('product'); 
    const [fixedSort, setFixedSort] = useState<SortOption>('value');
    
    const [variableGroupBy, setVariableGroupBy] = useState<GroupByOption>('category');
    const [variableSort, setVariableSort] = useState<SortOption>('value');

    // Lógica de Lojas Disponíveis
    const availableStores = useMemo(() => {
        const allStores = appData?.stores || [];
        if (user.isMaster) return allStores;
        if (user.permissions?.stores && user.permissions.stores.length > 0) {
            return allStores.filter(s => user.permissions.stores.includes(s));
        }
        return allStores;
    }, [appData.stores, user]);

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

            setAppData(d || { stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
            setOrders(o || []);
            setTransactions(t || []);
            setAccounts(acc || []);
            setTransactions043(t043 || []);
            setLoans(loanData || []);
            setAccountBalances(ab || []);
        } catch (error: any) {
            console.error("Erro ao carregar dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const filterStore = (storeName: string | null | undefined) => !selectedStore || storeName === selectedStore;

    // --- CÁLCULOS ---

    const metrics = useMemo(() => {
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

        const totalVariable = variableTrans + variableOrders;
        const netResult = totalRevenues - (totalFixed + totalVariable);

        return { totalRevenues, totalFixed, totalVariable, netResult };
    }, [transactions, orders, currentMonth, selectedStore]);

    const totalBalance = useMemo(() => {
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
    }, [accounts, transactions, selectedStore]);

    // Função Genérica de Agrupamento
    const getGroupedData = (type: 'fixed' | 'variable', groupBy: GroupByOption, sortOrder: SortOption) => {
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
                let key = 'Outros';
                if (groupBy === 'category') key = item.category || 'Sem Categoria';
                else if (groupBy === 'supplier') key = item.supplier || 'Sem Fornecedor';
                else key = item.description || item.product || 'Diversos'; 

                if (!groups[key]) groups[key] = { value: 0, count: 0 };
                groups[key].value += item.value;
                groups[key].count += 1;
            });
        } else {
            // Transações Variáveis
            const items = transactions.filter(t => 
                t.date.slice(0,7) === currentMonth && 
                filterStore(t.store) && 
                t.type === 'Despesa' && 
                t.status === 'Pago' &&
                t.classification !== 'Fixa' && t.classification !== 'Fixo'
            );
            items.forEach(item => {
                let key = 'Outros';
                if (groupBy === 'category') key = item.category || 'Sem Categoria';
                else if (groupBy === 'supplier') key = item.supplier || 'Sem Fornecedor';
                else key = item.product || item.description || 'Diversos';

                if (!groups[key]) groups[key] = { value: 0, count: 0 };
                groups[key].value += item.value;
                groups[key].count += 1;
            });

            // Pedidos (Sempre Variáveis)
            const periodOrders = orders.filter(o => 
                o.date && o.date.slice(0,7) === currentMonth && filterStore(o.store)
            );
            periodOrders.forEach(o => {
                let key = 'Pedidos';
                if (groupBy === 'category') key = o.category || 'Sem Categoria';
                else if (groupBy === 'supplier') key = o.supplier || 'Sem Fornecedor';
                else key = o.product || 'Produto Diverso';

                if (!groups[key]) groups[key] = { value: 0, count: 0 };
                groups[key].value += o.totalValue;
                groups[key].count += 1;
            });
        }

        return Object.entries(groups)
            .map(([label, d]) => ({ label, value: d.value, count: d.count }))
            .sort((a, b) => sortOrder === 'value' ? b.value - a.value : a.label.localeCompare(b.label));
    };

    // --- DADOS PARA GRÁFICOS ---

    const balanceChartData = useMemo(() => {
        const months = [];
        const d = new Date(currentMonth + '-01');
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        for(let i=0; i<6; i++){
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            months.unshift(`${y}-${m}`);
            d.setMonth(d.getMonth() - 1);
        }

        return months.map(mKey => {
            const [yStr, mStr] = mKey.split('-');
            const balancesInMonth = accountBalances.filter(b => 
                b.year === parseInt(yStr) && 
                b.month === mStr && 
                filterStore(b.store)
            );
            
            const total = balancesInMonth.reduce((sum, b) => sum + b.totalBalance, 0);
            return {
                name: `${mStr}/${yStr}`,
                Saldo: total
            };
        });
    }, [accountBalances, currentMonth, selectedStore]);

    const control043ChartData = useMemo(() => {
        const months = [];
        const d = new Date(currentMonth + '-01');
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        for(let i=0; i<6; i++){
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            months.unshift(`${y}-${m}`);
            d.setMonth(d.getMonth() - 1);
        }

        return months.map(mKey => {
            const relevant = transactions043.filter(t => t.date.startsWith(mKey) && filterStore(t.store));
            const debit = relevant.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.value, 0);
            const credit = relevant.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.value, 0);
            const [y, m] = mKey.split('-');
            return {
                name: `${m}/${y}`,
                Entrada: credit,
                Saida: debit
            };
        });
    }, [transactions043, currentMonth, selectedStore]);

    const loanChartData = useMemo(() => {
        if (selectedStore !== 'Hero Centro') return [];
        
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
    }, [loans, currentMonth, selectedStore]);

    const fixedExpensesData = getGroupedData('fixed', fixedGroupBy, fixedSort);
    const variableExpensesData = getGroupedData('variable', variableGroupBy, variableSort);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-heroRed" size={48}/></div>;

    const KpiCard = ({ title, value, colorClass, icon: Icon, bgClass }: any) => (
        <div className={`rounded-[2rem] p-6 shadow-card border border-slate-100 flex flex-col justify-between relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 ${bgClass || 'bg-white'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-[0.08] group-hover:opacity-[0.15] transition-opacity transform group-hover:scale-110 duration-500">
                <Icon size={80} />
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
                <h3 className={`text-2xl md:text-3xl font-black tracking-tight ${colorClass}`} style={{ wordBreak: 'break-word' }}>{value}</h3>
            </div>
        </div>
    );

    const TableHeader = ({ title, icon: Icon, groupBy, setGroupBy, sort, setSort }: any) => (
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                <Icon size={16} className="text-slate-400"/> {title}
            </h3>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                    onClick={() => setSort(sort === 'value' ? 'alpha' : 'value')}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors shadow-sm"
                    title={sort === 'value' ? 'Ordenar por Valor (Maior > Menor)' : 'Ordenar Alfabeticamente (A-Z)'}
                >
                    {sort === 'value' ? <ArrowDown10 size={16}/> : <ArrowDownAZ size={16}/>}
                </button>
                
                <div className="relative group flex-1 sm:flex-none">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select 
                        value={groupBy} 
                        onChange={(e) => setGroupBy(e.target.value as any)}
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:border-heroRed appearance-none cursor-pointer shadow-sm"
                    >
                        <option value="product">Produto/Descrição</option>
                        <option value="category">Categoria</option>
                        <option value="supplier">Fornecedor</option>
                    </select>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-2 sm:p-4 space-y-8 animate-fadeIn pb-20">
            
            {/* Cabeçalho e Filtros */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-card border border-slate-100">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <LayoutDashboard className="text-heroRed" /> Dashboard Gerencial
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Visão Estratégica &bull; {new Date(currentMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                    <button onClick={loadData} className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">
                        <RefreshCw size={20} />
                    </button>
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
                    <div className="relative">
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="month" 
                            value={currentMonth}
                            onChange={(e) => setCurrentMonth(e.target.value)}
                            className="pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-slate-700 focus:ring-2 focus:ring-heroRed/20 cursor-pointer hover:bg-slate-100 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* KPI Grid - LINHA 1: Big Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KpiCard 
                    title="Saldo Acumulado Total" 
                    value={formatCurrency(totalBalance)} 
                    colorClass={totalBalance >= 0 ? "text-emerald-700" : "text-red-700"} 
                    icon={Wallet}
                    bgClass="bg-white ring-1 ring-slate-100"
                />
                <KpiCard 
                    title="Vendas do Mês" 
                    value={formatCurrency(metrics.totalRevenues)} 
                    colorClass="text-blue-700" 
                    icon={TrendingUp}
                    bgClass="bg-white ring-1 ring-slate-100"
                />
            </div>

            {/* KPI Grid - LINHA 2: Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                {/* Lucro Líquido Card */}
                <div className={`rounded-[2rem] p-6 shadow-lg text-white flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${metrics.netResult >= 0 ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform duration-500">
                        <DollarSign size={80} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Lucro Líquido</p>
                        <h3 className="text-3xl font-black tracking-tight" style={{ wordBreak: 'break-word' }}>{formatCurrency(metrics.netResult)}</h3>
                    </div>
                    <div className="relative z-10 mt-6 flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold uppercase tracking-wide">{metrics.netResult >= 0 ? 'Resultado Positivo' : 'Resultado Negativo'}</span>
                    </div>
                </div>
            </div>

            {/* Seção de Gráficos */}
            {selectedStore === 'Hero Centro' ? (
                // HERO CENTRO VIEW (Empréstimos)
                <div className="bg-white p-8 rounded-[2.5rem] shadow-card border border-indigo-100 relative overflow-hidden h-96">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2">
                                <Wallet className="text-indigo-600"/> Evolução de Empréstimos
                            </h3>
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">Hero Centro &bull; Últimos 12 Meses</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                        <ComposedChart data={loanChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                            <Line yAxisId="right" type="monotone" dataKey="SaldoDevedor" name="Saldo Devedor" stroke="#6366f1" strokeWidth={4} dot={{r: 4}} activeDot={{r: 6}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                // VISÃO PADRÃO (Saldos + 043)
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Gráfico 1: Saldos Mensais */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-card border border-slate-100 relative overflow-hidden h-80">
                        <div className="mb-4">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Activity className="text-cyan-600"/> Saldos Mensais
                            </h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Evolução de Caixa (6 meses)</p>
                        </div>
                        <ResponsiveContainer width="100%" height="80%">
                            <AreaChart data={balanceChartData}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={5} />
                                <YAxis tickFormatter={(v) => `${v/1000}k`} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Area type="monotone" dataKey="Saldo" stroke="#0891b2" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Gráfico 2: Controle 043 */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-card border border-slate-100 relative overflow-hidden h-80">
                        <div className="mb-4">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Building2 className="text-blue-600"/> Controle 043
                            </h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Movimentações (6 meses)</p>
                        </div>
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={control043ChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={5} />
                                <YAxis tickFormatter={(v) => `${v/1000}k`} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}}/>
                                <Bar dataKey="Entrada" fill="#10B981" radius={[4, 4, 0, 0]} barSize={12} />
                                <Bar dataKey="Saida" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Tabelas de Detalhamento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Tabela Despesas Fixas */}
                <div className="bg-white rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden flex flex-col h-full max-h-[500px]">
                    <TableHeader 
                        title="Despesas Fixas" 
                        icon={Lock} 
                        groupBy={fixedGroupBy} 
                        setGroupBy={setFixedGroupBy}
                        sort={fixedSort}
                        setSort={setFixedSort}
                    />
                    <div className="overflow-y-auto custom-scrollbar p-2 flex-1">
                        <table className="w-full">
                            <tbody className="divide-y divide-slate-50">
                                {fixedExpensesData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-heroRed transition-colors"></div>
                                                <span className="text-sm font-bold text-slate-700 line-clamp-1">{item.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <span className="text-sm font-black font-mono text-slate-800">{formatCurrency(item.value)}</span>
                                        </td>
                                    </tr>
                                ))}
                                {fixedExpensesData.length === 0 && (
                                    <tr><td colSpan={2} className="p-8 text-center text-slate-400 text-sm italic">Nenhuma despesa fixa neste período.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total: {formatCurrency(metrics.totalFixed)}</span>
                    </div>
                </div>

                {/* Tabela Despesas Variáveis */}
                <div className="bg-white rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden flex flex-col h-full max-h-[500px]">
                    <TableHeader 
                        title="Despesas Variáveis" 
                        icon={Activity} 
                        groupBy={variableGroupBy} 
                        setGroupBy={setVariableGroupBy}
                        sort={variableSort}
                        setSort={setVariableSort}
                    />
                    <div className="overflow-y-auto custom-scrollbar p-2 flex-1">
                        <table className="w-full">
                            <tbody className="divide-y divide-slate-50">
                                {variableExpensesData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-amber-200 group-hover:bg-amber-500 transition-colors"></div>
                                                <span className="text-sm font-bold text-slate-700 line-clamp-1">{item.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <span className="text-sm font-black font-mono text-slate-800">{formatCurrency(item.value)}</span>
                                        </td>
                                    </tr>
                                ))}
                                {variableExpensesData.length === 0 && (
                                    <tr><td colSpan={2} className="p-8 text-center text-slate-400 text-sm italic">Nenhuma despesa variável neste período.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total: {formatCurrency(metrics.totalVariable)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
