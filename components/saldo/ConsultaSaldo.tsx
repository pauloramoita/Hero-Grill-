
import React, { useState, useEffect } from 'react';
import { getAccountBalances, getAppData, formatCurrency, deleteAccountBalance, updateAccountBalance } from '../../services/storageService';
import { AppData, AccountBalance } from '../../types';
import { Search, Trash2, Edit, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { EditSaldoModal } from './EditSaldoModal';

interface BalanceWithVariation extends AccountBalance {
    variation: number;
}

export const ConsultaSaldo: React.FC = () => {
    const [balances, setBalances] = useState<BalanceWithVariation[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    
    const [storeFilter, setStoreFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    
    const [editingBalance, setEditingBalance] = useState<AccountBalance | null>(null);

    const monthNames = [
        { value: '01', label: 'Janeiro' },
        { value: '02', label: 'Fevereiro' },
        { value: '03', label: 'Março' },
        { value: '04', label: 'Abril' },
        { value: '05', label: 'Maio' },
        { value: '06', label: 'Junho' },
        { value: '07', label: 'Julho' },
        { value: '08', label: 'Agosto' },
        { value: '09', label: 'Setembro' },
        { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' },
        { value: '12', label: 'Dezembro' },
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setAppData(getAppData());
        const rawBalances = getAccountBalances();
        
        // Sort by Store, then Year, then Month to calculate variation accurately
        rawBalances.sort((a, b) => {
            if (a.store !== b.store) return a.store.localeCompare(b.store);
            if (a.year !== b.year) return a.year - b.year;
            return a.month.localeCompare(b.month);
        });

        // Calculate variations dynamically
        const processed: BalanceWithVariation[] = [];
        for (let i = 0; i < rawBalances.length; i++) {
            const current = rawBalances[i];
            let variation = 0;

            // Find previous record for same store
            // Since it's sorted, we check if previous index exists and matches store
            if (i > 0 && rawBalances[i-1].store === current.store) {
                const prev = rawBalances[i-1];
                variation = current.totalBalance - prev.totalBalance;
            }

            processed.push({ ...current, variation });
        }

        // Reverse for display (Newest first)
        setBalances(processed.reverse());
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este registro?')) {
            deleteAccountBalance(id);
            loadData(); // Reload to recalc variations
        }
    };

    const handleEditClick = (b: AccountBalance) => {
        setEditingBalance(b);
    };

    const handleEditSave = (updated: AccountBalance) => {
        updateAccountBalance(updated);
        setEditingBalance(null);
        loadData();
    };

    const filteredBalances = balances.filter(b => {
        return (storeFilter === '' || b.store === storeFilter) &&
               (yearFilter === '' || b.year.toString() === yearFilter) &&
               (monthFilter === '' || b.month === monthFilter);
    });

    const years = (Array.from(new Set(balances.map(b => b.year))) as number[]).sort((a, b) => b - a);

    const getMonthName = (m: string) => monthNames.find(mn => mn.value === m)?.label || m;

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                    <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="w-full border p-2 rounded">
                        <option value="">Todas as Lojas</option>
                        {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Ano</label>
                    <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="w-full border p-2 rounded">
                        <option value="">Todos os Anos</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Mês</label>
                    <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-full border p-2 rounded">
                        <option value="">Todos os Meses</option>
                        {monthNames.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Loja</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase text-blue-600">Saldo do Mês</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total (Variação)</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredBalances.map((b) => (
                            <tr key={b.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium capitalize">
                                    {getMonthName(b.month)} / {b.year}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {b.store}
                                </td>
                                <td className={`px-4 py-3 text-sm text-right font-mono font-bold bg-blue-50 ${b.totalBalance < 0 ? 'text-red-800' : 'text-blue-800'}`}>
                                    {formatCurrency(b.totalBalance)}
                                </td>
                                <td className={`px-4 py-3 text-sm text-right font-mono font-bold ${b.variation > 0 ? 'text-green-600' : b.variation < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                    <div className="flex items-center justify-end gap-1">
                                        {b.variation > 0 ? <TrendingUp size={14}/> : b.variation < 0 ? <TrendingDown size={14}/> : <Minus size={14}/>}
                                        {formatCurrency(b.variation)}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <button 
                                        onClick={() => handleEditClick(b)} 
                                        className="text-gray-600 hover:text-gray-900 p-1 mr-2" 
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(b.id)}
                                        className="text-red-400 hover:text-red-600 p-1"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredBalances.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum registro encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingBalance && (
                <EditSaldoModal 
                    balance={editingBalance} 
                    onClose={() => setEditingBalance(null)} 
                    onSave={handleEditSave} 
                />
            )}
        </div>
    );
};
