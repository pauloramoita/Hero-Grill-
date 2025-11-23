
import React, { useState, useEffect, useMemo } from 'react';
import { getAppData, saveLoanTransaction, formatCurrency, getTodayLocalISO } from '../../services/storageService';
import { AppData, User } from '../../types';
import { CheckCircle, Loader2, Landmark, ArrowUpCircle, ArrowDownCircle, Calendar, FileText } from 'lucide-react';

interface CadastroEmprestimosProps {
    user: User;
}

export const CadastroEmprestimos: React.FC<CadastroEmprestimosProps> = ({ user }) => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [date, setDate] = useState(getTodayLocalISO());
    const [store, setStore] = useState('');
    const [type, setType] = useState<'DEBIT' | 'CREDIT'>('CREDIT');
    const [value, setValue] = useState(0);
    const [description, setDescription] = useState('');

    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const d = await getAppData();
            setData(d);
            setLoading(false);
        };
        load();
    }, []);

    // For Loans, we list ALL stores as potential creditors
    const availableStores = data.stores;

    useEffect(() => {
        if (availableStores.length === 1 && !store) {
            setStore(availableStores[0]);
        }
    }, [availableStores, store]);

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        setValue(rawValue ? parseInt(rawValue, 10) / 100 : 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        if (!store || value <= 0) {
            setSubmitError('Preencha a empresa e o valor corretamente.');
            return;
        }

        setSaving(true);
        try {
            await saveLoanTransaction({ id: '', date, store, type, value, description });
            setValue(0);
            setDescription('');
            alert('Transação de Empréstimo registrada!');
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] shadow-floating border border-slate-100 overflow-hidden relative">
                {/* Top Decoration */}
                <div className="h-32 bg-gradient-to-r from-indigo-900 to-indigo-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10 text-white transform rotate-12 translate-x-4 translate-y-2">
                        <Landmark size={140} />
                    </div>
                    <div className="absolute bottom-6 left-8 text-white">
                        <h2 className="text-3xl font-black tracking-tight">Controle de Empréstimos</h2>
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">Hero Centro</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-10 -mt-6 bg-white rounded-t-[2rem] relative z-10">
                    
                    {/* Operation Type Toggles */}
                    <div className="flex gap-4 mb-8 bg-slate-50 p-1.5 rounded-[1.5rem]">
                        <button
                            type="button"
                            onClick={() => setType('CREDIT')}
                            className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 ${type === 'CREDIT' ? 'bg-white shadow-card text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <div className={`p-2 rounded-full ${type === 'CREDIT' ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                                <ArrowDownCircle size={20} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wide">Entrada (Receber)</span>
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => setType('DEBIT')}
                            className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 ${type === 'DEBIT' ? 'bg-white shadow-card text-red-700' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <div className={`p-2 rounded-full ${type === 'DEBIT' ? 'bg-red-100' : 'bg-slate-200'}`}>
                                <ArrowUpCircle size={20} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wide">Saída (Pagar)</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                <Calendar size={12}/> Data
                            </label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                <Landmark size={12}/> Empresa (Credor/Devedor)
                            </label>
                            <div className="relative">
                                <select 
                                    value={store} 
                                    onChange={(e) => setStore(e.target.value)} 
                                    className={`w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 appearance-none transition-all cursor-pointer ${availableStores.length === 1 ? 'opacity-70' : ''}`}
                                >
                                    <option value="">Selecione...</option>
                                    {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor da Operação</label>
                            <div className="relative">
                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold ${type === 'CREDIT' ? 'text-emerald-400' : 'text-red-400'}`}>R$</span>
                                <input 
                                    type="text" 
                                    value={formatCurrency(value).replace('R$', '').trim()} 
                                    onChange={handleValueChange} 
                                    className={`w-full p-4 pl-12 text-right bg-slate-50 border-2 border-transparent rounded-2xl font-black text-4xl outline-none focus:bg-white transition-all ${type === 'CREDIT' ? 'text-emerald-600 focus:border-emerald-500' : 'text-red-600 focus:border-red-500'}`}
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                <FileText size={12}/> Descrição
                            </label>
                            <input 
                                type="text" 
                                value={description} 
                                onChange={(e) => setDescription(e.target.value)} 
                                maxLength={50} 
                                placeholder="Detalhes do empréstimo..."
                                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-medium text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                        {submitError && <div className="w-full bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold text-center">{submitError}</div>}
                        <button 
                            disabled={saving} 
                            type="submit" 
                            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95"
                        >
                            {saving ? <Loader2 className="animate-spin"/> : <CheckCircle size={24} />} REGISTRAR
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
