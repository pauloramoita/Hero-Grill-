
import React, { useState, useEffect, useMemo } from 'react';
import { getAppData, saveAccountBalance, getPreviousMonthBalance, formatCurrency } from '../../services/storageService';
import { AppData, User } from '../../types';
import { CheckCircle, Loader2, Calendar, Building2, Wallet, Landmark, ArrowRight } from 'lucide-react';

interface CadastroSaldoProps {
    user: User;
}

export const CadastroSaldo: React.FC<CadastroSaldoProps> = ({ user }) => {
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
        const totalBalance = caixaEconomica + cofre + loteria + pagbankH + pagbankD + investimentos;

        try {
            await saveAccountBalance({
                id: '', store, year, month,
                caixaEconomica, cofre, loteria, pagbankH, pagbankD, investimentos, totalBalance
            });
            alert('Saldos atualizados com sucesso!');
            // Optional: Reset or keep values. Keeping allows for corrections.
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const totalCalculated = caixaEconomica + cofre + loteria + pagbankH + pagbankD + investimentos;

    if (loading) return <Loader2 className="animate-spin mx-auto text-cyan-600" size={40}/>;

    const InputGroup = ({ label, value, setter, icon: Icon, colorClass = 'text-slate-600' }: any) => (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:border-cyan-500 focus-within:shadow-input-focus transition-all">
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg bg-white shadow-sm ${colorClass}`}>
                    <Icon size={16} />
                </div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
            </div>
            <input 
                type="text" 
                value={formatCurrency(value)} 
                onChange={(e) => handleCurrencyInput(setter, e)} 
                className="w-full bg-transparent border-none outline-none text-right font-black text-xl text-slate-800 placeholder-slate-300 p-0"
                placeholder="R$ 0,00"
            />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto animate-fadeIn pb-24">
            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-floating border border-slate-100 p-8 md:p-10 relative">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Lançamento de Saldos</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Fechamento Mensal Consolidado</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <div className="relative group">
                            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                            <select 
                                value={store} 
                                onChange={e => setStore(e.target.value)} 
                                className={`pl-9 pr-8 py-3 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-700 focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer shadow-sm ${availableStores.length === 1 ? 'opacity-70' : ''}`}
                                disabled={availableStores.length === 1}
                            >
                                <option value="">Selecione a Loja...</option>
                                {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 shadow-sm">
                            <input 
                                type="number" 
                                value={year} 
                                onChange={e => setYear(parseInt(e.target.value))} 
                                className="w-16 py-3 text-center font-bold text-sm text-slate-700 outline-none bg-transparent"
                            />
                            <span className="text-slate-300">/</span>
                            <select 
                                value={month} 
                                onChange={e => setMonth(e.target.value)} 
                                className="py-3 pl-1 pr-6 font-bold text-sm text-slate-700 outline-none bg-transparent cursor-pointer appearance-none"
                            >
                                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Physical Cash Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Wallet size={18} className="text-emerald-500"/> Dinheiro Físico
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <InputGroup label="Caixa Econômica" value={caixaEconomica} setter={setCaixaEconomica} icon={Wallet} colorClass="text-emerald-600" />
                            <InputGroup label="Cofre Loja" value={cofre} setter={setCofre} icon={Wallet} colorClass="text-emerald-600" />
                            <InputGroup label="Loteria" value={loteria} setter={setLoteria} icon={Wallet} colorClass="text-emerald-600" />
                        </div>
                    </div>

                    {/* Digital/Bank Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Landmark size={18} className="text-blue-500"/> Contas Digitais & Bancos
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <InputGroup label="PagBank (H)" value={pagbankH} setter={setPagbankH} icon={Landmark} colorClass="text-blue-600" />
                            <InputGroup label="PagBank (D)" value={pagbankD} setter={setPagbankD} icon={Landmark} colorClass="text-blue-600" />
                            <InputGroup label="Investimentos" value={investimentos} setter={setInvestimentos} icon={Landmark} colorClass="text-purple-600" />
                        </div>
                    </div>
                </div>
                
                {/* Footer Total Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-100 gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Consolidado</span>
                        <span className="text-4xl font-black text-slate-800 tracking-tight">{formatCurrency(totalCalculated)}</span>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {submitError && <span className="text-red-600 text-xs font-bold">{submitError}</span>}
                        <button 
                            disabled={saving} 
                            type="submit" 
                            className="flex-1 md:flex-none bg-cyan-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-cyan-200 hover:bg-cyan-700 hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
                        >
                            {saving ? <Loader2 className="animate-spin"/> : <CheckCircle size={20}/>} 
                            SALVAR FECHAMENTO
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};
