import React, { useState, useEffect } from 'react';
import { getAppData, saveFinancialRecord, formatCurrency } from '../../services/storageService';
import { AppData } from '../../types';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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
            // Reset zeros...
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader2 className="animate-spin mx-auto"/>;

    const inputClass = "w-full p-3 border rounded text-right font-mono text-lg";

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-6xl mx-auto">
             <h2 className="text-2xl font-bold mb-6 border-b pb-2">Lançamento Financeiro</h2>
             
             <div className="grid md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded">
                <select value={store} onChange={e => setStore(e.target.value)} className="w-full p-3 border rounded">
                    <option value="">Selecione a Loja</option>
                    {data.stores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full p-3 border rounded text-center"/>
                <select value={month} onChange={e => setMonth(e.target.value)} className="w-full p-3 border rounded text-center">
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-green-50 p-4 rounded">
                    <h3 className="font-bold text-green-800 mb-4">Receitas</h3>
                    <div className="space-y-4">
                        <input type="text" placeholder="Caixa" value={formatCurrency(creditCaixa)} onChange={e => handleCurrencyInput(setCreditCaixa, e)} className={inputClass}/>
                        <input type="text" placeholder="Delta" value={formatCurrency(creditDelta)} onChange={e => handleCurrencyInput(setCreditDelta, e)} className={inputClass}/>
                        <input type="text" placeholder="PagBank H" value={formatCurrency(creditPagBankH)} onChange={e => handleCurrencyInput(setCreditPagBankH, e)} className={inputClass}/>
                        <input type="text" placeholder="PagBank D" value={formatCurrency(creditPagBankD)} onChange={e => handleCurrencyInput(setCreditPagBankD, e)} className={inputClass}/>
                        <input type="text" placeholder="Ifood" value={formatCurrency(creditIfood)} onChange={e => handleCurrencyInput(setCreditIfood, e)} className={inputClass}/>
                    </div>
                </div>
                <div className="bg-red-50 p-4 rounded">
                    <h3 className="font-bold text-red-800 mb-4">Despesas</h3>
                    <div className="space-y-4">
                         <input type="text" placeholder="Caixa" value={formatCurrency(debitCaixa)} onChange={e => handleCurrencyInput(setDebitCaixa, e)} className={inputClass}/>
                         <input type="text" placeholder="PagBank H" value={formatCurrency(debitPagBankH)} onChange={e => handleCurrencyInput(setDebitPagBankH, e)} className={inputClass}/>
                         <input type="text" placeholder="PagBank D" value={formatCurrency(debitPagBankD)} onChange={e => handleCurrencyInput(setDebitPagBankD, e)} className={inputClass}/>
                         <input type="text" placeholder="Loteria" value={formatCurrency(debitLoteria)} onChange={e => handleCurrencyInput(setDebitLoteria, e)} className={inputClass}/>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-col items-end gap-4">
                {submitError && <span className="text-red-600 font-bold">{submitError}</span>}
                <button disabled={saving} type="submit" className="bg-gray-800 text-white px-8 py-3 rounded font-bold flex gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin"/> : <CheckCircle/>} SALVAR
                </button>
            </div>
        </form>
    );
};