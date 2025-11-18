
import React, { useState, useEffect } from 'react';
import { getAccountBalances, getAppData, formatCurrency } from '../../services/storageService';
import { AppData, AccountBalance } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { FileText } from 'lucide-react';

interface BalanceWithVariation extends AccountBalance {
    variation: number;
    monthLabel: string;
}

export const RelatorioSaldo: React.FC = () => {
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    const [filteredData, setFilteredData] = useState<BalanceWithVariation[]>([]);
    
    const [storeFilter, setStoreFilter] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
    const [monthFilter, setMonthFilter] = useState('');

    // Available Years
    const [years, setYears] = useState<string[]>([]);

    useEffect(() => {
        setAppData(getAppData());
        const raw = getAccountBalances();
        const uniqueYears = Array.from(new Set(raw.map(b => b.year.toString()))).sort().reverse();
        setYears(uniqueYears);
    }, []);

    const generateReport = () => {
        const rawBalances = getAccountBalances();
        
        // Sort: Store -> Year -> Month (Crucial for variation)
        rawBalances.sort((a, b) => {
            if (a.store !== b.store) return a.store.localeCompare(b.store);
            if (a.year !== b.year) return a.year - b.year;
            return a.month.localeCompare(b.month);
        });

        const processed: BalanceWithVariation[] = [];
        for (let i = 0; i < rawBalances.length; i++) {
            const current = rawBalances[i];
            let variation = 0;

            if (i > 0 && rawBalances[i-1].store === current.store) {
                variation = current.totalBalance - rawBalances[i-1].totalBalance;
            }

            processed.push({ 
                ...current, 
                variation,
                monthLabel: `${current.month}/${current.year}`
            });
        }

        // Apply Filters AFTER calculation (so previous month logic still worked for the calc)
        const result = processed.filter(b => {
            return (storeFilter === '' || b.store === storeFilter) &&
                   (yearFilter === '' || b.year.toString() === yearFilter) &&
                   (monthFilter === '' || b.month === monthFilter);
        });

        setFilteredData(result);
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

    return (
        <div className="space-y-8">
            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                             <option value="">Selecione o Ano</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Mês</label>
                        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-full border p-2 rounded">
                            <option value="">Todos os Meses</option>
                            {Array.from({length: 12}, (_, i) => {
                                const m = String(i + 1).padStart(2, '0');
                                return <option key={m} value={m}>{m}</option>;
                            })}
                        </select>
                    </div>
                </div>
                <button onClick={generateReport} className="bg-heroBlack text-white px-8 py-3 rounded font-bold hover:bg-gray-800 flex items-center gap-2 w-full md:w-auto justify-center">
                    <FileText size={20} /> Gerar Relatório
                </button>
            </div>

            {/* Results & Chart */}
            {filteredData.length > 0 ? (
                <div className="space-y-8 animate-fadeIn">
                    
                    {/* Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        <div className="p-4 bg-gray-50 border-b font-bold text-gray-700">Histórico de Variação</div>
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
                                    <tr key={idx}>
                                        <td className="px-6 py-2 text-sm font-medium">{item.monthLabel}</td>
                                        <td className="px-6 py-2 text-sm text-gray-600">{item.store}</td>
                                        <td className="px-6 py-2 text-sm text-right font-mono">{formatCurrency(item.totalBalance)}</td>
                                        <td className={`px-6 py-2 text-sm text-right font-bold ${item.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(item.variation)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Chart */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-96">
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
                                        <cell key={`cell-${index}`} fill={entry.variation >= 0 ? '#10B981' : '#EF4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-center text-xs text-gray-400 mt-4">
                            *Barras Verdes representam aumento de saldo em relação ao mês anterior. Barras Vermelhas representam diminuição.
                        </p>
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