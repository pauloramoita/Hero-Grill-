
import React, { useState, useEffect } from 'react';
import { User, AppData } from '../../types';
import { getUsers, saveUser, deleteUser, getAppData } from '../../services/storageService';
import { Save, Trash2, UserPlus, CheckSquare, Square, Loader2, Shield, AlertCircle } from 'lucide-react';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Permission State
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [selectedStores, setSelectedStores] = useState<string[]>([]);

    const modulesList = [
        { id: 'pedidos', label: 'Pedidos' },
        { id: 'controle043', label: 'Controle 043' },
        { id: 'saldo', label: 'Saldo Contas' },
        { id: 'financeiro', label: 'Financeiro' },
        { id: 'backup', label: 'Backup' },
        { id: 'admin', label: 'Administração (Admin)' },
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [u, d] = await Promise.all([getUsers(), getAppData()]);
        setUsers(u);
        setAppData(d);
        setLoading(false);
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setUsername('');
        setPassword('');
        setSelectedModules([]);
        setSelectedStores([]);
    };

    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setName(user.name);
        setUsername(user.username);
        setPassword(user.password || ''); // Password comes back for simple auth, secure in real app
        setSelectedModules(user.permissions.modules || []);
        setSelectedStores(user.permissions.stores || []);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Excluir este usuário?')) {
            await deleteUser(id);
            loadData();
        }
    };

    const toggleModule = (modId: string) => {
        setSelectedModules(prev => 
            prev.includes(modId) ? prev.filter(m => m !== modId) : [...prev, modId]
        );
    };

    const toggleStore = (storeName: string) => {
        setSelectedStores(prev => 
            prev.includes(storeName) ? prev.filter(s => s !== storeName) : [...prev, storeName]
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !username || !password) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        setSaving(true);
        try {
            const userData: User = {
                id: editingId || '', // DB handles ID on insert
                name,
                username,
                password,
                permissions: {
                    modules: selectedModules,
                    stores: selectedStores
                }
            };

            await saveUser(userData);
            resetForm();
            await loadData();
            alert('Usuário salvo com sucesso!');
        } catch (err: any) {
            let msg = err.message;
            if (msg.includes('system_users') && msg.includes('does not exist')) {
                msg = "ERRO CRÍTICO: A tabela de usuários não existe no banco de dados.\n\nVá no módulo 'Backup' e clique em 'Ver SQL de Instalação' para corrigir isso no Supabase.";
            }
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-8">
            {/* Info Box for Admin */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm text-blue-800 flex items-center gap-3">
                 <AlertCircle size={20} />
                 <div>
                    <strong>Dica de Administração:</strong> Certifique-se de que o banco de dados está atualizado. 
                    Se encontrar erros ao salvar, verifique o módulo de Backup.
                 </div>
            </div>

            {/* Form Card */}
            <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-6 border-b pb-2">
                    <div className="bg-heroBlack p-2 rounded text-white"><UserPlus size={24} /></div>
                    <h2 className="text-2xl font-bold text-gray-800">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                </div>
                
                <form onSubmit={handleSave}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border rounded focus:ring-2 focus:ring-heroBlack outline-none" placeholder="Ex: João Silva" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Login (Usuário)</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded focus:ring-2 focus:ring-heroBlack outline-none" placeholder="Ex: joao.silva" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
                            <input type="text" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded focus:ring-2 focus:ring-heroBlack outline-none" placeholder="••••••" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Módulos */}
                        <div className="bg-gray-50 p-4 rounded border">
                            <h3 className="font-bold text-heroBlack mb-3 flex items-center gap-2"><Shield size={16}/> Permissões de Módulos</h3>
                            <div className="space-y-2">
                                {modulesList.map(m => (
                                    <div key={m.id} onClick={() => toggleModule(m.id)} className="flex items-center gap-3 cursor-pointer hover:bg-gray-200 p-2 rounded transition-colors">
                                        {selectedModules.includes(m.id) ? <CheckSquare className="text-green-600" /> : <Square className="text-gray-400" />}
                                        <span className={selectedModules.includes(m.id) ? 'font-bold text-gray-800' : 'text-gray-600'}>{m.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                         {/* Lojas */}
                         <div className="bg-gray-50 p-4 rounded border">
                            <h3 className="font-bold text-heroBlack mb-3 flex items-center gap-2"><Shield size={16}/> Acesso a Lojas</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {appData.stores.length === 0 && <p className="text-gray-400 text-sm italic">Nenhuma loja cadastrada no sistema.</p>}
                                {appData.stores.map(store => (
                                    <div key={store} onClick={() => toggleStore(store)} className="flex items-center gap-3 cursor-pointer hover:bg-gray-200 p-2 rounded transition-colors">
                                        {selectedStores.includes(store) ? <CheckSquare className="text-blue-600" /> : <Square className="text-gray-400" />}
                                        <span className={selectedStores.includes(store) ? 'font-bold text-gray-800' : 'text-gray-600'}>{store}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        {editingId && <button type="button" onClick={resetForm} className="px-6 py-3 rounded border border-gray-300 text-gray-600 font-bold hover:bg-gray-50">Cancelar</button>}
                        <button disabled={saving} type="submit" className="bg-heroBlack text-white px-8 py-3 rounded font-bold hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50 shadow-lg">
                            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} {editingId ? 'Atualizar Usuário' : 'Cadastrar Usuário'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Login</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Módulos</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono bg-gray-50">{user.username}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {user.permissions.modules?.map(m => (
                                            <span key={m} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-200">{m}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-800 p-2"><Save size={18}/></button>
                                    <button onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum usuário cadastrado (além do Admin Mestre).</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
