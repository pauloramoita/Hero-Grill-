
import React, { useState, useEffect } from 'react';
import { getAccountBalances, getAppData, formatCurrency, deleteAccountBalance, updateAccountBalance, exportBalancesToXML } from '../../services/storageService';
import { AppData, AccountBalance } from '../../types';
import { Search, Trash2, Edit, TrendingUp, TrendingDown, Minus, Layers, FileSpreadsheet, Printer } from 'lucide-react';
import { EditSaldoModal } from './EditSaldoModal';

interface BalanceWithVariation extends AccountBalance {
    variation: number;
    isAggregated?: boolean;
}

export const ConsultaSaldo: React.FC = () => {
    const [rawBalances, setRawBalances] = useState<AccountBalance[]>([]);
    const [displayBalances, setDisplayBalances] = useState<BalanceWithVariation[]>([]);
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
        const loaded = getAccountBalances();
        setRawBalances(loaded);
    };

    // Effect to process data whenever filters or raw data changes
    useEffect(() => {
        processData();
    }, [rawBalances, storeFilter, yearFilter, monthFilter]);

    const processData = () => {
        let processed: BalanceWithVariation[] = [];

        if (storeFilter === '') {
            // === AGGREGATION MODE (ALL STORES) ===
            // 1. Group by Year-Month
            const grouped: Record<string, AccountBalance> = {};

            rawBalances.forEach(b => {
                const key = `${b.year}-${b.month}`;
                if (!grouped[key]) {
                    // Create a base object for the month
                    grouped[key] = {
                        ...b,
                        id: `agg-${key}`, // Artificial ID
                        store: 'Todas as Lojas (Consolidado)',
                        caixaEconomica: 0, cofre: 0, loteria: 0, pagbankH: 0, pagbankD: 0, investimentos: 0,
                        totalBalance: 0
                    };
                }
                // Sum values
                grouped[key].totalBalance += b.totalBalance;
                // (Optional: Sum individual accounts if we wanted to show them detailed)
                grouped[key].caixaEconomica += b.caixaEconomica;
                grouped[key].cofre += b.cofre;
                grouped[key].loteria += b.loteria;
                grouped[key].pagbankH += b.pagbankH;
                grouped[key].pagbankD += b.pagbankD;
                grouped[key].investimentos += b.investimentos;
            });

            // 2. Convert to array and Sort by Date (Oldest -> Newest) for variation calculation
            const aggregatedList = Object.values(grouped).sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month.localeCompare(b.month);
            });

            // 3. Calculate Variation on the Aggregated Data
            for (let i = 0; i < aggregatedList.length; i++) {
                const current = aggregatedList[i];
                let variation = 0;
                
                // Compare with previous month in the aggregated list
                if (i > 0) {
                    variation = current.totalBalance - aggregatedList[i-1].totalBalance;
                }
                
                processed.push({ ...current, variation, isAggregated: true });
            }

        } else {
            // === INDIVIDUAL STORE MODE ===
            // 1. Filter by store first
            const storeData = rawBalances.filter(b => b.store === storeFilter);
            
            // 2. Sort by Date
            storeData.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month.localeCompare(b.month);
            });

            // 3. Calculate Variation
            for (let i = 0; i < storeData.length; i++) {
                const current = storeData[i];
                let variation = 0;
                if (i > 0) {
                    variation = current.totalBalance - storeData[i-1].totalBalance;
                }
                processed.push({ ...current, variation, isAggregated: false });
            }
        }

        // 4. Apply Date Filters (Year/Month) AFTER variation calculation to keep history context
        // If we filter before, we might lose the "previous month" needed for the first visible row's calculation.
        // However, for strict filtering matching the UI dropdowns:
        let result = processed.filter(b => {
            return (yearFilter === '' || b.year.toString() === yearFilter) &&
                   (monthFilter === '' || b.month === monthFilter);
        });

        // 5. Reverse for Display (Newest First)
        result.reverse();

        setDisplayBalances(result);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este registro?')) {
            deleteAccountBalance(id);
            loadData(); // Reload raw data
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

    const handleExport = () => {
        if (displayBalances.length === 0) {
            alert('Sem dados para exportar.');
            return;
        }
        exportBalancesToXML(displayBalances, 'relatorio_saldos');
    };

    const handlePrint = () => {
        window.print();
    };

    const years = (Array.from(new Set(rawBalances.map(b => b.year))) as number[]).sort((a, b) => b - a);

    const getMonthName = (m: string) => monthNames.find(mn => mn.value === m)?.label || m;

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                    <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="w-full border p-2 rounded">
                        <option value="">Todas as Lojas (Consolidado)</option>
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

            {/* Actions */}
            <div className="flex justify-end gap-2 no-print">
                <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    <FileSpreadsheet size={18}/> Excel
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    <Printer size={18}/> Imprimir / PDF
                </button>
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
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase no-print">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {displayBalances.map((b) => (
                            <tr key={b.id} className="hover:bg-gray-50 break-inside-avoid">
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium capitalize">
                                    {getMonthName(b.month)} / {b.year}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {b.isAggregated ? (
                                        <span className="font-bold text-heroBlack flex items-center gap-2">
                                            <Layers size={16} /> {b.store}
                                        </span>
                                    ) : (
                                        b.store
                                    )}
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
                                <td className="px-4 py-3 text-center whitespace-nowrap no-print">
                                    {b.isAggregated ? (
                                        <span className="text-xs text-gray-400 italic">Consolidado</span>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => handleEditClick(b)} 
                                                className="text-gray-600 hover:text-gray-900 p-1" 
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
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {displayBalances.length === 0 && (
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