
import React, { useState, useEffect, useMemo } from 'react';
import { getAppData, saveTransaction043, formatCurrency, getTodayLocalISO } from '../../services/storageService';
import { AppData, User } from '../../types';
import { CheckCircle, Loader2, ShieldCheck, TrendingDown, TrendingUp, Calendar, Building2, FileText } from 'lucide-react';

interface Cadastro043Props {
    user: User;
}

export const Cadastro043: React.FC<Cadastro043Props> = ({ user }) => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [date, setDate] = useState(getTodayLocalISO());
    const [store, setStore] = useState('');
    const [type, setType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
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

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        setValue(rawValue ? parseInt(rawValue, 10) / 100 : 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        if (!store || value <= 0) {
            setSubmitError('Preencha os campos corretamente.');
            return;
        }

        setSaving(true);
        try {
            await saveTransaction043({ id: '', date, store, type, value, description });
            setValue(0);
            setDescription('');
            alert('Lançamento 043 registrado com sucesso!');
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {/* Floating Card */}
            <div className="bg-white rounded-[2.5rem] shadow-floating border border-slate-100 overflow-hidden relative">
                {/* Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>
                
                <div className="p-8 md:p-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Novo Lançamento</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conta 043 (Gestão Interna)</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* Type Selector - Visual Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div 
                                onClick={() => setType('DEBIT')}
                                className={`cursor-pointer relative overflow-hidden rounded-2xl border-2 p-6 flex flex-col items-center gap-3 transition-all duration-300 ${type === 'DEBIT' ? 'border-red-500 bg-red-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-red-200'}`}
                            >
                                <div className={`p-3 rounded-full ${type === 'DEBIT' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <TrendingDown size={24} />
                                </div>
                                <span className={`font-black uppercase text-sm tracking-wider ${type === 'DEBIT' ? 'text-red-700' : 'text-slate-500'}`}>Débito (Saída)</span>
                                {type === 'DEBIT' && <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full"></div>}
                            </div>

                            <div 
                                onClick={() => setType('CREDIT')}
                                className={`cursor-pointer relative overflow-hidden rounded-2xl border-2 p-6 flex flex-col items-center gap-3 transition-all duration-300 ${type === 'CREDIT' ? 'border-green-500 bg-green-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-green-200'}`}
                            >
                                <div className={`p-3 rounded-full ${type === 'CREDIT' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <TrendingUp size={24} />
                                </div>
                                <span className={`font-black uppercase text-sm tracking-wider ${type === 'CREDIT' ? 'text-green-700' : 'text-slate-500'}`}>Crédito (Entrada)</span>
                                {type === 'CREDIT' && <div className="absolute top-3 right-3 w-3 h-3 bg-green-500 rounded-full"></div>}
                            </div>
                        </div>

                        {/* Inputs Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                    <Calendar size={12}/> Data
                                </label>
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)} 
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                    <Building2 size={12}/> Loja
                                </label>
                                <div className="relative">
                                    <select 
                                        value={store} 
                                        onChange={(e) => setStore(e.target.value)} 
                                        className={`w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 appearance-none transition-all cursor-pointer ${availableStores.length === 1 ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        disabled={availableStores.length === 1}
                                    >
                                        <option value="">Selecione a Loja...</option>
                                        {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor da Transação</label>
                                <div className="relative">
                                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold ${type === 'DEBIT' ? 'text-red-400' : 'text-green-400'}`}>R$</span>
                                    <input 
                                        type="text" 
                                        value={formatCurrency(value).replace('R$', '').trim()} 
                                        onChange={handleValueChange} 
                                        className={`w-full p-4 pl-12 text-right bg-slate-50 border-2 border-transparent rounded-2xl font-black text-3xl outline-none focus:bg-white transition-all ${type === 'DEBIT' ? 'text-red-600 focus:border-red-500' : 'text-green-600 focus:border-green-500'}`}
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
                                    placeholder="Ex: Retirada para caixa pequeno..."
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 flex flex-col items-end gap-4">
                            {submitError && (
                                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 w-full">
                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span> {submitError}
                                </div>
                            )}
                            <button 
                                disabled={saving} 
                                type="submit" 
                                className="w-full md:w-auto bg-heroBlack text-white font-bold py-4 px-12 rounded-2xl shadow-lg shadow-slate-300 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />} 
                                CONFIRMAR LANÇAMENTO
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
