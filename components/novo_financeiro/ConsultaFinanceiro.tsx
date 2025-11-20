
import React, { useState, useEffect } from 'react';
import { 
    getDailyTransactions, 
    getAppData, 
    getFinancialAccounts,
    getOrders,
    saveDailyTransaction, 
    deleteDailyTransaction,
    formatCurrency, 
    formatDateBr,
    getTodayLocalISO
} from '../../services/storageService';
import { AppData, DailyTransaction, FinancialAccount } from '../../types';
import { 
    CheckCircle, 
    Trash2, 
    Edit, 
    Printer, 
    Download, 
    Filter, 
    Calculator,
    Loader2,
    ArrowRight,
    Calendar
} from 'lucide-react';
import { EditLancamentoModal } from './EditLancamentoModal';

export const ConsultaFinanceiro: React.FC = () => {
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<DailyTransaction[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [editingItem, setEditingItem] = useState<DailyTransaction | null>(null);

    // Filters
    const [dateType, setDateType] = useState<'due' | 'payment' | 'created'>('due'); // due = Vencimento, payment = Pagamento, created = Cadastro
    const [startDate, setStartDate] = useState(getTodayLocalISO());
    const [endDate, setEndDate] = useState(getTodayLocalISO());
    
    const [filterStore, setFilterStore] = useState('');
    const [filterAccount, setFilterAccount] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterStatus, setFilterStatus] = useState(''); // '' = Todos, 'Pago', 'Pendente'

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [transactions, startDate, endDate, filterStore, filterAccount, filterCategory, filterSupplier, filterStatus, dateType]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [t, d, acc, o] = await Promise.all([
                getDailyTransactions(), 
                getAppData(),
                getFinancialAccounts(),
                getOrders()
            ]);

            // Mesclar Transações e Pedidos (Consistência com Lançamentos)
            const existingIds = new Set(t.map(item => item.id));
            const mappedOrders = o
                .filter(order => !existingIds.has(order.id))
                .map(order => ({
                    id: order.id,
                    date: order.deliveryDate || order.date, // Vencimento
                    paymentDate: null,
                    store: order.store,
                    type: 'Despesa' as const, // Pedidos são Despesas
                    accountId: null,
                    destinationStore: undefined,
                    destinationAccountId: undefined,
                    paymentMethod: 'Boleto',
                    product: order.product,
                    category: order.category || '',
                    supplier: order.supplier,
                    classification: order.type || 'Variável',
                    value: order.totalValue,
                    status: 'Pendente' as const,
                    description: `Pedido ref. ${order.product}`,
                    origin: 'pedido' as const,
                    createdAt: order.createdAt || order.date // Data de Cadastro
                } as DailyTransaction));

            const merged = [...t, ...mappedOrders];

            setTransactions(merged);
            setAppData(d);
            setAccounts(acc);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        const result = transactions.filter(t => {
            // Filtro de Data
            let targetDate = t.date; // Default to Due Date
            
            if (dateType === 'payment') {
                targetDate = t.paymentDate || '';
            } else if (dateType === 'created') {
                targetDate = t.createdAt ? t.createdAt.split('T')[0] : '';
            }
            
            // Se filtrar por Pagamento ou Cadastro e não tiver data, esconde
            if ((dateType === 'payment' || dateType === 'created') && !targetDate) return false;

            const matchesDate = targetDate >= startDate && targetDate <= endDate;
            
            const matchesStore = !filterStore || t.store === filterStore;
            const matchesCategory = !filterCategory || t.category === filterCategory;
            const matchesSupplier = !filterSupplier || t.supplier === filterSupplier;
            const matchesStatus = !filterStatus || t.status === filterStatus;
            
            let matchesAccount = true;
            if (filterAccount) {
                if (t.type === 'Transferência') {
                    matchesAccount = t.accountId === filterAccount || t.destinationAccountId === filterAccount;
                } else {
                    matchesAccount = t.accountId === filterAccount;
                }
            }

            return matchesDate && matchesStore && matchesCategory && matchesSupplier && matchesAccount && matchesStatus;
        });

        // Ordenação
        result.sort((a, b) => {
            if (dateType === 'created') {
                 const dateA = a.createdAt || '';
                 const dateB = b.createdAt || '';
                 return dateB.localeCompare(dateA);
            }
            if (dateType === 'payment') {
                const dateA = a.paymentDate || '';
                const dateB = b.paymentDate || '';
                return dateB.localeCompare(dateA);
            }
            // Padrão: Pendentes primeiro, depois vencimento
            if (a.status === 'Pendente' && b.status === 'Pago') return -1;
            if (a.status === 'Pago' && b.status === 'Pendente') return 1;
            return a.date.localeCompare(b.date);
        });

        setFilteredTransactions(result);
    };

    const setDateRange = (type: 'hoje' | 'semana' | 'mes' | 'ano') => {
        const today = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        if (type === 'hoje') {
            const str = formatDate(today);
            setStartDate(str);
            setEndDate(str);
        } else if (type === 'semana') {
            const day = today.getDay();
            const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(today.setDate(diffToMon));
            const sunday = new Date(today.setDate(monday.getDate() + 6));
            setStartDate(formatDate(monday));
            setEndDate(formatDate(sunday));
        } else if (type === 'mes') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            setStartDate(formatDate(firstDay));
            setEndDate(formatDate(lastDay));
        } else if (type === 'ano') {
            const firstDay = new Date(today.getFullYear(), 0, 1);
            const lastDay = new Date(today.getFullYear(), 11, 31);
            setStartDate(formatDate(firstDay));
            setEndDate(formatDate(lastDay));
        }
    };

    const handlePay = async (t: DailyTransaction) => {
        if (!t.accountId) {
            alert("Conta não definida. Edite o lançamento para selecionar uma conta antes de pagar.");
            return;
        }
        if (window.confirm(`Confirmar pagamento de ${formatCurrency(t.value)} na data de hoje?`)) {
            const updated: DailyTransaction = {
                ...t,
                status: 'Pago',
                paymentDate: getTodayLocalISO()
            };
            await saveDailyTransaction(updated);
            // Update local state
            setTransactions(prev => prev.map(item => item.id === t.id ? updated : item));
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Deseja realmente excluir este lançamento?')) {
            await deleteDailyTransaction(id);
            setTransactions(prev => prev.filter(item => item.id !== id));
        }
    };

    const handleModalSave = async (updated: DailyTransaction) => {
        await saveDailyTransaction(updated);
        setEditingItem(null);
        loadData(); 
    };

    const handleExport = () => {
        let xmlContent = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Financeiro"><Table>';
        
        xmlContent += '<Row>';
        ['Cadastro', 'Data Vencimento', 'Data Pagamento', 'Loja', 'Tipo', 'Descrição', 'Conta', 'Categoria', 'Fornecedor', 'Valor', 'Status'].forEach(h => {
            xmlContent += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
        });
        xmlContent += '</Row>';

        filteredTransactions.forEach(t => {
            xmlContent += '<Row>';
            xmlContent += `<Cell><Data ss:Type="String">${t.createdAt ? formatDateBr(t.createdAt.split('T')[0]) : '-'}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${formatDateBr(t.date)}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.paymentDate ? formatDateBr(t.paymentDate) : '-'}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.store}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.type}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.description || ''}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${getAccountName(t.accountId)}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.category || ''}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.supplier || ''}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="Number">${t.value}</Data></Cell>`;
            xmlContent += `<Cell><Data ss:Type="String">${t.status}</Data></Cell>`;
            xmlContent += '</Row>';
        });

        xmlContent += '</Table></Worksheet></Workbook>';
        
        const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'relatorio_financeiro_completo.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getAccountName = (id: string | null | undefined) => {
        if (!id) return '-';
        return accounts.find(a => a.id === id)?.name || 'Conta Removida';
    };

    const clearFilters = () => {
        setFilterStore(''); 
        setFilterAccount(''); 
        setFilterCategory(''); 
        setFilterSupplier(''); 
        setFilterStatus('');
        setDateRange('hoje');
        setDateType('due');
    };

    // Totais
    const totalReceitas = filteredTransactions.filter(t => t.type === 'Receita').reduce((acc, t) => acc + t.value, 0);
    const totalDespesas = filteredTransactions.filter(t => t.type === 'Despesa').reduce((acc, t) => acc + t.value, 0);
    const saldo = totalReceitas - totalDespesas;

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" size={40}/></div>;

    return (
        <div className="space-y-6">
            {/* Filters Panel */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 no-print">
                
                {/* Header & Presets */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4">
                    <div className="flex gap-2">
                        <button onClick={() => setDateRange('hoje')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold uppercase text-gray-700">Hoje</button>
                        <button onClick={() => setDateRange('semana')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold uppercase text-gray-700">Esta Semana</button>
                        <button onClick={() => setDateRange('mes')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold uppercase text-gray-700">Este Mês</button>
                        <button onClick={() => setDateRange('ano')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold uppercase text-gray-700">Este Ano</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Referência de Data:</span>
                        <select 
                            value={dateType} 
                            onChange={e => setDateType(e.target.value as any)} 
                            className={`border p-2 rounded text-sm font-bold uppercase cursor-pointer ${dateType === 'payment' ? 'bg-blue-50 border-blue-300 text-blue-800' : dateType === 'created' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-yellow-50 border-yellow-300 text-yellow-800'}`}
                        >
                            <option value="due">Data de Vencimento</option>
                            <option value="payment">Data de Pagamento</option>
                            <option value="created">Data de Cadastro</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Início ({dateType === 'due' ? 'Vencimento' : dateType === 'payment' ? 'Pagamento' : 'Cadastro'})</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Fim ({dateType === 'due' ? 'Vencimento' : dateType === 'payment' ? 'Pagamento' : 'Cadastro'})</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Status (Pagamento)</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full border p-2 rounded text-sm font-bold bg-gray-50">
                            <option value="">Todos (Pagos e Pendentes)</option>
                            <option value="Pago">Apenas Pagos</option>
                            <option value="Pendente">Apenas Pendentes</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                        <select value={filterStore} onChange={e => setFilterStore(e.target.value)} className="w-full border p-2 rounded text-sm">
                            <option value="">Todas</option>
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Conta</label>
                        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-full border p-2 rounded text-sm">
                            <option value="">Todas</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.store})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Fornecedor</label>
                        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-full border p-2 rounded text-sm">
                            <option value="">Todos</option>
                            {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Categoria</label>
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full border p-2 rounded text-sm">
                            <option value="">Todas</option>
                            {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500 font-bold flex items-center gap-1 mb-2">
                            <Filter size={12}/> Limpar Filtros
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4 mt-4">
                     <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 shadow-sm">
                        <Download size={18}/> Exportar Excel
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm">
                        <Printer size={18}/> Imprimir
                    </button>
                </div>
            </div>

            {/* Totals Banner */}
            <div className="bg-blue-50 p-4 border-b border-blue-100 flex flex-wrap gap-4 justify-between items-center text-sm rounded-lg shadow-sm border">
                <div className="flex items-center gap-2">
                    <Calculator size={20} className="text-blue-600"/>
                    <span className="font-bold text-gray-600">RESUMO DA SELEÇÃO:</span>
                </div>
                <div className="flex gap-8">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-500 uppercase">Qtd. Registros</span>
                        <span className="font-bold text-gray-800 text-lg">{filteredTransactions.length}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-green-600 uppercase">Receitas</span>
                        <span className="font-bold text-green-700">{formatCurrency(totalReceitas)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-red-600 uppercase">Despesas</span>
                        <span className="font-bold text-red-700">{formatCurrency(totalDespesas)}</span>
                    </div>
                    <div className="flex flex-col items-end border-l pl-6 border-blue-200">
                        <span className="text-xs font-black text-blue-800 uppercase">Saldo (Total)</span>
                        <span className={`font-black text-lg ${saldo >= 0 ? 'text-blue-800' : 'text-red-600'}`}>{formatCurrency(saldo)}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Cadastro</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Vencimento</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Loja</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Descrição / Detalhes</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Conta</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Categoria</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Valor</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase no-print">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTransactions.map((t) => (
                            <tr key={t.id} className={`hover:bg-gray-50 break-inside-avoid ${t.origin === 'pedido' ? 'bg-blue-50/30' : ''}`}>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} className="text-gray-300"/>
                                        {t.createdAt ? formatDateBr(t.createdAt.split('T')[0]) : '-'}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                    {formatDateBr(t.date)}
                                    {t.paymentDate && dateType !== 'due' && (
                                        <div className="text-[10px] text-green-600 font-bold">Pg: {formatDateBr(t.paymentDate)}</div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{t.store}</td>
                                <td className="px-4 py-3 text-sm">
                                    {t.type === 'Transferência' ? (
                                        <div className="flex items-center gap-1 text-purple-700 font-bold">
                                            <ArrowRight size={12}/> {t.destinationStore}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="font-bold text-gray-700">{t.description || t.supplier}</div>
                                            {t.product && <div className="text-xs text-gray-500">{t.product}</div>}
                                        </>
                                    )}
                                    {t.origin === 'pedido' && <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-bold border border-blue-200">PEDIDO</span>}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {t.type === 'Transferência' ? (
                                        <div className="flex flex-col text-xs">
                                            <span className="text-red-500">De: {getAccountName(t.accountId)}</span>
                                            <span className="text-green-500">Para: {getAccountName(t.destinationAccountId)}</span>
                                        </div>
                                    ) : (
                                        <span className={!t.accountId ? 'text-red-400 italic font-bold text-xs' : 'text-gray-600'}>
                                            {getAccountName(t.accountId) || 'Definir Conta'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {t.category || '-'}
                                    {t.classification && <div className="text-[10px] text-gray-400 border px-1 rounded w-fit mt-1">{t.classification}</div>}
                                </td>
                                <td className={`px-4 py-3 text-sm text-right font-bold font-mono ${t.type === 'Receita' ? 'text-green-600' : t.type === 'Transferência' ? 'text-purple-600' : 'text-red-600'}`}>
                                    {t.type === 'Receita' ? '+' : t.type === 'Transferência' ? 'T' : '-'}{formatCurrency(t.value)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {t.status === 'Pago' ? (
                                        <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-1"><CheckCircle size={14}/> PAGO</span>
                                    ) : (
                                        <span className="text-yellow-600 font-bold text-xs bg-yellow-100 px-2 py-1 rounded border border-yellow-200">PENDENTE</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap no-print">
                                    <div className="flex items-center justify-center gap-2">
                                        {t.status === 'Pendente' && (
                                            <button onClick={() => handlePay(t)} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Confirmar Pagamento">
                                                <CheckCircle size={18}/>
                                            </button>
                                        )}
                                        <button onClick={() => setEditingItem(t)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Editar">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Excluir">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                                    Nenhum registro encontrado para os filtros selecionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingItem && (
                <EditLancamentoModal 
                    transaction={editingItem} 
                    onClose={() => setEditingItem(null)} 
                    onSave={handleModalSave} 
                />
            )}
        </div>
    );
};
