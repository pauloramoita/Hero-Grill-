import React, { useState, useEffect } from 'react';
import { getAppData, saveAccountBalance, getPreviousMonthBalance, formatCurrency } from '../../services/storageService';
import { AppData } from '../../types';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const CadastroSaldo: React.FC = () => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [store, setStore] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));

    const [caixaEconomica, setCaixaEconomica] = useState(0);
    const [cofre, setCofre] = useState(0);
    const [loteria, setLoteria] = useState(0);
    const [pagbankH, setPagbankH] = useState(0);
    const [pagbankD, setPagbankD] = useState(0);
    const [investimentos, setInvestimentos] = useState(0);
    const [prevBalance, setPrevBalance] = useState<number | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const d = await getAppData();
            setData(d);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        const fetchPrev = async () => {
            if (store && year && month) {
                const prev = await getPreviousMonthBalance(store, year, month);
                setPrevBalance(prev ? prev.totalBalance : null);
            }
        };
        fetchPrev();
    }, [store, year, month]);

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
        const totalBalance = caixaEconomica + cofre + loteria + pagbankH + pagbankD + investimentos;

        try {
            await saveAccountBalance({
                id: '', store, year, month,
                caixaEconomica, cofre, loteria, pagbankH, pagbankD, investimentos, totalBalance
            });
            alert('Saldo Salvo!');
            setCaixaEconomica(0); setCofre(0); setLoteria(0); setPagbankH(0); setPagbankD(0); setInvestimentos(0);
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader2 className="animate-spin mx-auto"/>;

    const inputClass = "w-full p-3 border rounded text-right font-mono text-lg";

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">Lançamento de Saldos</h2>
            
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

            <div className="grid md:grid-cols-3 gap-6 mb-6">
                {[{l:'Caixa',v:caixaEconomica,s:setCaixaEconomica}, {l:'Cofre',v:cofre,s:setCofre}, {l:'Loteria',v:loteria,s:setLoteria},
                  {l:'PagBank H',v:pagbankH,s:setPagbankH}, {l:'PagBank D',v:pagbankD,s:setPagbankD}, {l:'Investimentos',v:investimentos,s:setInvestimentos}
                ].map((f, i) => (
                    <div key={i}>
                        <label className="font-bold block mb-1">{f.l}</label>
                        <input type="text" value={formatCurrency(f.v)} onChange={(e) => handleCurrencyInput(f.s, e)} className={inputClass} />
                    </div>
                ))}
            </div>
            
            <div className="flex justify-end gap-4 items-center border-t pt-4">
                {submitError && <span className="text-red-600 font-bold">{submitError}</span>}
                <button disabled={saving} type="submit" className="bg-heroBlack text-white px-8 py-3 rounded font-bold flex gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin"/> : <CheckCircle/>} SALVAR
                </button>
            </div>
        </form>
    );
};