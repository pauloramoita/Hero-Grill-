import React, { useState, useEffect } from 'react';
import { getAppData, saveTransaction043, formatCurrency, getTodayLocalISO } from '../../services/storageService';
import { AppData } from '../../types';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const Cadastro043: React.FC = () => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
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
            alert('Lançamento registrado!');
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 max-w-4xl mx-auto animate-fadeIn">
            <h2 className="text-2xl font-bold text-heroBlack mb-6 border-b-2 border-heroRed pb-2">
                Novo Lançamento - Conta 043
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Data</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border rounded"/>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Loja</label>
                    <select value={store} onChange={(e) => setStore(e.target.value)} className="w-full p-3 border rounded">
                        <option value="">Selecione...</option>
                        {data.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo</label>
                    <div className="flex gap-4">
                        <label className={`flex-1 p-3 rounded border text-center font-bold cursor-pointer ${type === 'DEBIT' ? 'bg-red-100 border-red-500' : ''}`}>
                            <input type="radio" name="type" value="DEBIT" checked={type === 'DEBIT'} onChange={() => setType('DEBIT')} className="hidden"/> DÉBITO
                        </label>
                        <label className={`flex-1 p-3 rounded border text-center font-bold cursor-pointer ${type === 'CREDIT' ? 'bg-green-100 border-green-500' : ''}`}>
                            <input type="radio" name="type" value="CREDIT" checked={type === 'CREDIT'} onChange={() => setType('CREDIT')} className="hidden"/> CRÉDITO
                        </label>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Valor (R$)</label>
                    <input type="text" value={formatCurrency(value)} onChange={handleValueChange} className="w-full p-3 border rounded text-right text-lg"/>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={50} className="w-full p-3 border rounded"/>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t flex flex-col items-end gap-4">
                {submitError && <div className="text-red-600 font-bold">{submitError}</div>}
                <button disabled={saving} type="submit" className="bg-heroBlack text-white font-bold py-4 px-12 rounded shadow hover:bg-gray-800 flex items-center gap-3 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin"/> : <CheckCircle size={24} />} REGISTRAR
                </button>
            </div>
        </form>
    );
};