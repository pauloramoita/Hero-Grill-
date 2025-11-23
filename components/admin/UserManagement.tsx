


import React, { useState, useEffect } from 'react';
import { User, AppData } from '../../types';
import { getUsers, saveUser, deleteUser, getAppData } from '../../services/storageService';
import { Save, Trash2, UserPlus, CheckSquare, Square, Loader2, Shield, AlertCircle, Users, Eye } from 'lucide-react';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [appData, setAppData] = useState<AppData>({ stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] });
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
        { id: 'dashboard', label: '📊 Dashboard (Visão Geral)' },
        { id: 'pedidos', label: 'Pedidos (Cadastro)' },
        { id: 'estoque', label: '🥩 Estoque de Carnes' },
        { id: 'config_campos', label: '⚙️ Config. Produtos (Campos!)' },
        { id: 'controle043', label: 'Controle 043' },
        { id: 'emprestimos', label: '💸 Controle Empréstimos' },
        { id: 'saldo', label: 'Saldo Contas' },
        { id: 'financeiro', label: 'Entradas e Saídas (Antigo)' },
        { id: 'novo_financeiro', label: 'Financeiro (Caixa/Lançamentos)' },
        { id: 'config_financeiro_campos', label: '⚙️ Config. Contas (Financeiro)' },
        { id: 'view_balances', label: '💰 Permissão: Visualizar Saldos' },
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
        setPassword(user.password || ''); 
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

    const applyProfile = (type: 'gerente' | 'operador' | 'observador') => {
        if (type === 'gerente') {
            setSelectedModules([
                'dashboard',
                'pedidos', 'config_campos', 'estoque',
                'controle043', 'emprestimos',
                'saldo', 
                'financeiro', 
                'novo_financeiro', 'config_financeiro_campos', 'view_balances'
            ]);
            setSelectedStores(appData.stores); 
        } else if (type === 'operador') {
            setSelectedModules([
                'pedidos', 
                'estoque',
                'novo_financeiro'
            ]);
            setSelectedStores([]); 
        } else if (type === 'observador') {
            // Observador (Investidor): Apenas Dashboard e Acesso a TODAS as lojas (array vazio)
            // O App.tsx agora detecta isso e redireciona direto para o Dashboard
            setSelectedModules(['dashboard']);
            setSelectedStores([]); 
        }
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
                id: editingId || '', 
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
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm text-blue-800 flex items-center gap-3">
                 <AlertCircle size={20} />
                 <div>
                    <strong>Gestão de Perfis:</strong> Utilize os botões de "Perfil Rápido" para configurar permissões padrão.
                    <ul className="list-disc ml-4 mt-1">
                        <li><strong>Gerente:</strong> Acesso total operacional.</li>
                        <li><strong>Operador:</strong> Apenas lançamentos básicos (Pedidos, Estoque, Financeiro).</li>
                        <li><strong>Observador (Investidor):</strong> Acesso exclusivo ao Dashboard (Todas as Lojas).</li>
                    </ul>
                 </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-6 border-b pb-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-heroBlack p-2 rounded text-white"><UserPlus size={24} /></div>
                        <h2 className="text-2xl font-bold text-gray-800">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-500 uppercase self-center mr-2">Perfil Rápido:</span>
                        <button type="button" onClick={() => applyProfile('gerente')} className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-purple-700 flex items-center gap-1 transition-colors"><Users size={12}/> Gerente</button>
                        <button type="button" onClick={() => applyProfile('operador')} className="bg-gray-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-gray-600 flex items-center gap-1 transition-colors"><Users size={12}/> Operador</button>
                        <button type="button" onClick={() => applyProfile('observador')} className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-600 flex items-center gap-1 transition-colors"><Eye size={12}/> Observador</button>
                    </div>
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
                        <div className="bg-gray-50 p-4 rounded border">
                            <h3 className="font-bold text-heroBlack mb-3 flex items-center gap-2"><Shield size={16}/> Permissões de Acesso</h3>
                            <div className="space-y-2">
                                {modulesList.map(m => (
                                    <div key={m.id} onClick={() => toggleModule(m.id)} className={`flex items-center gap-3 cursor-pointer hover:bg-gray-200 p-2 rounded transition-colors ${m.id.startsWith('config') || m.id.startsWith('view') ? 'bg-yellow-50 border border-yellow-100' : m.id === 'dashboard' ? 'bg-blue-50 border border-blue-100' : ''}`}>
                                        {selectedModules.includes(m.id) ? <CheckSquare className="text-green-600" /> : <Square className="text-gray-400" />}
                                        <span className={selectedModules.includes(m.id) ? 'font-bold text-gray-800' : 'text-gray-600'}>{m.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                         <div className="bg-gray-50 p-4 rounded border">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-heroBlack flex items-center gap-2"><Shield size={16}/> Acesso a Lojas</h3>
                                <span className="text-[10px] text-gray-400 uppercase font-bold">Nenhuma selecionada = Acesso a Todas</span>
                            </div>
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

            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Login</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Perfil</th>
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
                                        {user.permissions.modules?.includes('admin') ? (
                                            <span className="text-xs bg-black text-white px-2 py-1 rounded font-bold">ADMIN</span>
                                        ) : user.permissions.modules?.length === 1 && user.permissions.modules?.includes('dashboard') ? (
                                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-bold">OBSERVADOR</span>
                                        ) : user.permissions.modules?.includes('config_campos') && user.permissions.modules?.includes('view_balances') ? (
                                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-bold border border-purple-200">GERENTE</span>
                                        ) : (
                                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold border border-blue-100">OPERADOR</span>
                                        )}
                                        
                                        {(!user.permissions.stores || user.permissions.stores.length === 0) && !user.isMaster && (
                                            <span className="text-[10px] text-gray-400 ml-2 self-center">(Todas Lojas)</span>
                                        )}
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
