import React, { useState, useEffect } from 'react';
import { AppData, Transaction043 } from '../../types';
import { getAppData, formatCurrency } from '../../services/storageService';
import { X, Save } from 'lucide-react';

interface EditTransactionModalProps {
    transaction: Transaction043;
    onClose: () => void;
    onSave: (updatedTransaction: Transaction043) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, onClose, onSave }) => {
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    
    const [date, setDate] = useState(transaction.date);
    const [store, setStore] = useState(transaction.store);
    const [type, setType] = useState(transaction.type);
    const [value, setValue] = useState(transaction.value);
    const [description, setDescription] = useState(transaction.description);

    useEffect(() => {
        const load = async () => {
            const data = await getAppData();
            setAppData(data);
        };
        load();
    }, []);

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setValue(floatValue);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!store || value <= 0) {
            alert('Por favor, preencha os campos obrigatórios.');
            return;
        }

        const updatedTransaction: Transaction043 = {
            ...transaction,
            date,
            store,
            type,
            value,
            description
        };

        onSave(updatedTransaction);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-heroBlack">Editar Lançamento 043</h3>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-red-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 gap-6">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Data</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border rounded"/>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Loja</label>
                        <select value={store} onChange={(e) => setStore(e.target.value)} className="w-full p-2 border rounded">
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tipo</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 cursor-pointer p-2 rounded border text-center font-bold ${type === 'DEBIT' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-gray-300'}`}>
                                <input type="radio" name="editType" value="DEBIT" checked={type === 'DEBIT'} onChange={() => setType('DEBIT')} className="hidden" />
                                DÉBITO
                            </label>
                            <label className={`flex-1 cursor-pointer p-2 rounded border text-center font-bold ${type === 'CREDIT' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300'}`}>
                                <input type="radio" name="editType" value="CREDIT" checked={type === 'CREDIT'} onChange={() => setType('CREDIT')} className="hidden" />
                                CRÉDITO
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Valor (R$)</label>
                        <input 
                            type="text" 
                            value={formatCurrency(value)} 
                            onChange={handleValueChange}
                            className="w-full p-2 border rounded text-right font-mono"
                        />
                    </div>

                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                        <input 
                            type="text" 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={50}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    <div className="flex justify-end pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="mr-4 px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                        <button type="submit" className="bg-heroRed text-white px-6 py-2 rounded hover:bg-red-800 flex items-center gap-2">
                            <Save size={18} /> Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};