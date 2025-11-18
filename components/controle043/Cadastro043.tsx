
import React, { useState, useEffect } from 'react';
import { getAppData, saveTransaction043, formatCurrency, getTodayLocalISO } from '../../services/storageService';
import { AppData } from '../../types';
import { CheckCircle, AlertCircle } from 'lucide-react';

export const Cadastro043: React.FC = () => {
    const [data, setData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    
    // Form Fields
    const [date, setDate] = useState(getTodayLocalISO());
    const [store, setStore] = useState('');
    const [type, setType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
    const [value, setValue] = useState(0);
    const [description, setDescription] = useState('');

    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        setData(getAppData());
    }, []);

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setValue(floatValue);
    };

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        if (!store) {
            setSubmitError('Selecione uma loja.');
            return;
        }
        if (value <= 0) {
            setSubmitError('O valor deve ser maior que zero.');
            return;
        }

        const newTrans = {
            id: generateId(),
            date,
            store,
            type,
            value,
            description: description.substring(0, 50)
        };

        saveTransaction043(newTrans);

        // Reset fields but keep Date
        setStore('');
        // Keep Type
        setValue(0);
        setDescription('');
        alert('Lançamento registrado com sucesso!');
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 max-w-4xl mx-auto animate-fadeIn">
            <h2 className="text-2xl font-bold text-heroBlack mb-6 border-b-2 border-heroRed pb-2">
                Novo Lançamento - Conta 043
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Data */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Data</label>
                    <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-heroRed outline-none"
                    />
                </div>

                {/* Loja */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Loja</label>
                    <select 
                        value={store} 
                        onChange={(e) => setStore(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-heroRed outline-none"
                    >
                        <option value="">Selecione...</option>
                        {data.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {data.stores.length === 0 && <p className="text-xs text-red-500 mt-1">Cadastre lojas no módulo de Pedidos > Campos!</p>}
                </div>

                {/* Tipo */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Lançamento</label>
                    <div className="flex gap-4">
                        <label className={`flex-1 cursor-pointer p-3 rounded border text-center font-bold transition-colors ${type === 'DEBIT' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                            <input 
                                type="radio" 
                                name="type" 
                                value="DEBIT" 
                                checked={type === 'DEBIT'} 
                                onChange={() => setType('DEBIT')}
                                className="hidden"
                            />
                            DÉBITO (-)
                        </label>
                        <label className={`flex-1 cursor-pointer p-3 rounded border text-center font-bold transition-colors ${type === 'CREDIT' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                            <input 
                                type="radio" 
                                name="type" 
                                value="CREDIT" 
                                checked={type === 'CREDIT'} 
                                onChange={() => setType('CREDIT')}
                                className="hidden"
                            />
                            CRÉDITO (+)
                        </label>
                    </div>
                </div>

                {/* Valor */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Valor (R$)</label>
                    <input 
                        type="text"
                        value={formatCurrency(value)} 
                        onChange={handleValueChange}
                        className="w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-heroRed outline-none font-mono text-right text-lg"
                        placeholder="R$ 0,00"
                    />
                </div>

                {/* Descrição */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Descrição <span className="text-gray-400 font-normal">(Opcional - Máx 50 caract.)</span>
                    </label>
                    <input 
                        type="text" 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={50}
                        placeholder="Ex: Empréstimo Capital de Giro"
                        className="w-full p-3 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-heroRed outline-none"
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">
                        {description.length}/50
                    </div>
                </div>
            </div>

            {/* Submit Area */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-end gap-4">
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
                    REGISTRAR LANÇAMENTO
                </button>
            </div>
        </form>
    );
};
