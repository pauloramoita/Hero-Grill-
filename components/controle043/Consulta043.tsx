
import React, { useState, useEffect } from 'react';
import { getTransactions043, getAppData, formatCurrency, formatDateBr, getMonthLocalISO, getTodayLocalISO, deleteTransaction043 } from '../../services/storageService';
import { AppData, Transaction043 } from '../../types';
import { Search, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

export const Consulta043: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction043[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction043[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });

    // Filter States
    const [viewMode, setViewMode] = useState<'DETAILED' | 'SYNTHETIC'>('DETAILED');
    const [storeFilter, setStoreFilter] = useState('');
    const [timeType, setTimeType] = useState<'DATE' | 'MONTH' | 'YEAR'>('MONTH');
    
    const [dateValue, setDateValue] = useState(getTodayLocalISO());
    const [monthValue, setMonthValue] = useState(getMonthLocalISO());
    const [yearValue, setYearValue] = useState(new Date().getFullYear().toString());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setTransactions(getTransactions043());
        setAppData(getAppData());
    };

    // Apply Filters
    useEffect(() => {
        let result = transactions;

        // 1. Store Filter
        if (storeFilter) {
            result = result.filter(t => t.store === storeFilter);
        }

        // 2. Time Filter
        result = result.filter(t => {
            if (timeType === 'DATE') {
                return t.date === dateValue;
            } else if (timeType === 'MONTH') {
                return t.date.startsWith(monthValue);
            } else if (timeType === 'YEAR') {
                return t.date.startsWith(yearValue);
            }
            return true;
        });

        setFilteredTransactions(result);
    }, [transactions, storeFilter, timeType, dateValue, monthValue, yearValue]);

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
            deleteTransaction043(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
        }
    };

    // Calculate Totals
    const totalDebit = filteredTransactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.value, 0);
    const totalCredit = filteredTransactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.value, 0);
    const balance = totalCredit - totalDebit;

    return (
        <div className="space-y-6">
            {/* Filters Panel */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                    
                    {/* Visão */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Filtrar por (Visão)</label>
                        <select 
                            value={viewMode} 
                            onChange={(e) => setViewMode(e.target.value as any)} 
                            className="w-full border p-2 rounded bg-gray-50"
                        >
                            <option value="DETAILED">Detalhado</option>
                            <option value="SYNTHETIC">Sintético (Totais)</option>
                        </select>
                    </div>

                    {/* Loja */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                        <select 
                            value={storeFilter} 
                            onChange={(e) => setStoreFilter(e.target.value)} 
                            className="w-full border p-2 rounded"
                        >
                            <option value="">Todas as Lojas</option>
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Tipo de Período */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Consultar por</label>
                        <select 
                            value={timeType} 
                            onChange={(e) => setTimeType(e.target.value as any)} 
                            className="w-full border p-2 rounded bg-gray-50"
                        >
                            <option value="DATE">Data Específica</option>
                            <option value="MONTH">Mês</option>
                            <option value="YEAR">Ano</option>
                        </select>
                    </div>

                    {/* Seleção de Data */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Selecionar</label>
                        {timeType === 'DATE' && (
                            <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="w-full border p-2 rounded" />
                        )}
                        {timeType === 'MONTH' && (
                            <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} className="w-full border p-2 rounded" />
                        )}
                        {timeType === 'YEAR' && (
                            <input 
                                type="number" 
                                min="2020" max="2030" 
                                value={yearValue} 
                                onChange={(e) => setYearValue(e.target.value)} 
                                className="w-full border p-2 rounded" 
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Totals Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 p-4 rounded border border-red-200">
                    <span className="text-red-600 font-bold text-xs uppercase">Total Débitos</span>
                    <div className="text-2xl font-black text-red-800">{formatCurrency(totalDebit)}</div>
                </div>
                <div className="bg-green-50 p-4 rounded border border-green-200">
                    <span className="text-green-600 font-bold text-xs uppercase">Total Créditos</span>
                    <div className="text-2xl font-black text-green-800">{formatCurrency(totalCredit)}</div>
                </div>
                <div className={`p-4 rounded border ${balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <span className="text-gray-600 font-bold text-xs uppercase">Saldo Líquido</span>
                    <div className={`text-2xl font-black ${balance >= 0 ? 'text-blue-800' : 'text-yellow-800'}`}>
                        {formatCurrency(balance)}
                    </div>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'DETAILED' ? (
                <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Loja</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Descrição</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Valor</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{formatDateBr(t.date)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{t.store}</td>
                                    <td className="px-6 py-4 text-sm">
                                        {t.type === 'DEBIT' ? (
                                            <span className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded w-fit text-xs">
                                                <TrendingDown size={14} /> DÉBITO
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded w-fit text-xs">
                                                <TrendingUp size={14} /> CRÉDITO
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 italic">
                                        {t.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-mono font-bold text-gray-800">
                                        {formatCurrency(t.value)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => handleDelete(t.id)}
                                            className="text-red-400 hover:text-red-600 p-1"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum lançamento encontrado para os filtros selecionados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white p-12 rounded-lg shadow border border-gray-200 text-center">
                     <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
                     <h3 className="text-xl font-bold text-gray-800">Resumo Sintético</h3>
                     <p className="text-gray-500">Os totais calculados acima representam o consolidado do período selecionado.</p>
                </div>
            )}
        </div>
    );
};
