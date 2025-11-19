
import React, { useState, useEffect } from 'react';
import { getAppData, saveFinancialRecord, formatCurrency } from '../../services/storageService';
import { AppData } from '../../types';
import { CheckCircle, AlertCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export const CadastroFinanceiro: React.FC = () => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    
    // Identification
    const [store, setStore] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));

    // Créditos (Receitas)
    const [creditCaixa, setCreditCaixa] = useState(0);
    const [creditDelta, setCreditDelta] = useState(0);
    const [creditPagBankH, setCreditPagBankH] = useState(0);
    const [creditPagBankD, setCreditPagBankD] = useState(0);
    const [creditIfood, setCreditIfood] = useState(0);

    // Débitos (Despesas)
    const [debitCaixa, setDebitCaixa] = useState(0);
    const [debitPagBankH, setDebitPagBankH] = useState(0);
    const [debitPagBankD, setDebitPagBankD] = useState(0);
    const [debitLoteria, setDebitLoteria] = useState(0);

    const [submitError, setSubmitError] = useState<string | null>(null);

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
        setData(getAppData());
    }, []);

    const handleCurrencyInput = (setter: React.Dispatch<React.SetStateAction<number>>, e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const isNegative = rawValue.includes('-');
        const cleanValue = rawValue.replace(/\D/g, '');
        let floatValue = cleanValue ? parseInt(cleanValue, 10) / 100 : 0;
        if (isNegative) floatValue = floatValue * -1;
        setter(floatValue);
    };

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    // Calculations
    const totalRevenues = creditCaixa + creditDelta + creditPagBankH + creditPagBankD + creditIfood;
    const totalExpenses = debitCaixa + debitPagBankH + debitPagBankD + debitLoteria;
    const netResult = totalRevenues - totalExpenses;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        if (!store) {
            setSubmitError('Selecione uma loja.');
            return;
        }

        try {
            saveFinancialRecord({
                id: generateId(),
                store,
                year,
                month,
                creditCaixa,
                creditDelta,
                creditPagBankH,
                creditPagBankD,
                creditIfood,
                totalRevenues,
                debitCaixa,
                debitPagBankH,
                debitPagBankD,
                debitLoteria,
                totalExpenses,
                netResult
            });

            alert('Registro financeiro salvo com sucesso!');
            
            // Reset values
            setCreditCaixa(0); setCreditDelta(0); setCreditPagBankH(0); setCreditPagBankD(0); setCreditIfood(0);
            setDebitCaixa(0); setDebitPagBankH(0); setDebitPagBankD(0); setDebitLoteria(0);
        } catch (err: any) {
            setSubmitError(err.message);
        }
    };

    const inputClass = "w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 outline-none font-mono text-right text-lg";

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 max-w-6xl mx-auto animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-gray-800 pb-2">
                Lançamento Financeiro (Vendas/Despesas)
            </h2>

            {/* Identification Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Loja</label>
                    <select 
                        value={store} 
                        onChange={(e) => setStore(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-gray-800 outline-none"
                    >
                        <option value="">Selecione...</option>
                        {data.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Ano</label>
                    <input 
                        type="number" 
                        value={year} 
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-gray-800 outline-none text-center font-medium"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Mês</label>
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-gray-800 outline-none text-center font-medium"
                    >
                        {monthNames.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* CRÉDITOS */}
                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 mb-6 border-b border-green-200 pb-2">
                        <ArrowUpCircle className="text-green-600" size={24} />
                        <h3 className="text-xl font-bold text-green-800">Receitas (Créditos)</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-green-800 mb-1">Caixa Econômica</label>
                            <input type="text" value={formatCurrency(creditCaixa)} onChange={(e) => handleCurrencyInput(setCreditCaixa, e)} className={`${inputClass} focus:ring-green-500 text-green-700`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-green-800 mb-1">Delta</label>
                            <input type="text" value={formatCurrency(creditDelta)} onChange={(e) => handleCurrencyInput(setCreditDelta, e)} className={`${inputClass} focus:ring-green-500 text-green-700`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-green-800 mb-1">PagBank H</label>
                            <input type="text" value={formatCurrency(creditPagBankH)} onChange={(e) => handleCurrencyInput(setCreditPagBankH, e)} className={`${inputClass} focus:ring-green-500 text-green-700`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-green-800 mb-1">PagBank D</label>
                            <input type="text" value={formatCurrency(creditPagBankD)} onChange={(e) => handleCurrencyInput(setCreditPagBankD, e)} className={`${inputClass} focus:ring-green-500 text-green-700`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-green-800 mb-1">Ifood</label>
                            <input type="text" value={formatCurrency(creditIfood)} onChange={(e) => handleCurrencyInput(setCreditIfood, e)} className={`${inputClass} focus:ring-green-500 text-green-700`} />
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-green-200 text-right">
                        <span className="block text-xs font-bold text-green-600 uppercase">Total Receitas</span>
                        <span className="text-2xl font-black text-green-800">{formatCurrency(totalRevenues)}</span>
                    </div>
                </div>

                {/* DÉBITOS */}
                <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                     <div className="flex items-center gap-2 mb-6 border-b border-red-200 pb-2">
                        <ArrowDownCircle className="text-red-600" size={24} />
                        <h3 className="text-xl font-bold text-red-800">Despesas (Débitos)</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-red-800 mb-1">Caixa Econômica</label>
                            <input type="text" value={formatCurrency(debitCaixa)} onChange={(e) => handleCurrencyInput(setDebitCaixa, e)} className={`${inputClass} focus:ring-red-500 text-red-700`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-red-800 mb-1">PagBank H</label>
                            <input type="text" value={formatCurrency(debitPagBankH)} onChange={(e) => handleCurrencyInput(setDebitPagBankH, e)} className={`${inputClass} focus:ring-red-500 text-red-700`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-red-800 mb-1">PagBank D</label>
                            <input type="text" value={formatCurrency(debitPagBankD)} onChange={(e) => handleCurrencyInput(setDebitPagBankD, e)} className={`${inputClass} focus:ring-red-500 text-red-700`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-red-800 mb-1">Loteria</label>
                            <input type="text" value={formatCurrency(debitLoteria)} onChange={(e) => handleCurrencyInput(setDebitLoteria, e)} className={`${inputClass} focus:ring-red-500 text-red-700`} />
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-red-200 text-right">
                        <span className="block text-xs font-bold text-red-600 uppercase">Total Despesas</span>
                        <span className="text-2xl font-black text-red-800">{formatCurrency(totalExpenses)}</span>
                    </div>
                </div>
            </div>

            {/* Final Result */}
            <div className={`mt-8 p-6 rounded-xl border-2 flex justify-between items-center ${netResult >= 0 ? 'bg-gray-800 border-gray-700 text-white' : 'bg-red-800 border-red-900 text-white'}`}>
                <div>
                    <h3 className="text-lg font-bold uppercase tracking-wider">Resultado do Mês</h3>
                    <p className="text-sm opacity-70">(Receitas - Despesas)</p>
                </div>
                <div className="text-4xl font-black">
                    {formatCurrency(netResult)}
                </div>
            </div>

            {/* Submit Area */}
            <div className="mt-8 flex flex-col items-end gap-4">
                {submitError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                        <AlertCircle size={16} /> {submitError}
                    </div>
                )}
                
                <button 
                    type="submit" 
                    className="bg-gray-800 text-white font-bold py-4 px-12 rounded-lg shadow-md hover:bg-black hover:shadow-lg transform hover:-translate-y-1 transition-all flex items-center gap-3 text-lg"
                >
                    <CheckCircle size={24} />
                    SALVAR LANÇAMENTO
                </button>
            </div>
        </form>
    );
};