
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getAppData, 
    getFinancialAccounts, 
    saveDailyTransaction, 
    formatCurrency, 
    getTodayLocalISO 
} from '../../services/storageService';
import { AppData, FinancialAccount, DailyTransaction, User } from '../../types';
import { X, Save, DollarSign, Repeat, CalendarClock, TrendingDown, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';

interface NovoLancamentoModalProps {
    user?: User;
    onClose: () => void;
    onSave: () => void;
}

export const NovoLancamentoModal: React.FC<NovoLancamentoModalProps> = ({ user, onClose, onSave }) => {
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

    // Form States (Mirrors LancamentosFinanceiro)
    const [date, setDate] = useState(getTodayLocalISO()); 
    const [paymentDate, setPaymentDate] = useState(getTodayLocalISO()); 
    const [store, setStore] = useState('');
    const [type, setType] = useState<'Receita' | 'Despesa' | 'Transferência'>('Despesa'); 
    const [accountId, setAccountId] = useState('');
    
    const [destinationStore, setDestinationStore] = useState('');
    const [destinationAccountId, setDestinationAccountId] = useState('');

    const [paymentMethod, setPaymentMethod] = useState('Boleto'); 
    const [product, setProduct] = useState('');
    const [category, setCategory] = useState('');
    const [classification, setClassification] = useState(''); 
    const [supplier, setSupplier] = useState('');
    const [value, setValue] = useState(0);
    const [status, setStatus] = useState<'Pago' | 'Pendente'>('Pendente');
    const [description, setDescription] = useState(''); 

    const [recurrenceType, setRecurrenceType] = useState<'none' | 'installment' | 'fixed'>('none');
    const [recurrenceCount, setRecurrenceCount] = useState<number>(2);

    useEffect(() => {
        const load = async () => {
            const [d, acc] = await Promise.all([getAppData(), getFinancialAccounts()]);
            setAppData(d);
            setAccounts(acc);
            setLoadingData(false);
        };
        load();
    }, []);

    // Determine available stores based on user permissions
    const availableStores = useMemo(() => {
        if (!user) return appData.stores;
        if (user.isMaster) return appData.stores;
        if (user.permissions.stores && user.permissions.stores.length > 0) {
            return appData.stores.filter(s => user.permissions.stores.includes(s));
        }
        return appData.stores;
    }, [appData.stores, user]);

    // Auto-select store
    useEffect(() => {
        if (availableStores.length === 1 && !store) {
            setStore(availableStores[0]);
        }
    }, [availableStores]);

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setValue(floatValue);
    };

    const addMonths = (dateStr: string, months: number): string => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        dateObj.setMonth(dateObj.getMonth() + months);
        
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
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

        if (recurrenceType !== 'none' && recurrenceCount < 2) {
            alert('Para repetição/parcelamento, a quantidade mínima é 2.');
            return;
        }

        setSaving(true);
        try {
            const transactionsToCreate = [];
            const loopCount = recurrenceType === 'none' ? 1 : recurrenceCount;

            for (let i = 0; i < loopCount; i++) {
                const currentDueDate = i === 0 ? date : addMonths(date, i);
                
                let currentDesc = description;
                if (recurrenceType === 'installment') {
                    currentDesc = description ? `${description} (${i + 1}/${loopCount})` : `Parcela (${i + 1}/${loopCount})`;
                }

                const currentStatus = i === 0 ? status : 'Pendente';
                const currentPaymentDate = (i === 0 && status === 'Pago') ? paymentDate : null;

                transactionsToCreate.push({
                    id: '',
                    date: currentDueDate,
                    paymentDate: currentPaymentDate,
                    store,
                    type,
                    accountId,
                    destinationStore: type === 'Transferência' ? destinationStore : undefined,
                    destinationAccountId: type === 'Transferência' ? destinationAccountId : undefined,
                    paymentMethod,
                    product: type !== 'Transferência' ? product : '',
                    category: type !== 'Transferência' ? category : '',
                    supplier: type !== 'Transferência' ? supplier : '',
                    classification: type !== 'Transferência' ? classification : '',
                    value,
                    status: currentStatus,
                    description: currentDesc,
                    origin: 'manual' as const
                });
            }

            await Promise.all(transactionsToCreate.map(t => saveDailyTransaction(t)));
            alert(loopCount > 1 ? `${loopCount} Lançamentos Gerados!` : 'Lançamento Salvo!');
            onSave();
        } catch (err: any) {
            let msg = err.message;
            if (msg.includes('column') || msg.includes('schema cache') || msg.includes('does not exist')) {
                alert(`ERRO DE BANCO DE DADOS:\n\n${msg}\n\nSOLUÇÃO: Vá ao módulo 'Backup', clique em 'Ver SQL de Instalação' e execute o comando no Supabase para criar as colunas ou tabelas faltantes.`);
            } else {
                alert('Erro ao salvar: ' + msg);
            }
        } finally {
            setSaving(false);
        }
    };

    const isSingleStore = availableStores.length === 1;

    // Filter accounts based on selected store
    const filteredAccounts = accounts.filter(a => !store || a.store === store);
    const filteredDestAccounts = accounts.filter(a => !destinationStore || a.store === destinationStore);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fadeIn">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-slate-100 gap-4 bg-slate-50 sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <DollarSign className="text-heroRed" />
                            Novo Lançamento
                        </h2>
                        <p className="text-slate-400 text-xs mt-1 font-medium">Preencha os dados para registrar a movimentação.</p>
                    </div>
                    <button type="button" onClick={onClose} className="absolute top-4 right-4 md:static text-slate-400 hover:text-slate-700 transition-colors bg-white p-2 rounded-full shadow-sm border border-slate-200">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Tipo e Valor */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo de Operação</label>
                            <select 
                                value={type} 
                                onChange={e => {
                                    const newType = e.target.value as any;
                                    setType(newType);
                                    if (newType === 'Transferência') setPaymentMethod('Transferência bancária');
                                }} 
                                className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed"
                            >
                                <option value="Despesa">🔴 Despesa (Saída)</option>
                                <option value="Receita">🟢 Receita (Entrada)</option>
                                <option value="Transferência">🟣 Transferência</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                                Valor {recurrenceType === 'installment' ? 'da Parcela' : ''} (R$)
                            </label>
                            <input 
                                type="text" 
                                value={formatCurrency(value)} 
                                onChange={handleCurrencyChange} 
                                className="w-full p-3 border border-slate-300 rounded-lg text-right font-black text-lg text-slate-800 focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Método Pagamento</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none">
                                <option value="Boleto">Boleto</option>
                                <option value="PiX">PiX</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Cartão">Cartão</option>
                                <option value="Transferência bancária">Transferência bancária</option>
                            </select>
                        </div>
                    </div>

                    {/* Origem / Destino / Detalhes */}
                    {type === 'Transferência' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2 flex items-center gap-2">
                                    <TrendingDown size={16} className="text-red-500"/> Origem (Sai de)
                                </h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Loja Origem</label>
                                    <select 
                                        value={store} 
                                        onChange={e => setStore(e.target.value)} 
                                        className={`w-full p-2.5 border border-slate-300 rounded-lg ${isSingleStore ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                                        disabled={isSingleStore}
                                    >
                                        <option value="">Selecione...</option>
                                        {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Conta Origem</label>
                                    <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                                        <option value="">Selecione...</option>
                                        {filteredAccounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-emerald-500"/> Destino (Vai para)
                                </h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Loja Destino</label>
                                    <select value={destinationStore} onChange={e => setDestinationStore(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                                        <option value="">Selecione...</option>
                                        {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Conta Destino</label>
                                    <select value={destinationAccountId} onChange={e => setDestinationAccountId(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                                        <option value="">Selecione...</option>
                                        {filteredDestAccounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Loja</label>
                                <select 
                                    value={store} 
                                    onChange={e => setStore(e.target.value)} 
                                    className={`w-full p-3 border border-slate-300 rounded-lg ${isSingleStore ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                                    disabled={isSingleStore}
                                >
                                    <option value="">Selecione...</option>
                                    {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Conta <span className="text-red-500">*</span></label>
                                <select value={accountId} onChange={e => setAccountId(e.target.value)} className={`w-full p-3 border rounded-lg bg-white ${!accountId ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}>
                                    <option value="">Selecione a Conta...</option>
                                    {filteredAccounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoria</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white">
                                    <option value="">Selecione...</option>
                                    {appData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fornecedor (Opcional)</label>
                                <select value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white">
                                    <option value="">Selecione...</option>
                                    {appData.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Produto (Opcional)</label>
                                <select value={product} onChange={e => setProduct(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white">
                                    <option value="">Selecione...</option>
                                    {appData.products.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Classificação</label>
                                <select value={classification} onChange={e => setClassification(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white">
                                    <option value="">Selecione...</option>
                                    {appData.types.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data Vencimento</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data Pagamento</label>
                            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"/>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => { setStatus('Pago'); if(!paymentDate) setPaymentDate(new Date().toISOString().split('T')[0]); }}
                                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg border ${status === 'Pago' ? 'bg-green-600 text-white shadow-md' : 'bg-white border-slate-300 text-slate-500'}`}
                                >
                                    PAGO
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => { setStatus('Pendente'); setPaymentDate(''); }}
                                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg border ${status === 'Pendente' ? 'bg-amber-500 text-white shadow-md' : 'bg-white border-slate-300 text-slate-500'}`}
                                >
                                    PENDENTE
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição</label>
                        <input 
                            type="text" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white placeholder-slate-400"
                            placeholder="Ex: Pagamento de conta de luz ref. Janeiro"
                            maxLength={100}
                        />
                    </div>

                    {/* Repetição */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex items-center gap-2 text-purple-800 font-bold min-w-fit">
                                <Repeat size={18} />
                                <span className="text-sm">Repetição:</span>
                            </div>
                            <div className="flex gap-2 flex-1">
                                <button type="button" onClick={() => setRecurrenceType('none')} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${recurrenceType === 'none' ? 'bg-purple-700 text-white' : 'bg-white text-purple-700 border-purple-200'}`}>Único</button>
                                <button type="button" onClick={() => { setRecurrenceType('installment'); setRecurrenceCount(2); }} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${recurrenceType === 'installment' ? 'bg-purple-700 text-white' : 'bg-white text-purple-700 border-purple-200'}`}>Parcelado (x)</button>
                                <button type="button" onClick={() => { setRecurrenceType('fixed'); setRecurrenceCount(12); }} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${recurrenceType === 'fixed' ? 'bg-purple-700 text-white' : 'bg-white text-purple-700 border-purple-200'}`}>Fixo (Mensal)</button>
                            </div>
                            {recurrenceType !== 'none' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-purple-800">{recurrenceType === 'installment' ? 'Qtd:' : 'Meses:'}</span>
                                    <input type="number" min="2" max="120" value={recurrenceCount} onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 2)} className="w-16 p-1 text-center border border-purple-300 rounded font-bold text-purple-900 focus:outline-none"/>
                                </div>
                            )}
                        </div>
                        {recurrenceType !== 'none' && <p className="text-xs text-purple-600 mt-2 flex items-center gap-1"><CalendarClock size={12}/> O sistema gerará {recurrenceCount} lançamentos automaticamente.</p>}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" disabled={saving} className="bg-heroBlack text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 flex items-center gap-2 shadow-lg transition-all disabled:opacity-70">
                            {saving ? <Loader2 className="animate-spin"/> : <Save size={20} />}
                            {saving ? 'Processando...' : `Lançar ${recurrenceType !== 'none' ? 'Múltiplos' : ''}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
