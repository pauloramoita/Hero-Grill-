
import React, { useState, useEffect, useMemo } from 'react';
import { getLoanTransactions, getAppData, formatCurrency, formatDateBr, deleteLoanTransaction, updateLoanTransaction, exportTransactionsToXML } from '../../services/storageService';
import { AppData, LoanTransaction, User } from '../../types';
import { Trash2, Edit, FileSpreadsheet, Printer, Loader2, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import { EditEmprestimoModal } from './EditEmprestimoModal';

interface ConsultaEmprestimosProps {
    user: User;
}

function usePersistedState<T>(key: string, initialState: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        const storageValue = localStorage.getItem(key);
        if (storageValue) {
            try { return JSON.parse(storageValue); } catch {}
        }
        return initialState;
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState];
}

export const ConsultaEmprestimos: React.FC<ConsultaEmprestimosProps> = ({ user }) => {
    const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<LoanTransaction[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loading, setLoading] = useState(true);
    const [editingTransaction, setEditingTransaction] = useState<LoanTransaction | null>(null);
    
    // Persistência nos filtros
    const [storeFilter, setStoreFilter] = usePersistedState('hero_state_loans_store', '');
    const [dateValue, setDateValue] = usePersistedState('hero_state_loans_date', new Date().toISOString().slice(0, 7)); 

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [t, d] = await Promise.all([getLoanTransactions(), getAppData()]);
            setTransactions(t);
            setAppData(d);
            setLoading(false);
        };
        load();
    }, []);

    // For loans, we show all stores as potential creditors
    const availableStores = appData.stores;

    useEffect(() => {
        let result = transactions.filter(t => t.date.startsWith(dateValue));
        
        if (storeFilter) result = result.filter(t => t.store === storeFilter);

        setFilteredTransactions(result.sort((a, b) => a.date.localeCompare(b.date)));
    }, [transactions, storeFilter, dateValue]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Deseja excluir esta transação?')) {
            await deleteLoanTransaction(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleEditSave = async (updated: LoanTransaction) => {
        await updateLoanTransaction(updated);
        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
        setEditingTransaction(null);
    };

    const totalDebit = filteredTransactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.value, 0); // Pagamentos
    const totalCredit = filteredTransactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.value, 0); // Recebimentos
    
    const balance = totalCredit - totalDebit;

    if (loading) return <Loader2 className="animate-spin mx-auto mt-10 text-indigo-600" size={40}/>;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-xl shadow-card border border-slate-200 no-print flex flex-wrap md:flex-nowrap gap-4 items-end">
                <div className="w-full md:w-auto flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa (Credor)</label>
                    <select 
                        value={storeFilter} 
                        onChange={e => setStoreFilter(e.target.value)} 
                        className={`w-full border p-2.5 rounded-lg font-bold outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 ${availableStores.length === 1 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                    >
                        <option value="">Todas as Empresas</option>
                        {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-auto">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mês de Referência</label>
                    <input type="month" value={dateValue} onChange={e => setDateValue(e.target.value)} className="w-full border p-2.5 rounded-lg font-bold outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-white" />
                </div>
                <div className="w-full md:w-auto flex gap-2">
                    <button onClick={() => exportTransactionsToXML(filteredTransactions, 'emprestimos_hero')} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
                        <FileSpreadsheet size={18}/> Excel
                    </button>
                    <button onClick={() => window.print()} className="flex-1 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
                        <Printer size={18}/> Imprimir
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-green-100 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-green-600 uppercase mb-1 flex items-center gap-1"><ArrowDownCircle size={14}/> Entradas (Empréstimos)</span>
                    <span className="text-2xl font-black text-green-700 tracking-tight">{formatCurrency(totalCredit)}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-red-600 uppercase mb-1 flex items-center gap-1"><ArrowUpCircle size={14}/> Saídas (Pagamentos)</span>
                    <span className="text-2xl font-black text-red-700 tracking-tight">{formatCurrency(totalDebit)}</span>
                </div>
                <div className={`p-5 rounded-xl border shadow-sm flex flex-col ${balance >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-yellow-50 border-yellow-100'}`}>
                    <span className="text-xs font-bold text-indigo-600 uppercase mb-1 flex items-center gap-1"><Wallet size={14}/> Saldo Líquido (No Mês)</span>
                    <span className="text-2xl font-black text-indigo-900 tracking-tight">{formatCurrency(balance)}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider no-print">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{formatDateBr(t.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{t.store}</td>
                                <td className="px-6 py-4 text-sm text-slate-500 italic">{t.description || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {t.type === 'CREDIT' 
                                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">ENTRADA</span>
                                        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">SAÍDA</span>
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-slate-800">{formatCurrency(t.value)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center no-print">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => setEditingTransaction(t)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><Edit size={18}/></button>
                                        <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredTransactions.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Nenhum registro encontrado.</td></tr>}
                    </tbody>
                </table>
            </div>
            {editingTransaction && <EditEmprestimoModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleEditSave} />}
        </div>
    );
};
