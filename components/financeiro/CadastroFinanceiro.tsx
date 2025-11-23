
import React, { useState, useEffect, useMemo } from 'react';
import { getAppData, saveFinancialRecord, formatCurrency } from '../../services/storageService';
import { AppData, User } from '../../types';
import { CheckCircle, Loader2, ArrowUpCircle, ArrowDownCircle, Building2, Calendar } from 'lucide-react';

interface CadastroFinanceiroProps {
    user: User;
}

export const CadastroFinanceiro: React.FC<CadastroFinanceiroProps> = ({ user }) => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
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

    const availableStores = useMemo(() => {
        if (user.isMaster) return data.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return data.stores.filter(s => user.permissions.stores.includes(s));
        }
        return data.stores;
    }, [data.stores, user]);

    useEffect(() => {
        if (availableStores.length === 1) {
            setStore(availableStores[0]);
        }
    }, [availableStores]);

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
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const totalRevenues = creditCaixa + creditDelta + creditPagBankH + creditPagBankD + creditIfood;
    const totalExpenses = debitCaixa + debitPagBankH + debitPagBankD + debitLoteria;
    const netResult = totalRevenues - totalExpenses;

    if (loading) return <Loader2 className="animate-spin mx-auto" />;

    const LedgerInput = ({ label, value, setter }: any) => (
        <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0 group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide group-hover:text-slate-800 transition-colors">{label}</label>
            <input 
                type="text" 
                value={formatCurrency(value)} 
                onChange={e => handleCurrencyInput(setter, e)} 
                className="w-32 text-right bg-transparent font-mono font-bold text-slate-800 focus:bg-slate-50 focus:ring-2 focus:ring-slate-200 rounded p-1 outline-none transition-all"
            />
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto animate-fadeIn pb-24">
             {/* Header & Context */}
             <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Financeiro <span className="text-slate-400 font-bold text-sm">(Legado)</span></h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registro Manual de Caixa</p>
                </div>
                
                <div className="flex gap-4">
                    <div className="relative">
                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <select 
                            value={store} 
                            onChange={e => setStore(e.target.value)} 
                            className={`pl-10 pr-8 py-3 rounded-xl bg-slate-50 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 appearance-none cursor-pointer ${availableStores.length === 1 ? 'opacity-70 cursor-not-allowed' : ''}`}
                            disabled={availableStores.length === 1}
                        >
                            <option value="">Selecione a Loja...</option>
                            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-xl border border-slate-100">
                        <Calendar size={16} className="text-slate-400"/>
                        <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-12 bg-transparent font-bold text-sm text-slate-700 outline-none text-center"/>
                        <span className="text-slate-300">/</span>
                        <select value={month} onChange={e => setMonth(e.target.value)} className="bg-transparent font-bold text-sm text-slate-700 outline-none cursor-pointer">
                            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Receitas Card */}
                <div className="bg-white rounded-[2rem] shadow-card border border-slate-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <ArrowUpCircle className="text-emerald-500" size={20} /> Receitas
                            </h3>
                            <span className="bg-emerald-50 text-emerald-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">Entradas</span>
                        </div>
                        
                        <div className="space-y-1">
                            <LedgerInput label="Caixa" value={creditCaixa} setter={setCreditCaixa} />
                            <LedgerInput label="Delta" value={creditDelta} setter={setCreditDelta} />
                            <LedgerInput label="PagBank (H)" value={creditPagBankH} setter={setCreditPagBankH} />
                            <LedgerInput label="PagBank (D)" value={creditPagBankD} setter={setCreditPagBankD} />
                            <LedgerInput label="Ifood" value={creditIfood} setter={setCreditIfood} />
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-end">
                            <span className="text-xs font-bold text-slate-400 uppercase">Total Receitas</span>
                            <span className="text-2xl font-black text-emerald-600">{formatCurrency(totalRevenues)}</span>
                        </div>
                    </div>
                </div>

                {/* Despesas Card */}
                <div className="bg-white rounded-[2rem] shadow-card border border-slate-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <ArrowDownCircle className="text-red-500" size={20} /> Despesas
                            </h3>
                            <span className="bg-red-50 text-red-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">Saídas</span>
                        </div>
                        
                        <div className="space-y-1">
                            <LedgerInput label="Caixa" value={debitCaixa} setter={setDebitCaixa} />
                            <LedgerInput label="PagBank (H)" value={debitPagBankH} setter={setDebitPagBankH} />
                            <LedgerInput label="PagBank (D)" value={debitPagBankD} setter={setDebitPagBankD} />
                            <LedgerInput label="Loteria" value={debitLoteria} setter={setDebitLoteria} />
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-end">
                            <span className="text-xs font-bold text-slate-400 uppercase">Total Despesas</span>
                            <span className="text-2xl font-black text-red-600">{formatCurrency(totalExpenses)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Net Result Bar */}
            <div className={`mt-8 rounded-3xl p-6 flex justify-between items-center shadow-lg transition-colors ${netResult >= 0 ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Resultado Líquido</span>
                    <span className="text-4xl font-black tracking-tighter">{formatCurrency(netResult)}</span>
                </div>
                <div className="flex items-center gap-4">
                    {submitError && <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded text-white">{submitError}</span>}
                    <button disabled={saving} type="submit" className="bg-white text-black px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-lg disabled:opacity-70">
                        {saving ? <Loader2 className="animate-spin"/> : <span className="flex items-center gap-2"><CheckCircle size={16}/> Salvar</span>}
                    </button>
                </div>
            </div>
        </form>
    );
};
