
import React, { useState, useEffect, useMemo } from 'react';
import { getAccountBalances, getAppData, formatCurrency, deleteAccountBalance, updateAccountBalance, exportBalancesToXML } from '../../services/storageService';
import { AppData, AccountBalance, User } from '../../types';
import { Search, Trash2, Edit, TrendingUp, TrendingDown, Minus, Layers, FileSpreadsheet, Printer, Loader2, RefreshCw } from 'lucide-react';
import { EditSaldoModal } from './EditSaldoModal';

interface BalanceWithVariation extends AccountBalance {
    variation: number;
    isAggregated?: boolean;
}

interface ConsultaSaldoProps {
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

export const ConsultaSaldo: React.FC<ConsultaSaldoProps> = ({ user }) => {
    const [rawBalances, setRawBalances] = useState<AccountBalance[]>([]);
    const [displayBalances, setDisplayBalances] = useState<BalanceWithVariation[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loading, setLoading] = useState(true);
    
    // Filters with Persistence
    const [storeFilter, setStoreFilter] = usePersistedState('hero_state_saldo_store', '');
    const [yearFilter, setYearFilter] = usePersistedState('hero_state_saldo_year', '');
    const [monthFilter, setMonthFilter] = usePersistedState('hero_state_saldo_month', '');
    
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

    const loadData = async () => {
        setLoading(true);
        try {
            const [d, loaded] = await Promise.all([getAppData(), getAccountBalances()]);
            setAppData(d);
            setRawBalances(loaded);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const availableStores = useMemo(() => {
        if (user.isMaster) return appData.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return appData.stores.filter(s => user.permissions.stores.includes(s));
        }
        return appData.stores;
    }, [appData.stores, user]);

    useEffect(() => {
        if (availableStores.length === 1) {
            setStoreFilter(availableStores[0]);
        }
    }, [availableStores]);

    useEffect(() => {
        processData();
    }, [rawBalances, storeFilter, yearFilter, monthFilter, user]);

    const processData = () => {
        let processed: BalanceWithVariation[] = [];

        let effectiveStoreFilter = storeFilter;
        if (availableStores.length === 1) {
            effectiveStoreFilter = availableStores[0];
        }

        if (effectiveStoreFilter === '') {
            const allowedStores = user.isMaster ? null : user.permissions.stores;
            
            const grouped: Record<string, AccountBalance> = {};

            rawBalances.forEach(b => {
                if (allowedStores && allowedStores.length > 0 && !allowedStores.includes(b.store)) return;

                const key = `${b.year}-${b.month}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        ...b,
                        id: `agg-${key}`,
                        store: 'Todas as Lojas (Consolidado)',
                        caixaEconomica: 0, cofre: 0, loteria: 0, pagbankH: 0, pagbankD: 0, investimentos: 0,
                        totalBalance: 0
                    };
                }
                grouped[key].totalBalance += b.totalBalance;
            });

            const aggregatedList = Object.values(grouped).sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month.localeCompare(b.month);
            });

            for (let i = 0; i < aggregatedList.length; i++) {
                const current = aggregatedList[i];
                let variation = 0;
                if (i > 0) {
                    variation = current.totalBalance - aggregatedList[i-1].totalBalance;
                }
                processed.push({ ...current, variation, isAggregated: true });
            }

        } else {
            const storeData = rawBalances.filter(b => b.store === effectiveStoreFilter);
            storeData.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month.localeCompare(b.month);
            });

            for (let i = 0; i < storeData.length; i++) {
                const current = storeData[i];
                let variation = 0;
                if (i > 0) {
                    variation = current.totalBalance - storeData[i-1].totalBalance;
                }
                processed.push({ ...current, variation, isAggregated: false });
            }
        }

        let result = processed.filter(b => {
            return (yearFilter === '' || b.year.toString() === yearFilter) &&
                   (monthFilter === '' || b.month === monthFilter);
        });

        result.reverse();
        setDisplayBalances(result);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este registro?')) {
            await deleteAccountBalance(id);
            loadData();
        }
    };

    const handleEditClick = (b: AccountBalance) => {
        setEditingBalance(b);
    };

    const handleEditSave = async (updated: AccountBalance) => {
        await updateAccountBalance(updated);
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

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 no-print">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                        <select 
                            value={storeFilter} 
                            onChange={e => setStoreFilter(e.target.value)} 
                            className={`w-full border p-2 rounded ${availableStores.length === 1 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                            disabled={availableStores.length === 1}
                        >
                             {availableStores.length !== 1 && <option value="">Todas as Lojas (Consolidado)</option>}
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {storeFilter === '' && <p className="text-[10px] text-orange-500 mt-1 font-bold italic">Modo Consolidado: Edição indisponível.</p>}
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
                <div className="flex justify-end gap-2 border-t pt-4 mt-2">
                    <button onClick={loadData} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 shadow-sm mr-auto">
                        <RefreshCw size={18}/> Atualizar
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 shadow-sm">
                        <FileSpreadsheet size={18}/> Excel
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm">
                        <Printer size={18}/> Imprimir / PDF
                    </button>
                </div>
            </div>

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
                                        <span className="text-xs text-gray-400 italic">Consolidado (Ver Detalhes)</span>
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
