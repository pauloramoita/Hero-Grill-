
import React, { useState, useEffect, useMemo } from 'react';
import { getLoanTransactions, getAppData, formatCurrency, formatDateBr, getTodayLocalISO, exportTransactionsToXML } from '../../services/storageService';
import { AppData, LoanTransaction, User } from '../../types';
import { FileText, FileSpreadsheet, Printer, Loader2, Wallet } from 'lucide-react';

interface RelatorioEmprestimosProps {
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

export const RelatorioEmprestimos: React.FC<RelatorioEmprestimosProps> = ({ user }) => {
    const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<LoanTransaction[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loading, setLoading] = useState(true);

    // Relatório Filters
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    
    const [startDate, setStartDate] = usePersistedState('hero_state_rel_loans_start', firstDay);
    const [endDate, setEndDate] = usePersistedState('hero_state_rel_loans_end', getTodayLocalISO());
    const [storeFilter, setStoreFilter] = usePersistedState('hero_state_rel_loans_store', '');

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
        exportTransactionsToXML(filteredTransactions, 'relatorio_emprestimos');
    };

    // Calculate Totals
    const totalDebit = filteredTransactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.value, 0);
    const totalCredit = filteredTransactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.value, 0);
    const balance = totalCredit - totalDebit;

    if (loading) return <Loader2 className="animate-spin mx-auto mt-10 text-indigo-600" size={40}/>;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Filters */}
            <div className="bg-white p-6 rounded-xl shadow-card border border-slate-200 no-print">
                <h3 className="text-lg font-black text-indigo-900 mb-4 border-b border-indigo-100 pb-2">Parâmetros do Relatório</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Início</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 font-bold text-slate-700" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Final</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 font-bold text-slate-700" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa</label>
                        <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 font-bold text-slate-700">
                            <option value="">Todas as Empresas</option>
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={generateReport} className="bg-indigo-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-800 flex items-center gap-2 shadow-lg transition-all active:scale-95">
                        <FileText size={20} /> Gerar Relatório
                    </button>
                     {filteredTransactions.length > 0 && (
                        <>
                            <button onClick={handleExport} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2 shadow-md transition-all">
                                <FileSpreadsheet size={20} /> Excel
                            </button>
                            <button onClick={() => window.print()} className="bg-slate-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 flex items-center gap-2 shadow-md transition-all">
                                <Printer size={20} /> Imprimir
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Results */}
            {filteredTransactions.length > 0 ? (
                <div className="space-y-6">
                    {/* List */}
                    <div className="bg-white rounded-xl shadow-card overflow-hidden border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Data</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Empresa</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Descrição</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Entradas</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Saídas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="break-inside-avoid hover:bg-slate-50">
                                        <td className="px-6 py-3 text-sm text-slate-700 font-medium">{formatDateBr(t.date)}</td>
                                        <td className="px-6 py-3 text-sm text-slate-600">{t.store}</td>
                                        <td className="px-6 py-3 text-sm text-slate-500 italic">{t.description || '-'}</td>
                                        <td className="px-6 py-3 text-sm text-right font-bold text-green-600 font-mono">
                                            {t.type === 'CREDIT' ? formatCurrency(t.value) : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-right font-bold text-red-600 font-mono">
                                            {t.type === 'DEBIT' ? formatCurrency(t.value) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-100 font-black text-slate-800 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right uppercase text-xs tracking-wider">TOTAIS DO PERÍODO:</td>
                                    <td className="px-6 py-4 text-right text-green-700">{formatCurrency(totalCredit)}</td>
                                    <td className="px-6 py-4 text-right text-red-700">{formatCurrency(totalDebit)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Final Summary Box */}
                    <div className="flex justify-end">
                        <div className={`p-6 rounded-2xl shadow-lg border w-full md:w-1/3 text-center text-white ${balance >= 0 ? 'bg-indigo-600 border-indigo-700' : 'bg-yellow-500 border-yellow-600'}`}>
                            <div className="flex items-center justify-center gap-2 mb-2 opacity-90">
                                <Wallet size={20}/>
                                <h4 className="text-sm font-bold uppercase tracking-wide">Saldo Líquido (Recebido - Pago)</h4>
                            </div>
                            <span className="text-4xl font-black tracking-tight">{formatCurrency(balance)}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-slate-400 py-16 bg-white border-2 border-dashed border-slate-200 rounded-xl">
                    <p>Selecione os filtros e clique em "Gerar Relatório" para visualizar os dados.</p>
                </div>
            )}
        </div>
    );
};
