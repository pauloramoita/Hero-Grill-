

import React, { useState, useEffect } from 'react';
import { AppData, FinancialAccount, DailyTransaction } from '../../types';
import { getAppData, getFinancialAccounts, formatCurrency } from '../../services/storageService';
import { X, Save, CheckCircle, ArrowRight } from 'lucide-react';

interface EditLancamentoModalProps {
    transaction: DailyTransaction;
    onClose: () => void;
    onSave: (updated: DailyTransaction) => void;
}

export const EditLancamentoModal: React.FC<EditLancamentoModalProps> = ({ transaction, onClose, onSave }) => {
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    
    // Form States
    const [date, setDate] = useState(transaction.date);
    const [paymentDate, setPaymentDate] = useState(transaction.paymentDate || '');
    const [store, setStore] = useState(transaction.store || '');
    const [type, setType] = useState<'Receita' | 'Despesa' | 'Transferência'>(transaction.type as any || 'Despesa');
    const [accountId, setAccountId] = useState(transaction.accountId || '');
    
    // Transfer
    const [destinationStore, setDestinationStore] = useState(transaction.destinationStore || '');
    const [destinationAccountId, setDestinationAccountId] = useState(transaction.destinationAccountId || '');

    const [paymentMethod, setPaymentMethod] = useState(transaction.paymentMethod || 'Boleto');
    const [product, setProduct] = useState(transaction.product || '');
    const [category, setCategory] = useState(transaction.category || '');
    const [supplier, setSupplier] = useState(transaction.supplier || '');
    const [value, setValue] = useState(transaction.value);
    const [status, setStatus] = useState<'Pago' | 'Pendente'>(transaction.status || 'Pendente');
    const [description, setDescription] = useState(transaction.description || '');

    useEffect(() => {
        const load = async () => {
            const [d, acc] = await Promise.all([getAppData(), getFinancialAccounts()]);
            setAppData(d);
            setAccounts(acc);
        };
        load();
    }, []);

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setValue(floatValue);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (type === 'Transferência') {
            if (!store || !accountId || !destinationStore || !destinationAccountId || value <= 0) {
                alert('Preencha Origem, Destino e Valor.');
                return;
            }
        } else {
             if (!store || !accountId || value <= 0) {
                alert('Preencha Loja, Conta e Valor.');
                return;
            }
        }

        const updated: DailyTransaction = {
            ...transaction,
            date,
            paymentDate: paymentDate || null,
            store,
            type,
            accountId,
            destinationStore: type === 'Transferência' ? destinationStore : undefined,
            destinationAccountId: type === 'Transferência' ? destinationAccountId : undefined,
            paymentMethod,
            product: type !== 'Transferência' ? product : '',
            category: type !== 'Transferência' ? category : '',
            supplier: type !== 'Transferência' ? supplier : '',
            value,
            status,
            description,
            origin: 'manual' // Ao editar/salvar, consolidamos como registro manual/financeiro
        };

        onSave(updated);
    };

    // Filter accounts by selected store
    const filteredAccounts = accounts.filter(a => !store || a.store === store);
    const filteredDestAccounts = accounts.filter(a => !destinationStore || a.store === destinationStore);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800">Editar Lançamento</h3>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-red-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Tipo</label>
                            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 border rounded font-bold">
                                <option value="Despesa">Despesa</option>
                                <option value="Receita">Receita</option>
                                <option value="Transferência">Transferência</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Valor (R$)</label>
                            <input 
                                type="text" 
                                value={formatCurrency(value)} 
                                onChange={handleCurrencyChange} 
                                className="w-full p-2 border rounded text-right font-bold text-lg"
                            />
                        </div>
                    </div>

                    {type === 'Transferência' ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 bg-blue-50 p-4 rounded border border-blue-200">
                             {/* Origem */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-1">Origem</h4>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Loja Origem</label>
                                    <select value={store} onChange={e => setStore(e.target.value)} className="w-full p-2 border rounded">
                                        <option value="">Selecione...</option>
                                        {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Conta Origem</label>
                                    <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full p-2 border rounded">
                                        <option value="">Selecione...</option>
                                        {filteredAccounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Destino */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-green-800 border-b border-green-200 pb-1">Destino</h4>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Loja Destino</label>
                                    <select value={destinationStore} onChange={e => setDestinationStore(e.target.value)} className="w-full p-2 border rounded">
                                        <option value="">Selecione...</option>
                                        {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Conta Destino</label>
                                    <select value={destinationAccountId} onChange={e => setDestinationAccountId(e.target.value)} className="w-full p-2 border rounded">
                                        <option value="">Selecione...</option>
                                        {filteredDestAccounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                                    <select value={store} onChange={e => setStore(e.target.value)} className="w-full p-2 border rounded">
                                        <option value="">Selecione...</option>
                                        {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Conta {accountId === '' && <span className="text-red-500">*</span>}</label>
                                    <select value={accountId} onChange={e => setAccountId(e.target.value)} className={`w-full p-2 border rounded ${!accountId ? 'border-red-300 bg-red-50' : ''}`}>
                                        <option value="">Selecione a Conta...</option>
                                        {filteredAccounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Categoria</label>
                                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border rounded">
                                        <option value="">Selecione...</option>
                                        {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Fornecedor</label>
                                    <select value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-2 border rounded">
                                        <option value="">Selecione...</option>
                                        {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Produto</label>
                                    <select value={product} onChange={e => setProduct(e.target.value)} className="w-full p-2 border rounded">
                                        <option value="">Selecione...</option>
                                        {appData.products.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                         <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Método Pagamento</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 border rounded">
                                <option value="Boleto">Boleto</option>
                                <option value="PiX">PiX</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Cartão">Cartão</option>
                                <option value="Transferência bancária">Transferência bancária</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Descrição (Opcional)</label>
                            <input 
                                type="text" 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                className="w-full p-2 border rounded"
                                maxLength={100}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded border border-gray-100">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Data Vencimento</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Data Pagamento</label>
                            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 border rounded"/>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Status</label>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => { setStatus('Pago'); if(!paymentDate) setPaymentDate(new Date().toISOString().split('T')[0]); }}
                                    className={`flex-1 py-2 text-xs font-bold rounded ${status === 'Pago' ? 'bg-green-600 text-white shadow' : 'bg-white border border-gray-300 text-gray-600'}`}
                                >
                                    PAGO
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => { setStatus('Pendente'); setPaymentDate(''); }}
                                    className={`flex-1 py-2 text-xs font-bold rounded ${status === 'Pendente' ? 'bg-yellow-500 text-white shadow' : 'bg-white border border-gray-300 text-gray-600'}`}
                                >
                                    PENDENTE
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2 shadow">
                            <Save size={18} /> Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};