
import React, { useState, useEffect } from 'react';
import { DailyTransaction, FinancialAccount } from '../../types';
import { getTodayLocalISO, formatCurrency } from '../../services/storageService';
import { X, CheckCircle, AlertTriangle, Layers } from 'lucide-react';

interface BatchPaymentModalProps {
    transactions: DailyTransaction[];
    accounts: FinancialAccount[];
    onClose: () => void;
    onConfirm: (paymentDetails: { accountId: string, paymentMethod: string, paymentDate: string }) => void;
}

export const BatchPaymentModal: React.FC<BatchPaymentModalProps> = ({ transactions, accounts, onClose, onConfirm }) => {
    const [accountId, setAccountId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Boleto');
    const [paymentDate, setPaymentDate] = useState(getTodayLocalISO());

    // Calculate total
    const totalValue = transactions.reduce((acc, t) => acc + t.value, 0);
    
    // Infer store from first transaction to filter accounts (optional, assumes batch is often usually one store)
    // If mixed stores, show all accounts or let user choose. Let's show all for flexibility but grouped.
    
    const handleConfirm = () => {
        if (!accountId) {
            alert('Selecione uma conta para realizar o pagamento em lote.');
            return;
        }
        if (!paymentMethod || paymentMethod === '-') {
            alert('Selecione um método de pagamento.');
            return;
        }

        onConfirm({
            accountId,
            paymentMethod,
            paymentDate
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-slate-800 p-4 rounded-t-lg border-b border-slate-700 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2">
                        <Layers size={20} className="text-green-400"/> Pagamento em Lote
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-5">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-900 flex flex-col gap-2">
                        <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                            <span className="font-bold">Itens Selecionados:</span>
                            <span className="font-black bg-white px-2 py-0.5 rounded text-blue-700">{transactions.length}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="font-bold">Valor Total:</span>
                            <span className="font-black text-lg text-blue-700">{formatCurrency(totalValue)}</span>
                        </div>
                    </div>

                    <div className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded">
                        <AlertTriangle size={12} className="inline mr-1 text-amber-500"/>
                        Os dados abaixo serão aplicados a <strong>todos</strong> os itens selecionados.
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Conta de Saída</label>
                        <select 
                            value={accountId} 
                            onChange={e => setAccountId(e.target.value)} 
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none font-medium"
                        >
                            <option value="">Selecione a Conta...</option>
                            {accounts.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.store})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Método de Pagamento</label>
                        <select 
                            value={paymentMethod} 
                            onChange={e => setPaymentMethod(e.target.value)} 
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none font-medium"
                        >
                            <option value="Boleto">Boleto</option>
                            <option value="PiX">PiX</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Cartão">Cartão</option>
                            <option value="Transferência bancária">Transferência bancária</option>
                        </select>
                    </div>

                    <div>
                         <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Data do Pagamento</label>
                         <input 
                            type="date" 
                            value={paymentDate} 
                            onChange={e => setPaymentDate(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none font-medium"
                        />
                    </div>

                    <button 
                        onClick={handleConfirm}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-lg shadow-lg transition-colors flex justify-center items-center gap-2 mt-4 active:scale-95"
                    >
                        <CheckCircle size={20}/> PAGAR {transactions.length} ITENS
                    </button>
                </div>
            </div>
        </div>
    );
};
