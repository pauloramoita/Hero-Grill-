import React, { useState, useEffect } from 'react';
import { getAccountBalances, getAppData, formatCurrency, exportBalancesToXML } from '../../services/storageService';
import { AppData, AccountBalance } from '../../types';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { FileText, FileSpreadsheet, Printer, Loader2 } from 'lucide-react';

interface BalanceWithVariation extends AccountBalance {
    variation: number;
    monthLabel: string;
}

export const RelatorioSaldo: React.FC = () => {
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [filteredData, setFilteredData] = useState<BalanceWithVariation[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [storeFilter, setStoreFilter] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
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
            const raw = await getAccountBalances();
            const uniqueYears = Array.from(new Set(raw.map(b => b.year.toString()))).sort().reverse();
            setYears(uniqueYears);
            setLoading(false);
        };
        load();
    }, []);

    const generateReport = async () => {
        setLoading(true);
        const rawBalances = await getAccountBalances();
        let processed: BalanceWithVariation[] = [];

        if (storeFilter === '') {
            const grouped: Record<string, AccountBalance> = {};

            rawBalances.forEach(b => {
                const key = `${b.year}-${b.month}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        ...b,
                        id: `agg-${key}`,
                        store: 'Todas as Lojas (Consolidado)',
                        totalBalance: 0,
                        caixaEconomica: 0, cofre: 0, loteria: 0, pagbankH: 0, pagbankD: 0, investimentos: 0,
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
                
                const mName = monthNames.find(m => m.value === current.month)?.label || current.month;

                processed.push({ 
                    ...current, 
                    variation,
                    monthLabel: `${mName.substring(0,3)}/${current.year}`
                });
            }

        } else {
            rawBalances.sort((a, b) => {
                if (a.store !== b.store) return a.store.localeCompare(b.store);
                if (a.year !== b.year) return a.year - b.year;
                return a.month.localeCompare(b.month);
            });

            for (let i = 0; i < rawBalances.length; i++) {
                const current = rawBalances[i];
                let variation = 0;

                if (i > 0 && rawBalances[i-1].store === current.store) {
                    variation = current.totalBalance - rawBalances[i-1].totalBalance;
                }
                
                const mName = monthNames.find(m => m.value === current.month)?.label || current.month;

                processed.push({ 
                    ...current, 
                    variation,
                    monthLabel: `${mName.substring(0,3)}/${current.year}`
                });
            }
        }

        const result = processed.filter(b => {
            return (storeFilter === '' || b.store === storeFilter) &&
                   (yearFilter === '' || b.year.toString() === yearFilter) &&
                   (monthFilter === '' || b.month === monthFilter);
        });

        setFilteredData(result);
        setLoading(false);
    };

    const handleExport = () => {
        if (filteredData.length === 0) {
            alert('Gere o relatório antes de exportar.');
            return;
        }
        exportBalancesToXML(filteredData, 'relatorio_evolucao_saldo');
    };

    const handlePrint = () => {
        window.print();
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const val = payload[0].value;
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded">
                    <p className="text-sm font-bold">{label}</p>
                    <p className={`text-sm font-bold ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Variação: {formatCurrency(val)}
                    </p>
                </div>
            );
        }
        return null;
    };

    const totalVariation = filteredData.reduce((acc, curr) => acc + curr.variation, 0);

    if (loading && filteredData.length === 0) return <div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div>;

    return (
        <div className="space-y-8">
            {/* Filters - Match Relatorio043 */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 no-print">
                <h3 className="text-lg font-bold text-heroRed mb-4 border-b pb-2">Parâmetros do Relatório</h3>
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
                    <button onClick={generateReport} className="bg-heroBlack text-white px-8 py-3 rounded font-bold hover:bg-gray-800 flex items-center gap-2">
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

            {/* Results & Chart */}
            {filteredData.length > 0 ? (
                <div className="space-y-8 animate-fadeIn">
                    
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        <div className="p-4 bg-gray-50 border-b font-bold text-gray-700">Histórico de Variação {storeFilter ? ` - ${storeFilter}` : ' (Consolidado)'}</div>
                         <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Período</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Loja</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Saldo Final</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total (Variação)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredData.map((item, idx) => (
                                    <tr key={idx} className="break-inside-avoid">
                                        <td className="px-6 py-2 text-sm font-medium capitalize">{item.monthLabel}</td>
                                        <td className="px-6 py-2 text-sm text-gray-600">{item.store}</td>
                                        <td className={`px-6 py-2 text-sm text-right font-mono ${item.totalBalance < 0 ? 'text-red-800 font-bold' : ''}`}>{formatCurrency(item.totalBalance)}</td>
                                        <td className={`px-6 py-2 text-sm text-right font-bold ${item.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(item.variation)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-96 break-inside-avoid">
                        <h3 className="text-lg font-bold text-heroBlack mb-6 text-center uppercase tracking-wider">
                            Evolução do Total (Lucro/Prejuízo)
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                                <XAxis dataKey="monthLabel" />
                                <YAxis tickFormatter={(val) => `R$ ${val}`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <ReferenceLine y={0} stroke="#000" />
                                <Bar dataKey="variation" name="Variação Mensal (Total)" fill="#8884d8">
                                    {filteredData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.variation >= 0 ? '#10B981' : '#EF4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                     {/* Final Summary Box */}
                     <div className="flex justify-end">
                        <div className={`p-6 rounded-lg shadow-lg border w-full md:w-1/3 text-center ${totalVariation >= 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-red-600 border-red-700 text-white'}`}>
                            <h4 className="text-sm font-bold uppercase opacity-90 mb-2">Variação Acumulada no Período</h4>
                            <span className="text-4xl font-black tracking-tight">{formatCurrency(totalVariation)}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <p>Nenhum dado disponível para o período selecionado.</p>
                </div>
            )}
        </div>
    );
};