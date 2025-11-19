
import React, { useState, useEffect } from 'react';
import { FinancialRecord } from '../../types';
import { formatCurrency } from '../../services/storageService';
import { X, Save } from 'lucide-react';

interface EditFinanceiroModalProps {
    record: FinancialRecord;
    onClose: () => void;
    onSave: (updated: FinancialRecord) => void;
}

export const EditFinanceiroModal: React.FC<EditFinanceiroModalProps> = ({ record, onClose, onSave }) => {
    const [store, setStore] = useState(record.store);
    const [year, setYear] = useState(record.year);
    const [month, setMonth] = useState(record.month);

    // Credits
    const [creditCaixa, setCreditCaixa] = useState(record.creditCaixa);
    const [creditDelta, setCreditDelta] = useState(record.creditDelta);
    const [creditPagBankH, setCreditPagBankH] = useState(record.creditPagBankH);
    const [creditPagBankD, setCreditPagBankD] = useState(record.creditPagBankD);
    const [creditIfood, setCreditIfood] = useState(record.creditIfood);

    // Debits
    const [debitCaixa, setDebitCaixa] = useState(record.debitCaixa);
    const [debitPagBankH, setDebitPagBankH] = useState(record.debitPagBankH);
    const [debitPagBankD, setDebitPagBankD] = useState(record.debitPagBankD);
    const [debitLoteria, setDebitLoteria] = useState(record.debitLoteria);

    const handleCurrencyInput = (setter: React.Dispatch<React.SetStateAction<number>>, e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const isNegative = rawValue.includes('-');
        const cleanValue = rawValue.replace(/\D/g, '');
        let floatValue = cleanValue ? parseInt(cleanValue, 10) / 100 : 0;
        if (isNegative) floatValue = floatValue * -1;
        setter(floatValue);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const totalRevenues = creditCaixa + creditDelta + creditPagBankH + creditPagBankD + creditIfood;
        const totalExpenses = debitCaixa + debitPagBankH + debitPagBankD + debitLoteria;
        const netResult = totalRevenues - totalExpenses;

        const updated: FinancialRecord = {
            ...record,
            store,
            year,
            month,
            creditCaixa,
            creditDelta,
            creditPagBankH,
            creditPagBankD,
            creditIfood,
            totalRevenues,
            debitCaixa,
            debitPagBankH,
            debitPagBankD,
            debitLoteria,
            totalExpenses,
            netResult
        };

        onSave(updated);
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded outline-none text-right font-mono text-sm";
    
    const monthNames: Record<string, string> = {
        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
        '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
        '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800">Editar Registro Financeiro</h3>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-red-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded">
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Loja</label>
                            <div className="font-bold">{store}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Período</label>
                            <div className="font-bold">{monthNames[month] || month}/{year}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Credits Column */}
                        <div className="space-y-3 bg-green-50 p-4 rounded border border-green-100">
                            <h4 className="font-bold text-green-800 border-b border-green-200 pb-2 mb-2">Receitas</h4>
                            <div>
                                <label className="block text-xs font-bold text-green-700 mb-1">Caixa Econômica</label>
                                <input type="text" value={formatCurrency(creditCaixa)} onChange={(e) => handleCurrencyInput(setCreditCaixa, e)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-green-700 mb-1">Delta</label>
                                <input type="text" value={formatCurrency(creditDelta)} onChange={(e) => handleCurrencyInput(setCreditDelta, e)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-green-700 mb-1">PagBank H</label>
                                <input type="text" value={formatCurrency(creditPagBankH)} onChange={(e) => handleCurrencyInput(setCreditPagBankH, e)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-green-700 mb-1">PagBank D</label>
                                <input type="text" value={formatCurrency(creditPagBankD)} onChange={(e) => handleCurrencyInput(setCreditPagBankD, e)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-green-700 mb-1">Ifood</label>
                                <input type="text" value={formatCurrency(creditIfood)} onChange={(e) => handleCurrencyInput(setCreditIfood, e)} className={inputClass} />
                            </div>
                        </div>

                        {/* Debits Column */}
                        <div className="space-y-3 bg-red-50 p-4 rounded border border-red-100">
                            <h4 className="font-bold text-red-800 border-b border-red-200 pb-2 mb-2">Despesas</h4>
                            <div>
                                <label className="block text-xs font-bold text-red-700 mb-1">Caixa Econômica</label>
                                <input type="text" value={formatCurrency(debitCaixa)} onChange={(e) => handleCurrencyInput(setDebitCaixa, e)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-red-700 mb-1">PagBank H</label>
                                <input type="text" value={formatCurrency(debitPagBankH)} onChange={(e) => handleCurrencyInput(setDebitPagBankH, e)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-red-700 mb-1">PagBank D</label>
                                <input type="text" value={formatCurrency(debitPagBankD)} onChange={(e) => handleCurrencyInput(setDebitPagBankD, e)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-red-700 mb-1">Loteria</label>
                                <input type="text" value={formatCurrency(debitLoteria)} onChange={(e) => handleCurrencyInput(setDebitLoteria, e)} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t mt-6">
                        <button type="button" onClick={onClose} className="mr-4 px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                        <button type="submit" className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-black flex items-center gap-2">
                            <Save size={18} /> Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};