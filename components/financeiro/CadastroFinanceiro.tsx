import React, { useState, useEffect } from 'react';
import { getAppData, saveFinancialRecord, formatCurrency } from '../../services/storageService';
import { AppData } from '../../types';
import { CheckCircle, Loader2 } from 'lucide-react';

export const CadastroFinanceiro: React.FC = () => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [store, setStore] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));

    const [creditCaixa, setCreditCaixa] = useState(0);
    const [creditDelta, setCreditDelta] = useState(0);
    const [creditPagBankH, setCreditPagBankH] = useState(0);
    const [creditPagBankD, setCreditPagBankD] = useState(0);
    const [creditIfood, setCreditIfood] = useState(0);
    
    const [debitCaixa, setDebitCaixa] = useState(0);
    const [debitPagBankH, setDebitPagBankH] = useState(0);
    const [debitPagBankD, setDebitPagBankD] = useState(0);
    const [debitLoteria, setDebitLoteria] = useState(0);

    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const d = await getAppData();
            setData(d);
            setLoading(false);
        };
        load();
    }, []);

    const handleCurrencyInput = (setter: any, e: any) => {
        let raw = e.target.value.replace(/\D/g, '');
        let val = raw ? parseInt(raw, 10) / 100 : 0;
        if (e.target.value.includes('-')) val *= -1;
        setter(val);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!store) return;
        setSaving(true);
        setSubmitError(null);
        
        const totalRevenues = creditCaixa + creditDelta + creditPagBankH + creditPagBankD + creditIfood;
        const totalExpenses = debitCaixa + debitPagBankH + debitPagBankD + debitLoteria;

        try {
            await saveFinancialRecord({
                id: '', store, year, month,
                creditCaixa, creditDelta, creditPagBankH, creditPagBankD, creditIfood, totalRevenues,
                debitCaixa, debitPagBankH, debitPagBankD, debitLoteria, totalExpenses,
                netResult: totalRevenues - totalExpenses
            });
            alert('Lançamento Financeiro Salvo!');
            // Reset fields to zero if desired, or keep for reference. Here keeping for easy adjustment.
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader2 className="animate-spin mx-auto"/>;

    const inputClass = "w-full p-3 border rounded text-right font-mono text-lg text-gray-700 focus:ring-2 outline-none";

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-6xl mx-auto animate-fadeIn">
             <h2 className="text-2xl font-bold mb-6 border-b pb-2">Lançamento Financeiro</h2>
             
             <div className="grid md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded border border-gray-200">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Selecione a Loja</label>
                    <select value={store} onChange={e => setStore(e.target.value)} className="w-full p-3 border rounded font-bold">
                        <option value="">Selecione...</option>
                        {data.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Ano</label>
                    <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full p-3 border rounded text-center font-bold"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Mês</label>
                    <select value={month} onChange={e => setMonth(e.target.value)} className="w-full p-3 border rounded text-center font-bold">
                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Receitas */}
                <div className="bg-green-50 p-6 rounded border border-green-100">
                    <h3 className="font-black text-green-800 mb-6 text-xl flex items-center gap-2 border-b border-green-200 pb-2">RECEITAS (Entradas)</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-green-700 mb-1">Caixa</label>
                            <input type="text" value={formatCurrency(creditCaixa)} onChange={e => handleCurrencyInput(setCreditCaixa, e)} className={`${inputClass} border-green-200 focus:ring-green-500`}/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-green-700 mb-1">Delta</label>
                            <input type="text" value={formatCurrency(creditDelta)} onChange={e => handleCurrencyInput(setCreditDelta, e)} className={`${inputClass} border-green-200 focus:ring-green-500`}/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-green-700 mb-1">PagBank H</label>
                            <input type="text" value={formatCurrency(creditPagBankH)} onChange={e => handleCurrencyInput(setCreditPagBankH, e)} className={`${inputClass} border-green-200 focus:ring-green-500`}/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-green-700 mb-1">PagBank D</label>
                            <input type="text" value={formatCurrency(creditPagBankD)} onChange={e => handleCurrencyInput(setCreditPagBankD, e)} className={`${inputClass} border-green-200 focus:ring-green-500`}/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-green-700 mb-1">Ifood</label>
                            <input type="text" value={formatCurrency(creditIfood)} onChange={e => handleCurrencyInput(setCreditIfood, e)} className={`${inputClass} border-green-200 focus:ring-green-500`}/>
                        </div>
                    </div>
                </div>

                {/* Despesas */}
                <div className="bg-red-50 p-6 rounded border border-red-100">
                    <h3 className="font-black text-red-800 mb-6 text-xl flex items-center gap-2 border-b border-red-200 pb-2">DESPESAS (Saídas)</h3>
                    <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-bold text-red-700 mb-1">Caixa</label>
                            <input type="text" value={formatCurrency(debitCaixa)} onChange={e => handleCurrencyInput(setDebitCaixa, e)} className={`${inputClass} border-red-200 focus:ring-red-500`}/>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-red-700 mb-1">PagBank H</label>
                            <input type="text" value={formatCurrency(debitPagBankH)} onChange={e => handleCurrencyInput(setDebitPagBankH, e)} className={`${inputClass} border-red-200 focus:ring-red-500`}/>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-red-700 mb-1">PagBank D</label>
                            <input type="text" value={formatCurrency(debitPagBankD)} onChange={e => handleCurrencyInput(setDebitPagBankD, e)} className={`${inputClass} border-red-200 focus:ring-red-500`}/>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-red-700 mb-1">Loteria</label>
                            <input type="text" value={formatCurrency(debitLoteria)} onChange={e => handleCurrencyInput(setDebitLoteria, e)} className={`${inputClass} border-red-200 focus:ring-red-500`}/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-col items-end gap-4 pt-6 border-t">
                {submitError && <span className="text-red-600 font-bold bg-red-100 px-4 py-2 rounded border border-red-200">{submitError}</span>}
                <button disabled={saving} type="submit" className="bg-heroBlack text-white px-12 py-4 rounded shadow-lg font-bold flex items-center gap-3 disabled:opacity-50 hover:bg-gray-800 transition-colors text-lg">
                    {saving ? <Loader2 className="animate-spin"/> : <CheckCircle size={24}/>} SALVAR LANÇAMENTO
                </button>
            </div>
        </form>
    );
};