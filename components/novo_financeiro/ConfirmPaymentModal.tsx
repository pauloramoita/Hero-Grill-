
import React, { useState } from 'react';
import { DailyTransaction, FinancialAccount } from '../../types';
import { getTodayLocalISO, formatCurrency } from '../../services/storageService';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ConfirmPaymentModalProps {
    transaction: DailyTransaction;
    accounts: FinancialAccount[];
    onClose: () => void;
    onConfirm: (updated: DailyTransaction) => void;
}

export const ConfirmPaymentModal: React.FC<ConfirmPaymentModalProps> = ({ transaction, accounts, onClose, onConfirm }) => {
    const [accountId, setAccountId] = useState(transaction.accountId || '');
    const [paymentMethod, setPaymentMethod] = useState(transaction.paymentMethod || 'Boleto');
    const [paymentDate, setPaymentDate] = useState(getTodayLocalISO());

    // Filter accounts if store is present to avoid mismatch
    const filteredAccounts = accounts.filter(a => !transaction.store || a.store === transaction.store);

    const handleConfirm = () => {
        if (!accountId) {
            alert('Selecione uma conta para realizar o pagamento.');
            return;
        }
        if (!paymentMethod || paymentMethod === '-') {
            alert('Selecione um método de pagamento.');
            return;
        }

        const updated: DailyTransaction = {
            ...transaction,
            accountId,
            paymentMethod,
            paymentDate,
            status: 'Pago',
            // Ensure origin is preserved (likely 'pedido' converting to finance record)
            origin: transaction.origin || 'manual' 
        };
        onConfirm(updated);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md animate-fadeIn">
                <div className="bg-gray-100 p-4 rounded-t-lg border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <CheckCircle size={20} className="text-green-600"/> Confirmar Pagamento
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-600"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800 flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0"/>
                        <p>Para confirmar o pagamento, complete as informações abaixo.</p>
                    </div>

                    <div>
                        <p className="text-sm font-bold text-gray-500">Valor a Pagar</p>
                        <p className="text-2xl font-black text-gray-800">{formatCurrency(transaction.value)}</p>
                        <p className="text-xs text-gray-400">{transaction.description || transaction.supplier || transaction.product}</p>
                    </div>

                    {(!transaction.accountId) && (
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Conta de Saída</label>
                            <select 
                                value={accountId} 
                                onChange={e => setAccountId(e.target.value)} 
                                className="w-full p-2.5 border rounded bg-white focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                <option value="">Selecione a Conta...</option>
                                {filteredAccounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(!transaction.paymentMethod || transaction.paymentMethod === '-') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Método de Pagamento</label>
                            <select 
                                value={paymentMethod} 
                                onChange={e => setPaymentMethod(e.target.value)} 
                                className="w-full p-2.5 border rounded bg-white focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                <option value="Boleto">Boleto</option>
                                <option value="PiX">PiX</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Cartão">Cartão</option>
                                <option value="Transferência bancária">Transferência bancária</option>
                            </select>
                        </div>
                    )}

                    <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Data do Pagamento</label>
                         <input 
                            type="date" 
                            value={paymentDate} 
                            onChange={e => setPaymentDate(e.target.value)}
                            className="w-full p-2.5 border rounded bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>

                    <button 
                        onClick={handleConfirm}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded shadow-lg transition-colors flex justify-center items-center gap-2 mt-4"
                    >
                        <CheckCircle size={20}/> CONFIRMAR E SALVAR
                    </button>
                </div>
            </div>
        </div>
    );
};
