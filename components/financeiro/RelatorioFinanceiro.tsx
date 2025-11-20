import React, { useState, useEffect } from 'react';
import { getFinancialRecords, getAppData, formatCurrency, exportFinancialToXML } from '../../services/storageService';
import { AppData, FinancialRecord } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FileText, FileSpreadsheet, Printer, AlertTriangle, Loader2 } from 'lucide-react';

interface FinancialChartData extends FinancialRecord {
    monthLabel: string;
}

export const RelatorioFinanceiro: React.FC = () => {
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [filteredData, setFilteredData] = useState<FinancialChartData[]>([]);
    const [loading, setLoading] = useState(true);
    
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
        const load = async () => {
            setLoading(true);
            const d = await getAppData();
            setAppData(d);
            const raw = await getFinancialRecords();
            const uniqueYears = Array.from(new Set(raw.map(r => r.year.toString()))).sort().reverse();
            setYears(uniqueYears);
            if (uniqueYears.length > 0) setYearFilter(uniqueYears[0]);
            setLoading(false);
        };
        load();
    }, []);

    const generateReport = async () => {
        setLoading(true);
        const rawRecords = await getFinancialRecords();
        let processed: FinancialChartData[] = [];

        if (storeFilter === '') {
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

        processed = processed.filter(r => {
            return (yearFilter === '' || r.year.toString() === yearFilter) &&
                   (monthFilter === '' || r.month === monthFilter);
        });

        processed.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month.localeCompare(b.month);
        });

        setFilteredData(processed);
        setLoading(false);
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
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }} className="text-xs font-bold">
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading && filteredData.length === 0) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" size={40}/></div>;

    const totalRevenues = filteredData.reduce((acc, r) => acc + r.totalRevenues, 0);
    const totalExpenses = filteredData.reduce((acc, r) => acc + r.totalExpenses, 0);
    const netResult = totalRevenues - totalExpenses;

    return (
        <div className="space-y-8">
            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 no-print">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Parâmetros do Relatório</h3>
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
                    <button onClick={generateReport} className="bg-gray-800 text-white px-8 py-3 rounded font-bold hover:bg-gray-700 flex items-center gap-2">
                         {loading ? <Loader2 className="animate-spin"/> : <FileText size={20} />} Gerar Relatório
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
                    
                    {/* Chart */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-96 break-inside-avoid">
                         <h3 className="text-lg font-bold text-gray-800 mb-4 text-center uppercase">Evolução Financeira (Receitas x Despesas)</h3>
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="monthLabel" />
                                <YAxis tickFormatter={(val) => `R$ ${val/1000}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="totalRevenues" name="Receitas" fill="#10B981" barSize={20} />
                                <Bar dataKey="totalExpenses" name="Despesas" fill="#EF4444" barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                         <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Período</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Loja</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase text-green-700">Receitas</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase text-red-700">Despesas</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Resultado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredData.map((item, idx) => (
                                    <tr key={idx} className="break-inside-avoid">
                                        <td className="px-6 py-2 text-sm font-medium capitalize">{item.monthLabel}</td>
                                        <td className="px-6 py-2 text-sm text-gray-600">{item.store}</td>
                                        <td className="px-6 py-2 text-sm text-right font-mono text-green-600">{formatCurrency(item.totalRevenues)}</td>
                                        <td className="px-6 py-2 text-sm text-right font-mono text-red-600">{formatCurrency(item.totalExpenses)}</td>
                                        <td className={`px-6 py-2 text-sm text-right font-bold ${item.netResult >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                                            {formatCurrency(item.netResult)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold border-t">
                                <tr>
                                    <td colSpan={2} className="px-6 py-3 text-right text-gray-700 uppercase text-xs">Totais do Relatório:</td>
                                    <td className="px-6 py-3 text-right text-green-700">{formatCurrency(totalRevenues)}</td>
                                    <td className="px-6 py-3 text-right text-red-700">{formatCurrency(totalExpenses)}</td>
                                    <td className={`px-6 py-3 text-right ${netResult >= 0 ? 'text-blue-800' : 'text-red-800'}`}>{formatCurrency(netResult)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center">
                    <AlertTriangle size={48} className="mb-2 opacity-20" />
                    <p>Defina os filtros e clique em "Gerar Relatório".</p>
                </div>
            )}
        </div>
    );
};