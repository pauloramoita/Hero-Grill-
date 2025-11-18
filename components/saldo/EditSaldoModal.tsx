
import React, { useState, useEffect } from 'react';
import { AppData, AccountBalance } from '../../types';
import { getAppData, formatCurrency } from '../../services/storageService';
import { X, Save } from 'lucide-react';

interface EditSaldoModalProps {
    balance: AccountBalance;
    onClose: () => void;
    onSave: (updated: AccountBalance) => void;
}

export const EditSaldoModal: React.FC<EditSaldoModalProps> = ({ balance, onClose, onSave }) => {
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    
    const [store, setStore] = useState(balance.store);
    const [year, setYear] = useState(balance.year);
    const [month, setMonth] = useState(balance.month);

    const [caixaEconomica, setCaixaEconomica] = useState(balance.caixaEconomica);
    const [cofre, setCofre] = useState(balance.cofre);
    const [loteria, setLoteria] = useState(balance.loteria);
    const [pagbankH, setPagbankH] = useState(balance.pagbankH);
    const [pagbankD, setPagbankD] = useState(balance.pagbankD);
    const [investimentos, setInvestimentos] = useState(balance.investimentos);

    useEffect(() => {
        setAppData(getAppData());
    }, []);

    const handleCurrencyInput = (setter: React.Dispatch<React.SetStateAction<number>>, e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setter(floatValue);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const total = caixaEconomica + cofre + loteria + pagbankH + pagbankD + investimentos;

        const updated: AccountBalance = {
            ...balance,
            store,
            year,
            month,
            caixaEconomica,
            cofre,
            loteria,
            pagbankH,
            pagbankD,
            investimentos,
            totalBalance: total
        };

        onSave(updated);
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded outline-none text-right font-mono";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-heroBlack">Editar Saldo de Contas</h3>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-red-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Header Info (Read only mostly) */}
                    <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded">
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Loja</label>
                            <div className="font-bold">{store}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Período</label>
                            <div className="font-bold">{month}/{year}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Caixa Econômica</label>
                            <input type="text" value={formatCurrency(caixaEconomica)} onChange={(e) => handleCurrencyInput(setCaixaEconomica, e)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Cofre</label>
                            <input type="text" value={formatCurrency(cofre)} onChange={(e) => handleCurrencyInput(setCofre, e)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Loteria</label>
                            <input type="text" value={formatCurrency(loteria)} onChange={(e) => handleCurrencyInput(setLoteria, e)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">PagBank H</label>
                            <input type="text" value={formatCurrency(pagbankH)} onChange={(e) => handleCurrencyInput(setPagbankH, e)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">PagBank D</label>
                            <input type="text" value={formatCurrency(pagbankD)} onChange={(e) => handleCurrencyInput(setPagbankD, e)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Investimentos</label>
                            <input type="text" value={formatCurrency(investimentos)} onChange={(e) => handleCurrencyInput(setInvestimentos, e)} className={inputClass} />
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t mt-6">
                        <button type="button" onClick={onClose} className="mr-4 px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                        <button type="submit" className="bg-heroBlack text-white px-6 py-2 rounded hover:bg-gray-800 flex items-center gap-2">
                            <Save size={18} /> Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};