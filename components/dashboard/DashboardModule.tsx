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
    AreaChart, Area
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

    const filterStore = (storeName: string | null | undefined) => !selectedStore || storeName === selectedStore;

    // --- KPIs Calculations (Financial Module) ---

    const calculateFinancialMetrics = () => {
        // Filter for period and store
        const periodTransactions = transactions.filter(t => 
            t.date.startsWith(currentMonth) && 
            filterStore(t.store)
        );
        
        const periodOrders = orders.filter(o => 
            o.date.startsWith(currentMonth) && 
            filterStore(o.store)
        );

        // 1. Vendas Mês (Todas as Receitas do módulo financeiro)
        const totalRevenues = periodTransactions
            .filter(t => t.type === 'Receita')
            .reduce((acc, t) => acc + t.value, 0);

        // 2. Despesas Fixas (Do módulo financeiro)
        // Consideramos que 'classification' armazena 'Fixa' ou 'Fixo'
        const totalFixed = periodTransactions
            .filter(t => t.type === 'Despesa' && (t.classification === 'Fixa' || t.classification === 'Fixo'))
            .reduce((acc, t) => acc + t.value, 0);

        // 3. Despesas Variáveis (Do módulo financeiro + Pedidos)
        // Pedidos são considerados despesas variáveis de estoque
        const variableTrans = periodTransactions
            .filter(t => t.type === 'Despesa' && t.classification !== 'Fixa' && t.classification !== 'Fixo')
            .reduce((acc, t) => acc + t.value, 0);
            
        const variableOrders = periodOrders
            .reduce((acc, o) => acc + o.totalValue, 0);

        const totalVariable = variableTrans + variableOrders;

        // 4. Lucro Líquido (Receitas - Despesas Totais)
        const netResult = totalRevenues - (totalFixed + totalVariable);

        return {
            totalRevenues,
            totalFixed,
            totalVariable,
            netResult
        };
    };

    const calculateTotalBalance = () => {
        // Somar o saldo de todas as contas (considerando apenas o que foi PAGO/REALIZADO)
        let total = 0;
        
        // Contas pertencentes à loja selecionada (ou todas)
        const accountsToSum = accounts.filter(a => filterStore(a.store));

        accountsToSum.forEach(acc => {
            let bal = acc.initialBalance;
            
            // Transações PAGAS afetam o saldo real
            const accTrans = transactions.filter(t => t.status === 'Pago');
            
            accTrans.forEach(t => {
                // Se a conta é a origem/principal
                if (t.accountId === acc.id) {
                    if (t.type === 'Receita') bal += t.value;
                    else if (t.type === 'Despesa') bal -= t.value;
                    else if (t.type === 'Transferência') bal -= t.value;
                }
                // Se a conta é destino de uma transferência
                if (t.type === 'Transferência' && t.destinationAccountId === acc.id) {
                    bal += t.value;
                }
            });
            total += bal;
        });
        return total;
    };

    const getFinancialBalanceHistory = () => {
        // Histórico baseado nas transações reais (Fluxo de Caixa Realizado)
        const accountsToSum = accounts.filter(a => filterStore(a.store));
        const initialTotal = accountsToSum.reduce((acc, a) => acc + a.initialBalance, 0);

        // Transações pagas ordenadas por data de pagamento
        const sortedTrans = transactions
            .filter(t => t.status === 'Pago')
            .sort((a, b) => (a.paymentDate || a.date).localeCompare(b.paymentDate || b.date));

        // Últimos 12 meses
        const today = new Date();
        const history = [];
        
        for(let i=11; i>=0; i--) {
             const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
             const y = d.getFullYear();
             const m = d.getMonth(); // 0-11
             const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
             const endOfMonth = new Date(y, m + 1, 0).toISOString().slice(0, 10);

             // Calcula saldo acumulado até o fim deste mês
             // Filtrar transações que ocorreram até endOfMonth
             const transUpToNow = sortedTrans.filter(t => (t.paymentDate || t.date) <= endOfMonth);

             let change = 0;
             transUpToNow.forEach(t => {
                // Verifica se a transação afeta as contas selecionadas
                // Otimização: poderíamos pré-filtrar transUpToNow, mas iterar é seguro
                
                const isOriginInFilter = t.accountId && accountsToSum.some(a => a.id === t.accountId);
                const isDestInFilter = t.destinationAccountId && accountsToSum.some(a => a.id === t.destinationAccountId);

                if (isOriginInFilter) {
                    if (t.type === 'Receita') change += t.value;
                    if (t.type === 'Despesa') change -= t.value;
                    if (t.type === 'Transferência') change -= t.value;
                }
                if (t.type === 'Transferência' && isDestInFilter) {
                    change += t.value;
                }
             });

             history.push({
                name: `${String(m + 1).padStart(2, '0')}/${String(y).slice(2)}`,
                Saldo: initialTotal + change
             });
        }
        
        return history;
    };

    // --- Expense Lists for Details ---

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

    const metrics = calculateFinancialMetrics();
    const totalBalance = calculateTotalBalance();
    const balanceHistory = getFinancialBalanceHistory();
    const expenseLists = getExpenseLists();

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

            {/* KPI Cards - Updated to 5 items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Saldo Total (Black) */}
                <div className="bg-[#1A1A1A] text-white p-4 rounded-lg shadow-lg flex flex-col justify-center h-32">
                    <p className="text-xs font-bold uppercase opacity-70">SALDO TOTAL</p>
                    <h3 className="text-2xl font-black mt-1 break-words">{formatCurrency(totalBalance)}</h3>
                </div>

                {/* 2. Vendas Mês (Red) */}
                <div className="bg-[#C0392B] text-white p-4 rounded-lg shadow-lg flex flex-col justify-center h-32">
                    <p className="text-xs font-bold uppercase opacity-70">VENDAS MÊS</p>
                    <h3 className="text-2xl font-black mt-1 break-words">{formatCurrency(metrics.totalRevenues)}</h3>
                </div>

                {/* 3. Despesas Fixas (White) */}
                <div className="bg-white text-gray-800 p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-center h-32">
                    <p className="text-xs font-bold text-gray-500 uppercase">DESPESAS FIXAS</p>
                    <h3 className="text-2xl font-black mt-1 text-heroBlack break-words">{formatCurrency(metrics.totalFixed)}</h3>
                </div>

                {/* 4. Despesas Variáveis (White) */}
                <div className="bg-white text-gray-800 p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-center h-32">
                    <p className="text-xs font-bold text-gray-500 uppercase">DESP. VARIÁVEIS</p>
                    <h3 className="text-2xl font-black mt-1 text-heroBlack break-words">{formatCurrency(metrics.totalVariable)}</h3>
                </div>

                {/* 5. Lucro Líquido (White with Green/Red Text) */}
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-center h-32">
                    <p className="text-xs font-bold text-gray-500 uppercase">LUCRO LÍQUIDO</p>
                    <h3 className={`text-2xl font-black mt-1 break-words ${metrics.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(metrics.netResult)}
                    </h3>
                </div>
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Receitas x Despesas */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-heroRed font-bold uppercase text-sm mb-4 border-b pb-2 border-gray-100">RECEITAS X DESPESAS</h3>
                    <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{ 
                                name: 'Atual', 
                                receitas: metrics.totalRevenues, 
                                despesas: metrics.totalFixed + metrics.totalVariable 
                            }]}>
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

                 {/* Evolução de Saldo (Histórico Real) */}
                 <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-heroRed font-bold uppercase text-sm mb-4 border-b pb-2 border-gray-100">EVOLUÇÃO DO SALDO TOTAL</h3>
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
                                <Tooltip formatter={(value: number) => formatCurrency(value)}/>
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
                        <h3 className="text-gray-600 font-bold uppercase text-sm">Detalhamento: Despesas Fixas</h3>
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
                        <h3 className="text-gray-600 font-bold uppercase text-sm">Detalhamento: Despesas Variáveis</h3>
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