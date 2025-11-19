
import React, { useState, useEffect } from 'react';
import { getFinancialRecords, getAppData, formatCurrency, exportFinancialToXML } from '../../services/storageService';
import { AppData, FinancialRecord } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FileText, FileSpreadsheet, Printer, AlertTriangle } from 'lucide-react';

interface FinancialChartData extends FinancialRecord {
    monthLabel: string;
}

export const RelatorioFinanceiro: React.FC = () => {
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    const [filteredData, setFilteredData] = useState<FinancialChartData[]>([]);
    
    const [storeFilter, setStoreFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');

    const [years, setYears] = useState<string[]>([]);

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
        setAppData(getAppData());
        const raw = getFinancialRecords();
        const uniqueYears = Array.from(new Set(raw.map(r => r.year.toString()))).sort().reverse();
        setYears(uniqueYears);
        // Default to most recent year if available
        if (uniqueYears.length > 0) setYearFilter(uniqueYears[0]);
    }, []);

    const generateReport = () => {
        const rawRecords = getFinancialRecords();
        let processed: FinancialChartData[] = [];

        if (storeFilter === '') {
            // Aggregation
            const grouped: Record<string, FinancialChartData> = {};
            rawRecords.forEach(r => {
                const key = `${r.year}-${r.month}`;
                if (!grouped[key]) {
                    const mName = monthNames.find(m => m.value === r.month)?.label || r.month;
                    grouped[key] = {
                        ...r,
                        id: `agg-${key}`,
                        store: 'Todas as Lojas',
                        monthLabel: `${mName.substring(0,3)}/${r.year}`,
                        totalRevenues: 0, totalExpenses: 0, netResult: 0,
                        creditCaixa: 0, creditDelta: 0, creditPagBankH: 0, creditPagBankD: 0, creditIfood: 0,
                        debitCaixa: 0, debitPagBankH: 0, debitPagBankD: 0, debitLoteria: 0
                    };
                }
                grouped[key].totalRevenues += r.totalRevenues;
                grouped[key].totalExpenses += r.totalExpenses;
                grouped[key].netResult += r.netResult;
            });
            processed = Object.values(grouped);
        } else {
            processed = rawRecords
                .filter(r => r.store === storeFilter)
                .map(r => {
                    const mName = monthNames.find(m => m.value === r.month)?.label || r.month;
                    return {
                        ...r,
                        monthLabel: `${mName.substring(0,3)}/${r.year}`
                    };
                });
        }

        // Filter
        processed = processed.filter(r => {
            return (yearFilter === '' || r.year.toString() === yearFilter) &&
                   (monthFilter === '' || r.month === monthFilter);
        });

        // Sort Oldest to Newest for Chart
        processed.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month.localeCompare(b.month);
        });

        setFilteredData(processed);
    };

    const handleExport = () => {
        if (filteredData.length === 0) {
            alert('Gere o relatório antes de exportar.');
            return;
        }
        exportFinancialToXML(filteredData, 'relatorio_financeiro_analise');
    };

    const handlePrint = () => {
        window.print();
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded opacity-95">
                    <p className="text-sm font-bold text-gray-800 mb-2 border-b pb-1">{label}</p>
                    {payload.map((entry: any) => (
                        <p key={entry.name} className="text-xs font-semibold" style={{ color: entry.color }}>
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                    <div className="mt-2 pt-2 border-t">
                         <p className="text-xs font-bold text-gray-600">
                            Saldo: {formatCurrency(payload[0].value - payload[1].value)}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8">
             {/* Filters */}
             <div className="bg-white p-6 rounded-lg shadow border border-gray-200 no-print">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                             <option value="">Selecione o Ano</option>
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
                <div className="flex gap-3">
                    <button onClick={generateReport} className="bg-gray-800 text-white px-8 py-3 rounded font-bold hover:bg-black flex items-center gap-2 w-full md:w-auto justify-center">
                        <FileText size={20} /> Gerar Relatório
                    </button>
                    {filteredData.length > 0 && (
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
            {filteredData.length > 0 ? (
                <div className="space-y-8 animate-fadeIn">
                    
                    {/* Summary Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        <div className="p-4 bg-gray-50 border-b font-bold text-gray-700">Resumo Financeiro {storeFilter ? ` - ${storeFilter}` : ' (Consolidado)'}</div>
                        <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Período</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Loja</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-green-700 uppercase">Receitas</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-red-700 uppercase">Despesas</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-800 uppercase">Resultado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredData.map((item, idx) => (
                                    <tr key={idx} className="break-inside-avoid">
                                        <td className="px-6 py-2 text-sm font-medium capitalize">{item.monthLabel}</td>
                                        <td className="px-6 py-2 text-sm text-gray-600">{item.store}</td>
                                        <td className="px-6 py-2 text-sm text-right font-mono text-green-700">{formatCurrency(item.totalRevenues)}</td>
                                        <td className="px-6 py-2 text-sm text-right font-mono text-red-700">{formatCurrency(item.totalExpenses)}</td>
                                        <td className={`px-6 py-2 text-sm text-right font-bold ${item.netResult >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                                            {formatCurrency(item.netResult)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Chart */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-[500px] break-inside-avoid">
                        <h3 className="text-2xl font-black text-gray-800 mb-6 text-center uppercase tracking-wider">
                            Comparativo: Receitas vs Despesas
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                                <XAxis dataKey="monthLabel" tick={{fill: '#4a5568', fontSize: 12}} />
                                <YAxis tickFormatter={(val) => `R$ ${val}`} tick={{fill: '#4a5568', fontSize: 12}} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f7fafc'}} />
                                <Legend wrapperStyle={{paddingTop: '20px'}} />
                                <Bar dataKey="totalRevenues" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                                <Bar dataKey="totalExpenses" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <AlertTriangle className="mx-auto mb-2 h-10 w-10 opacity-20" />
                    <p>Selecione os filtros e clique em "Gerar Relatório" para visualizar os dados.</p>
                </div>
            )}
        </div>
    );
};