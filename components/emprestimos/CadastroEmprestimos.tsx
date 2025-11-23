
import React, { useState, useEffect, useMemo } from 'react';
import { getAppData, saveLoanTransaction, formatCurrency, getTodayLocalISO } from '../../services/storageService';
import { AppData, User } from '../../types';
import { CheckCircle, Loader2, Landmark, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

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

    // For Loans, we list ALL stores as potential creditors, ignoring user permissions
    const availableStores = data.stores;

    useEffect(() => {
        // Only auto-select if there's exactly one store in the system
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
            alert('Transação de Empréstimo registrada com sucesso!');
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 max-w-4xl mx-auto animate-fadeIn relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <Landmark className="text-indigo-600" size={32} />
                Novo Lançamento - Empréstimos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium text-slate-700"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa (Credor)</label>
                    <select 
                        value={store} 
                        onChange={(e) => setStore(e.target.value)} 
                        className={`w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold text-slate-700 ${availableStores.length === 1 ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                    >
                        <option value="">Selecione a Empresa...</option>
                        {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Movimento</label>
                    <div className="flex gap-4">
                        <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${type === 'CREDIT' ? 'bg-green-50 border-green-500 shadow-md shadow-green-100' : 'bg-white border-slate-200 text-slate-400 hover:border-green-200'}`}>
                            <input type="radio" name="type" value="CREDIT" checked={type === 'CREDIT'} onChange={() => setType('CREDIT')} className="hidden"/> 
                            <ArrowDownCircle className={type === 'CREDIT' ? 'text-green-600' : 'text-slate-300'} />
                            <span className={`font-black text-sm ${type === 'CREDIT' ? 'text-green-700' : ''}`}>ENTRADA (Recebimento)</span>
                        </label>
                        <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${type === 'DEBIT' ? 'bg-red-50 border-red-500 shadow-md shadow-red-100' : 'bg-white border-slate-200 text-slate-400 hover:border-red-200'}`}>
                            <input type="radio" name="type" value="DEBIT" checked={type === 'DEBIT'} onChange={() => setType('DEBIT')} className="hidden"/> 
                            <ArrowUpCircle className={type === 'DEBIT' ? 'text-red-600' : 'text-slate-300'} />
                            <span className={`font-black text-sm ${type === 'DEBIT' ? 'text-red-700' : ''}`}>SAÍDA (Pagamento)</span>
                        </label>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                    <input type="text" value={formatCurrency(value)} onChange={handleValueChange} className="w-full p-4 border border-slate-200 rounded-xl text-right text-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={50} className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all" placeholder="Ex: Aporte inicial"/>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-end gap-4">
                {submitError && <div className="text-red-600 font-bold bg-red-50 px-4 py-2 rounded-lg border border-red-100">{submitError}</div>}
                <button disabled={saving} type="submit" className="bg-indigo-600 text-white font-bold py-4 px-12 rounded-xl shadow-lg hover:bg-indigo-700 flex items-center gap-3 disabled:opacity-70 transition-all active:scale-95">
                    {saving ? <Loader2 className="animate-spin"/> : <CheckCircle size={24} />} REGISTRAR TRANSAÇÃO
                </button>
            </div>
        </form>
    );
};
