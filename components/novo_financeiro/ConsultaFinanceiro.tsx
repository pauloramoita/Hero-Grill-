

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
import { AppData, DailyTransaction, FinancialAccount, Order } from '../../types';
import { 
    CheckCircle, 
    Trash2, 
    Edit, 
    Printer, 
    Download, 
    Filter, 
    Calculator,
    Loader2,
    ArrowRight
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
    const [dateType, setDateType] = useState<'due' | 'payment'>('due'); // due = Vencimento, payment = Pagamento
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
        setLoading(false);
    };

    const applyFilters = () => {
        const result = transactions.filter(t => {
            // Filtro de Data (Vencimento vs Pagamento)
            const targetDate = dateType === 'payment' ? (t.paymentDate || '') : t.date;
            
            if (dateType === 'payment' && !targetDate) return false;

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
            // Se filtrar por Pagamento, ordenar por data Pagamento
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
            
            // Update local state to reflect changes (move from Order type to Transaction type effectively)
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
        loadData(); // Reload to refresh merged list correctly
    };

    const handleExport = () => {
        let xmlContent = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Financeiro"><Table>';
        
        xmlContent += '<Row>';
        ['Data Vencimento', 'Data Pagamento', 'Loja', 'Tipo', 'Descrição', 'Conta', 'Categoria', 'Fornecedor', 'Valor', 'Status'].forEach(h => {
            xmlContent += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
        });
        xmlContent += '</Row>';

        filteredTransactions.forEach(t => {
            xmlContent += '<Row>';
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
        link.download = 'relatorio_financeiro_novo.xls';
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
                            className={`border p-2 rounded text-sm font-bold uppercase cursor-pointer ${dateType === 'payment' ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-yellow-50 border-yellow-300 text-yellow-800'}`}
                        >
                            <option value="due">Data de Vencimento</option>
                            <option value="payment">Data de Pagamento</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Início ({dateType === 'due' ? 'Vencimento' : 'Pagamento'})</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Fim ({dateType === 'due' ? 'Vencimento' : 'Pagamento'})</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Status (Pagamento)</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full border p-2 rounded text-sm font-bold bg-gray-50">
                            <option value="">Todos (Pagos e Pendentes)</option>
                            <option value="Pago">Apenas Pagos</option>
                            <option value="Pendente">Apenas Pendentes</option>
                        </select>
                    