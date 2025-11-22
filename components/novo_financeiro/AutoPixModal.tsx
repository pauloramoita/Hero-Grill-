
import React, { useState, useEffect, useMemo } from 'react';
import { FinancialAccount, DailyTransaction } from '../../types';
import { formatCurrency, getTodayLocalISO } from '../../services/storageService';
import { X, Save, Wand2, Calculator, ArrowRight } from 'lucide-react';

interface AutoPixModalProps {
    accounts: FinancialAccount[];
    stores: string[];
    preSelectedStore?: string;
    preSelectedAccount?: string;
    getCurrentBalance: (accountId: string) => number;
    onClose: () => void;
    onSave: (t: DailyTransaction) => void;
}

export const AutoPixModal: React.FC<AutoPixModalProps> = ({ 
    accounts, 
    stores, 
    preSelectedStore, 
    preSelectedAccount,
    getCurrentBalance, 
    onClose, 
    onSave 
}) => {
    const [store, setStore] = useState(preSelectedStore || '');
    const [accountId, setAccountId] = useState(preSelectedAccount || '');
    const [realBalance, setRealBalance] = useState<number>(0);
    const [currentSystemBalance, setCurrentSystemBalance] = useState<number>(0);

    // Auto-select store if only one
    useEffect(() => {
        if (stores.length === 1 && !store) {
            setStore(stores[0]);
        }
    }, [stores]);

    // Update system balance when account changes
    useEffect(() => {
        if (accountId) {
            const bal = getCurrentBalance(accountId);
            setCurrentSystemBalance(bal);
            if (realBalance === 0) setRealBalance(bal); 
        }
    }, [accountId]);

    const filteredAccounts = useMemo(() => {
        return accounts.filter(a => !store || a.store === store);
    }, [accounts, store]);

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setRealBalance(floatValue);
    };

    // Logic: Entry = Real (Typed) - System (Calculated)
    const calculatedDiff = realBalance - currentSystemBalance;
    const isPositive = calculatedDiff > 0;

    const handleConfirm = () => {
        if (!store || !accountId) {
            alert('Selecione Loja e Conta.');
            return;
        }

        if (calculatedDiff === 0) {
            alert('O saldo digitado é igual ao do sistema. Nenhum lançamento necessário.');
            return;
        }

        const transaction: DailyTransaction = {
            id: '',
            date: getTodayLocalISO(),
            paymentDate: getTodayLocalISO(),
            store: store,
            type: isPositive ? 'Receita' : 'Despesa',
            accountId: accountId,
            paymentMethod: 'PiX',
            category: 'Pix Cliente',
            supplier: 'Pix Cliente',
            product: 'Pix Cliente',
            classification: 'Variável',
            value: Math.abs(calculatedDiff),
            status: 'Pago',
            description: 'Ajuste Automático (Pix Cliente)',
            origin: 'manual'
        };

        onSave(transaction);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fadeIn overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 flex justify-between items-center">
                    <div className="text-white">
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <Wand2 className="text-yellow-300" />
                            Pix Automático
                        </h2>
                        <p className="text-purple-100 text-xs mt-1 font-medium">O sistema calculará a diferença automaticamente.</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-purple-200 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Loja</label>
                            <select 
                                value={store} 
                                onChange={e => setStore(e.target.value)} 
                                className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            >
                                <option value="">Selecione...</option>
                                {stores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conta</label>
                            <select 
                                value={accountId} 
                                onChange={e => setAccountId(e.target.value)} 
                                className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            >
                                <option value="">Selecione...</option>
                                {filteredAccounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-500">Saldo Atual Calculado:</span>
                            <span className="font-mono font-bold text-slate-700 text-lg">{formatCurrency(currentSystemBalance)}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-black text-purple-800 uppercase mb-1">Saldo Real (Banco)</label>
                                <input 
                                    type="text" 
                                    value={formatCurrency(realBalance)} 
                                    onChange={handleCurrencyChange} 
                                    className="w-full p-3 border-2 border-purple-100 rounded-lg text-right font-black text-2xl text-purple-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                                    autoFocus
                                    placeholder="Quanto tem no banco?"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-slate-400">
                        <Calculator size={20} />
                        <ArrowRight size={20} />
                        <span className="text-xs font-bold uppercase">Calculando Diferença</span>
                    </div>

                    <div className={`p-4 rounded-lg border-2 text-center ${calculatedDiff > 0 ? 'bg-green-50 border-green-200 text-green-800' : calculatedDiff < 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                        <span className="block text-xs font-black uppercase mb-1">Lançamento Automático de</span>
                        <span className="block text-3xl font-black tracking-tight">{formatCurrency(Math.abs(calculatedDiff))}</span>
                        <span className="block text-xs font-bold mt-1 uppercase bg-white/50 inline-block px-2 py-1 rounded">
                            {calculatedDiff > 0 ? 'RECEITA (Ajuste Positivo)' : calculatedDiff < 0 ? 'DESPESA (Ajuste Negativo)' : 'NENHUMA ALTERAÇÃO'}
                        </span>
                    </div>

                    <button 
                        onClick={handleConfirm}
                        disabled={!store || !accountId || calculatedDiff === 0}
                        className="w-full bg-purple-700 hover:bg-purple-800 text-white py-4 rounded-lg font-black text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        <Wand2 size={24} />
                        CONFIRMAR LANÇAMENTO
                    </button>
                </div>
            </div>
        </div>
    );
};
