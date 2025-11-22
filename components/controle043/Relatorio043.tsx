
import React, { useState, useEffect, useMemo } from 'react';
import { getTransactions043, getAppData, formatCurrency, formatDateBr, getTodayLocalISO, exportTransactionsToXML } from '../../services/storageService';
import { AppData, Transaction043, User } from '../../types';
import { FileText, TrendingUp, TrendingDown, FileSpreadsheet, Printer, Loader2 } from 'lucide-react';

interface Relatorio043Props {
    user: User;
}

// Hook para persistência de estado
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

export const Relatorio043: React.FC<Relatorio043Props> = ({ user }) => {
    const [transactions, setTransactions] = useState<Transaction043[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction043[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loading, setLoading] = useState(true);

    // Relatório Filters
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    
    const [startDate, setStartDate] = usePersistedState('hero_state_rel_043_start', firstDay);
    const [endDate, setEndDate] = usePersistedState('hero_state_rel_043_end', getTodayLocalISO());
    const [storeFilter, setStoreFilter] = usePersistedState('hero_state_rel_043_store', '');

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

    // Determine available stores based on user permissions
    const availableStores = useMemo(() => {
        if (user.isMaster) return appData.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return appData.stores.filter(s => user.permissions.stores.includes(s));
        }
        return appData.stores;
    }, [appData.stores, user]);

    const generateReport = () => {
        const filtered = transactions.filter(t => {
            const dateMatch = t.date >= startDate && t.date <= endDate;
            const storeMatch = storeFilter === '' || t.store === storeFilter;
            
            // Permission Check
            let allowed = true;
            if (!user.isMaster && availableStores.length > 0) {
                 allowed = availableStores.includes(t.store);
            }

            return dateMatch && storeMatch && allowed;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setFilteredTransactions(filtered);
    };

    const handleExport = () => {
        if (filteredTransactions.length === 0) {
            alert('Gere o relatório antes de exportar.');
            return;
        }
        exportTransactionsToXML(filteredTransactions, 'relatorio_043');
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculate Totals
    const totalDebit = filteredTransactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.value, 0);
    const totalCredit = filteredTransactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.value, 0);
    const balance = totalCredit - totalDebit;

    if (loading) return <Loader2 className="animate-spin mx-auto mt-10"/>;

    return (
        <div className="space-y-8">
            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 no-print">
                <h3 className="text-lg font-bold text-heroRed mb-4 border-b pb-2">Parâmetros do Relatório</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Início</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Data Final</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                        <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="w-full border p-2 rounded">
                            <option value="">Todas as Lojas</option>
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={generateReport} className="bg-heroBlack text-white px-8 py-3 rounded font-bold hover:bg-gray-800 flex items-center gap-2">
                        <FileText size={20} /> Gerar Relatório
                    </button>
                     {filteredTransactions.length > 0 && (
                        <>
                            <button onClick={handleExport} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2">
                                <FileSpreadsheet size={20} /> Excel
                            </button>
                            <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 flex items-center gap-2">
                                <Printer size={20} /> Imprimir/PDF
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Results */}
            {filteredTransactions.length > 0 ? (
                <div className="space-y-4 animate-fadeIn">
                    {/* List */}
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Loja</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Descrição</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Débito</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Crédito</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="break-inside-avoid">
                                        <td className="px-6 py-2 text-sm text-gray-900">{formatDateBr(t.date)}</td>
                                        <td className="px-6 py-2 text-sm text-gray-600">{t.store}</td>
                                        <td className="px-6 py-2 text-sm text-gray-500 italic">{t.description || '-'}</td>
                                        <td className="px-6 py-2 text-sm text-right text-red-600 font-medium">
                                            {t.type === 'DEBIT' ? formatCurrency(t.value) : '-'}
                                        </td>
                                        <td className="px-6 py-2 text-sm text-right text-green-600 font-medium">
                                            {t.type === 'CREDIT' ? formatCurrency(t.value) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right text-gray-700">TOTAIS DO PERÍODO:</td>
                                    <td className="px-6 py-4 text-right text-red-700">{formatCurrency(totalDebit)}</td>
                                    <td className="px-6 py-4 text-right text-green-700">{formatCurrency(totalCredit)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Final Summary Box */}
                    <div className="flex justify-end">
                        <div className={`p-6 rounded-lg shadow-lg border w-full md:w-1/3 text-center ${balance >= 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-yellow-500 border-yellow-600 text-white'}`}>
                            <h4 className="text-sm font-bold uppercase opacity-90 mb-2">Saldo Final (Créditos - Débitos)</h4>
                            <span className="text-4xl font-black tracking-tight">{formatCurrency(balance)}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <TrendingUp size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Selecione os filtros e clique em "Gerar Relatório" para visualizar os dados.</p>
                </div>
            )}
        </div>
    );
};
