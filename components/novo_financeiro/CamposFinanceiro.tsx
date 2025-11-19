

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Edit, Save, X } from 'lucide-react';
import { getFinancialAccounts, saveFinancialAccount, updateFinancialAccount, deleteFinancialAccount, getAppData, formatCurrency } from '../../services/storageService';
import { FinancialAccount, AppData } from '../../types';

export const CamposFinanceiro: React.FC = () => {
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
    const [loading, setLoading] = useState(true);

    // Form
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [store, setStore] = useState('');
    const [initialBalance, setInitialBalance] = useState(0);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        const [acc, data] = await Promise.all([getFinancialAccounts(), getAppData()]);
        setAccounts(acc);
        setAppData(data);
        setLoading(false);
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const floatValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setInitialBalance(floatValue);
    };

    const handleEdit = (acc: FinancialAccount) => {
        setEditingId(acc.id);
        setName(acc.name);
        setStore(acc.store);
        setInitialBalance(acc.initialBalance);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setName('');
        setStore('');
        setInitialBalance(0);
    };

    const handleSave = async () => {
        if (!name || !store) {
            alert('Preencha o nome da conta e selecione a loja.');
            return;
        }

        try {
            if (editingId) {
                await updateFinancialAccount({
                    id: editingId,
                    name,
                    store,
                    initialBalance
                });
                setEditingId(null);
            } else {
                await saveFinancialAccount({
                    id: '', // Gerado pelo banco
                    name,
                    store,
                    initialBalance
                });
            }
            
            setName('');
            setStore('');
            setInitialBalance(0);
            load(); // Recarrega lista
        } catch (err: any) {
            alert('Erro ao salvar conta: ' + err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Deseja excluir esta conta?')) {
            await deleteFinancialAccount(id);
            setAccounts(prev => prev.filter(a => a.id !== id));
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <div className={`bg-white p-6 rounded-lg shadow-md border ${editingId ? 'border-yellow-400 ring-1 ring-yellow-200' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2 ${editingId ? 'text-yellow-700' : 'text-green-700'}`}>
                    {editingId ? <><Edit size={20}/> Editar Conta</> : <><Plus size={20}/> Cadastrar Nova Conta</>}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Loja</label>
                        <select value={store} onChange={e => setStore(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">Selecione...</option>
                            {appData.stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Nome da Conta (Ex: Banco X)</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full p-2 border rounded"
                            placeholder="Identificação da conta"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Saldo Inicial</label>
                        <input 
                            type="text" 
                            value={formatCurrency(initialBalance)} 
                            onChange={handleCurrencyChange} 
                            className="w-full p-2 border rounded text-right"
                        />
                    </div>
                </div>
                
                <div className="flex justify-end gap-2">
                    {editingId && (
                        <button onClick={handleCancelEdit} className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-300">
                            <X size={18} /> Cancelar
                        </button>
                    )}
                    <button onClick={handleSave} className={`${editingId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded font-bold flex items-center gap-2 transition-colors`}>
                        {editingId ? <><Save size={18} /> Salvar Alterações</> : <><Plus size={18} /> Adicionar Conta</>}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Loja</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Conta</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Saldo Inicial</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={4} className="p-4 text-center"><Loader2 className="animate-spin mx-auto"/></td></tr>
                        ) : accounts.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-500">Nenhuma conta cadastrada.</td></tr>
                        ) : (
                            accounts.map(acc => (
                                <tr key={acc.id} className={`hover:bg-gray-50 ${editingId === acc.id ? 'bg-yellow-50' : ''}`}>
                                    <td className="px-6 py-2 text-sm font-bold text-gray-800">{acc.store}</td>
                                    <td className="px-6 py-2 text-sm text-gray-600">{acc.name}</td>
                                    <td className="px-6 py-2 text-sm text-right font-mono">{formatCurrency(acc.initialBalance)}</td>
                                    <td className="px-6 py-2 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(acc)} className="text-blue-600 hover:text-blue-800 p-1" title="Editar">
                                                <Edit size={16}/>
                                            </button>
                                            <button onClick={() => handleDelete(acc.id)} className="text-red-500 hover:text-red-700 p-1" title="Excluir">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};