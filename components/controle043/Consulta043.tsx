import React, { useState, useEffect } from 'react';
import { getTransactions043, getAppData, formatCurrency, formatDateBr, deleteTransaction043, updateTransaction043, exportTransactionsToXML } from '../../services/storageService';
import { AppData, Transaction043 } from '../../types';
import { Trash2, TrendingUp, TrendingDown, Edit, FileSpreadsheet, Printer, Loader2 } from 'lucide-react';
import { EditTransactionModal } from './EditTransactionModal';

export const Consulta043: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction043[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction043[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    const [loading, setLoading] = useState(true);
    const [editingTransaction, setEditingTransaction] = useState<Transaction043 | null>(null);
    const [storeFilter, setStoreFilter] = useState('');
    
    const [dateValue, setDateValue] = useState(new Date().toISOString().slice(0, 7)); 

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [t, d] = await Promise.all([getTransactions043(), getAppData()]);
            setTransactions(t);
            setAppData(d);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        let result = transactions.filter(t => t.date.startsWith(dateValue));
        if (storeFilter) result = result.filter(t => t.store === storeFilter);
        setFilteredTransactions(result.sort((a, b) => a.date.localeCompare(b.date)));
    }, [transactions, storeFilter, dateValue]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Excluir?')) {
            await deleteTransaction043(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleEditSave = async (updated: Transaction043) => {
        await updateTransaction043(updated);
        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
        setEditingTransaction(null);
    };

    const totalDebit = filteredTransactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.value, 0);
    const totalCredit = filteredTransactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.value, 0);
    const balance = totalCredit - totalDebit;

    if (loading) return <Loader2 className="animate-spin mx-auto mt-10"/>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border no-print flex gap-4 flex-wrap">
                <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="border p-2 rounded">
                    <option value="">Todas as Lojas</option>
                    {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="month" value={dateValue} onChange={e => setDateValue(e.target.value)} className="border p-2 rounded" />
                <button onClick={() => exportTransactionsToXML(filteredTransactions, '043')} className="ml-auto bg-green-600 text-white px-4 py-2 rounded flex gap-2"><FileSpreadsheet size={18}/> Excel</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 p-4 rounded border text-red-800 font-bold">Débitos: {formatCurrency(totalDebit)}</div>
                <div className="bg-green-50 p-4 rounded border text-green-800 font-bold">Créditos: {formatCurrency(totalCredit)}</div>
                <div className={`p-4 rounded border font-bold ${balance >= 0 ? 'bg-blue-50 text-blue-800' : 'bg-yellow-50 text-yellow-800'}`}>Saldo: {formatCurrency(balance)}</div>
            </div>

            <div className="bg-white rounded shadow border">
                <table className="w-full">
                    <thead className="bg-gray-50"><tr><th className="p-3 text-left">Data</th><th className="p-3 text-left">Loja</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-right">Valor</th><th className="p-3">Ações</th></tr></thead>
                    <tbody>
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="border-t hover:bg-gray-50">
                                <td className="p-3">{formatDateBr(t.date)}</td>
                                <td className="p-3">{t.store}</td>
                                <td className="p-3 font-bold">{t.type === 'DEBIT' ? <span className="text-red-600">DÉBITO</span> : <span className="text-green-600">CRÉDITO</span>}</td>
                                <td className="p-3 text-right font-mono">{formatCurrency(t.value)}</td>
                                <td className="p-3 flex justify-center gap-2">
                                    <button onClick={() => setEditingTransaction(t)} className="text-gray-600"><Edit size={18}/></button>
                                    <button onClick={() => handleDelete(t.id)} className="text-red-500"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {editingTransaction && <EditTransactionModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleEditSave} />}
        </div>
    );
};