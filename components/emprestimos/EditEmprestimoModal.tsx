
import React, { useState, useEffect } from 'react';
import { AppData, LoanTransaction } from '../../types';
import { getAppData, formatCurrency } from '../../services/storageService';
import { X, Save } from 'lucide-react';

interface EditEmprestimoModalProps {
    transaction: LoanTransaction;
    onClose: () => void;
    onSave: (updatedTransaction: LoanTransaction) => void;
}

export const EditEmprestimoModal: React.FC<EditEmprestimoModalProps> = ({ transaction, onClose, onSave }) => {
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

        const updatedTransaction: LoanTransaction = {
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
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-indigo-50">
                    <h3 className="text-xl font-bold text-indigo-900">Editar Empréstimo</h3>
                    <button type="button" onClick={onClose} className="text-indigo-400 hover:text-indigo-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 gap-6">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"/>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa (Credor)</label>
                        <select value={store} onChange={(e) => setStore(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Operação</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 cursor-pointer p-3 rounded-lg border text-center font-bold transition-all ${type === 'CREDIT' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                                <input type="radio" name="editType" value="CREDIT" checked={type === 'CREDIT'} onChange={() => setType('CREDIT')} className="hidden" />
                                ENTRADA (Empréstimo)
                            </label>
                            <label className={`flex-1 cursor-pointer p-3 rounded-lg border text-center font-bold transition-all ${type === 'DEBIT' ? 'bg-red-100 border-red-500 text-red-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                                <input type="radio" name="editType" value="DEBIT" checked={type === 'DEBIT'} onChange={() => setType('DEBIT')} className="hidden" />
                                SAÍDA (Pagamento)
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                        <input 
                            type="text" 
                            value={formatCurrency(value)} 
                            onChange={handleValueChange}
                            className="w-full p-3 border rounded-lg text-right font-black text-lg text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                        <input 
                            type="text" 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={100}
                            className="w-full p-3 border rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex justify-end pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="mr-4 px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                            <Save size={18} /> Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
