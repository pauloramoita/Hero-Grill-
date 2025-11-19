
import React, { useState, useEffect } from 'react';
import { getFinancialRecords, getAppData, formatCurrency, deleteFinancialRecord, updateFinancialRecord, exportFinancialToXML } from '../../services/storageService';
import { AppData, FinancialRecord } from '../../types';
import { Search, Trash2, Edit, FileSpreadsheet, Printer, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { EditFinanceiroModal } from './EditFinanceiroModal';

interface FinancialRecordWithAgg extends FinancialRecord {
    isAggregated?: boolean;
}

export const ConsultaFinanceiro: React.FC = () => {
    const [rawRecords, setRawRecords] = useState<FinancialRecord[]>([]);
    const [displayRecords, setDisplayRecords] = useState<FinancialRecordWithAgg[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    
    const [storeFilter, setStoreFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    
    const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);

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
        const loaded = getFinancialRecords();
        setRawRecords(loaded);
    };

    useEffect(() => {
        processData();
    }, [rawRecords, storeFilter, yearFilter, monthFilter]);

    const processData = () => {
        let processed: FinancialRecordWithAgg[] = [];

        if (storeFilter === '') {
            // Aggregation Mode (All Stores)
            const grouped: Record<string, FinancialRecord> = {};

            rawRecords.forEach(r => {
                const key = `${r.year}-${r.month}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        ...r,
                        id: `agg-${key}`,
                        store: 'Todas as Lojas (Consolidado)',
                        creditCaixa: 0, creditDelta: 0, creditPagBankH: 0, creditPagBankD: 0, creditIfood: 0, totalRevenues: 0,
                        debitCaixa: 0, debitPagBankH: 0, debitPagBankD: 0, debitLoteria: 0, totalExpenses: 0,
                        netResult: 0
                    };
                }
                // Sum everything
                grouped[key].creditCaixa += r.creditCaixa;
                grouped[key].creditDelta += r.creditDelta;
                grouped[key].creditPagBankH += r.creditPagBankH;
                grouped[key].creditPagBankD += r.creditPagBankD;
                grouped[key].creditIfood += r.creditIfood;
                grouped[key].totalRevenues += r.totalRevenues;

                grouped[key].debitCaixa += r.debitCaixa;
                grouped[key].debitPagBankH += r.debitPagBankH;
                grouped[key].debitPagBankD += r.debitPagBankD;
                grouped[key].debitLoteria += r.debitLoteria;
                grouped[key].totalExpenses += r.totalExpenses;
                
                grouped[key].netResult += r.netResult;
            });

            processed = Object.values(grouped).map(r => ({ ...r, isAggregated: true }));

        } else {
            // Filter by store
            processed = rawRecords.filter(r => r.store === storeFilter);
        }

        // Sort by Date (Newest first)
        processed.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month.localeCompare(a.month);
        });

        // Apply Date Filters
        const result = processed.filter(r => {
            return (yearFilter === '' || r.year.toString() === yearFilter) &&
                   (monthFilter === '' || r.month === monthFilter);
        });

        setDisplayRecords(result);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este registro financeiro?')) {
            deleteFinancialRecord(id);
            loadData();
        }
    };

    const handleEditClick = (r: FinancialRecord) => {
        setEditingRecord(r);
    };

    const handleEditSave = (updated: FinancialRecord) => {
        updateFinancialRecord(updated);
        setEditingRecord(null);
        loadData();
    };

    const handleExport = () => {
        if (displayRecords.length === 0) {
            alert('Sem dados para exportar.');
            return;
        }
        exportFinancialToXML(displayRecords, 'relatorio_financeiro');
    };

    const handlePrint = () => {
        window.print();
    };

    const years = (Array.from(new Set(rawRecords.map(r => r.year))) as number[]).sort((a, b) => b - a);
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
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase">Período</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase">Loja</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase bg-green-900">Receitas</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase bg-red-900">Despesas</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase">Saldo (Total)</th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase no-print">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {displayRecords.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50 break-inside-avoid">
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium capitalize">
                                    {getMonthName(r.month)} / {r.year}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {r.isAggregated ? (
                                        <span className="font-bold text-gray-800 flex items-center gap-2">
                                            <Layers size={16} /> {r.store}
                                        </span>
                                    ) : (
                                        r.store
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-mono font-bold text-green-700 bg-green-50">
                                    {formatCurrency(r.totalRevenues)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-mono font-bold text-red-700 bg-red-50">
                                    {formatCurrency(r.totalExpenses)}
                                </td>
                                <td className={`px-4 py-3 text-sm text-right font-mono font-black ${r.netResult >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                                    <div className="flex items-center justify-end gap-1">
                                        {r.netResult > 0 ? <TrendingUp size={14} className="text-green-600"/> : <TrendingDown size={14} className="text-red-600"/>}
                                        {formatCurrency(r.netResult)}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap no-print">
                                    {r.isAggregated ? (
                                        <span className="text-xs text-gray-400 italic">Consolidado</span>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => handleEditClick(r)} 
                                                className="text-gray-600 hover:text-gray-900 p-1" 
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(r.id)}
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
                        {displayRecords.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nenhum registro encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingRecord && (
                <EditFinanceiroModal 
                    record={editingRecord} 
                    onClose={() => setEditingRecord(null)} 
                    onSave={handleEditSave} 
                />
            )}
        </div>
    );
};