
import React, { useState, useEffect } from 'react';
import { getAppData, saveAccountBalance, getPreviousMonthBalance, formatCurrency } from '../../services/storageService';
import { AppData } from '../../types';
import { CheckCircle, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const CadastroSaldo: React.FC = () => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    
    // Identification
    const [store, setStore] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));

    // Account Values
    const [caixaEconomica, setCaixaEconomica] = useState(0);
    const [cofre, setCofre] = useState(0);
    const [loteria, setLoteria] = useState(0);
    const [pagbankH, setPagbankH] = useState(0);
    const [pagbankD, setPagbankD] = useState(0);
    const [investimentos, setInvestimentos] = useState(0);

    // Comparison Logic
    const [prevBalance, setPrevBalance] = useState<number | null>(null);

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

    // Look up previous balance when store/date changes
    useEffect(() => {
        if (store && year && month) {
            const prevRecord = getPreviousMonthBalance(store, year, month);
            if (prevRecord) {
                setPrevBalance(prevRecord.totalBalance);
            } else {
                setPrevBalance(null);
            }
        } else {
            setPrevBalance(null);
        }
    }, [store, year, month]);

    const handleCurrencyInput = (setter: React.Dispatch<React.SetStateAction<number>>, e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        // Check if the input contains a minus sign to handle negatives
        const isNegative = rawValue.includes('-');
        
        // Remove all non-digit characters
        const cleanValue = rawValue.replace(/\D/g, '');
        
        // Convert to float
        let floatValue = cleanValue ? parseInt(cleanValue, 10) / 100 : 0;
        
        // Apply negative sign if detected
        if (isNegative) {
            floatValue = floatValue * -1;
        }
        
        setter(floatValue);
    };

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    // Calculations
    const currentTotal = caixaEconomica + cofre + loteria + pagbankH + pagbankD + investimentos;
    const variation = prevBalance !== null ? currentTotal - prevBalance : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        if (!store) {
            setSubmitError('Selecione uma loja.');
            return;
        }

        try {
            saveAccountBalance({
                id: generateId(),
                store,
                year,
                month,
                caixaEconomica,
                cofre,
                loteria,
                pagbankH,
                pagbankD,
                investimentos,
                totalBalance: currentTotal
            });

            alert('Saldo cadastrado com sucesso!');
            
            // Reset values
            setCaixaEconomica(0);
            setCofre(0);
            setLoteria(0);
            setPagbankH(0);
            setPagbankD(0);
            setInvestimentos(0);
        } catch (err: any) {
            setSubmitError(err.message);
        }
    };

    const inputClass = "w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-heroBlack outline-none font-mono text-right text-lg text-gray-700";

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 max-w-5xl mx-auto animate-fadeIn">
            <h2 className="text-2xl font-bold text-heroBlack mb-6 border-b-2 border-heroBlack pb-2">
                Lançamento de Saldos
            </h2>

            {/* Identification Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Loja</label>
                    <select 
                        value={store} 
                        onChange={(e) => setStore(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-heroBlack outline-none"
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
                        className="w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-heroBlack outline-none text-center font-medium"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Mês</label>
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-heroBlack outline-none text-center font-medium"
                    >
                        {monthNames.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Inputs Section */}
            <h3 className="text-lg font-bold text-gray-600 mb-4 border-b pb-1">Valores por Conta (R$)</h3>
            <p className="text-xs text-gray-400 mb-4 italic">* Para valores negativos, digite o sinal de menos (-).</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Caixa Econômica</label>
                    <input type="text" value={formatCurrency(caixaEconomica)} onChange={(e) => handleCurrencyInput(setCaixaEconomica, e)} className={`${inputClass} ${caixaEconomica < 0 ? 'text-red-600' : ''}`} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Cofre</label>
                    <input type="text" value={formatCurrency(cofre)} onChange={(e) => handleCurrencyInput(setCofre, e)} className={`${inputClass} ${cofre < 0 ? 'text-red-600' : ''}`} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Loteria</label>
                    <input type="text" value={formatCurrency(loteria)} onChange={(e) => handleCurrencyInput(setLoteria, e)} className={`${inputClass} ${loteria < 0 ? 'text-red-600' : ''}`} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">PagBank H</label>
                    <input type="text" value={formatCurrency(pagbankH)} onChange={(e) => handleCurrencyInput(setPagbankH, e)} className={`${inputClass} ${pagbankH < 0 ? 'text-red-600' : ''}`} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">PagBank D</label>
                    <input type="text" value={formatCurrency(pagbankD)} onChange={(e) => handleCurrencyInput(setPagbankD, e)} className={`${inputClass} ${pagbankD < 0 ? 'text-red-600' : ''}`} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Investimentos</label>
                    <input type="text" value={formatCurrency(investimentos)} onChange={(e) => handleCurrencyInput(setInvestimentos, e)} className={`${inputClass} ${investimentos < 0 ? 'text-red-600' : ''}`} />
                </div>
            </div>

            {/* Totals and Prediction */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
                <div className="p-4 bg-gray-100 rounded-lg">
                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Saldo do Mês Passado</span>
                    <div className="text-xl font-bold text-gray-700">
                        {prevBalance !== null ? formatCurrency(prevBalance) : <span className="text-sm italic font-normal">Não encontrado</span>}
                    </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="text-xs font-bold text-blue-600 uppercase block mb-1">Saldo Deste Mês (Soma)</span>
                    <div className={`text-2xl font-black ${currentTotal < 0 ? 'text-red-800' : 'text-blue-800'}`}>
                        {formatCurrency(currentTotal)}
                    </div>
                </div>

                <div className={`p-4 rounded-lg border ${variation >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <span className={`text-xs font-bold uppercase block mb-1 ${variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Total (Variação / Lucro)
                    </span>
                    <div className={`text-2xl font-black flex items-center gap-2 ${variation >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {prevBalance === null ? (
                            <span className="text-sm text-gray-400 font-normal">Requer mês anterior</span>
                        ) : (
                            <>
                                {variation > 0 ? <TrendingUp size={24}/> : variation < 0 ? <TrendingDown size={24}/> : <Minus size={24}/>}
                                {formatCurrency(variation)}
                            </>
                        )}
                    </div>
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
                    className="bg-heroBlack text-white font-bold py-4 px-12 rounded-lg shadow-md hover:bg-gray-800 hover:shadow-lg transform hover:-translate-y-1 transition-all flex items-center gap-3 text-lg"
                >
                    <CheckCircle size={24} />
                    SALVAR SALDOS
                </button>
            </div>
        </form>
    );
};
