
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PedidosModule } from './components/pedidos/PedidosModule';
import { Controle043Module } from './components/controle043/Controle043Module';
import { BackupModule } from './components/BackupModule';
import { SaldoModule } from './components/saldo/SaldoModule';
import { FinanceiroModule } from './components/financeiro/FinanceiroModule'; // Old Financeiro
import { NovoFinanceiroModule } from './components/novo_financeiro/NovoFinanceiroModule'; // New Financeiro
import { AdminModule } from './components/admin/AdminModule';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { View, User } from './types';
import { ShoppingCart, ShieldCheck, DollarSign, Wallet, Database, Grid, LogOut, Settings, KeyRound, Landmark } from 'lucide-react';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState<View>('home');
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const handleLogin = (loggedUser: User) => {
        setUser(loggedUser);
        setCurrentView('home');
    };

    const handleLogout = () => {
        setUser(null);
        setCurrentView('home');
    };

    if (!user) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    // Filtra módulos baseados nas permissões do usuário
    const hasPermission = (moduleId: string) => {
        if (user.isMaster) return true;
        return user.permissions.modules?.includes(moduleId);
    };

    const menuItems: { id: View, label: string, icon: React.ReactNode, color: string, disabled: boolean, requiredPerm: string }[] = [
        { id: 'pedidos', label: 'Cadastro', icon: <ShoppingCart size={48} />, color: 'bg-heroRed', disabled: false, requiredPerm: 'pedidos' },
        { id: 'controle043', label: 'Controle 043', icon: <ShieldCheck size={48} />, color: 'bg-heroBlack', disabled: false, requiredPerm: 'controle043' },
        { id: 'saldo', label: 'Saldo Contas', icon: <Wallet size={48} />, color: 'bg-gray-800', disabled: false, requiredPerm: 'saldo' },
        { id: 'financeiro', label: 'Entradas e Saídas', icon: <DollarSign size={48} />, color: 'bg-gray-700', disabled: false, requiredPerm: 'financeiro' }, // Renamed old module
        { id: 'novo_financeiro', label: 'Financeiro', icon: <Landmark size={48} />, color: 'bg-green-700', disabled: false, requiredPerm: 'novo_financeiro' }, // New Module
        { id: 'backup', label: 'Backup', icon: <Database size={48} />, color: 'bg-gray-700', disabled: false, requiredPerm: 'backup' },
        { id: 'admin', label: 'Administração', icon: <Settings size={48} />, color: 'bg-gray-900', disabled: false, requiredPerm: 'admin' },
    ];

    const renderHome = () => (
        <div className="max-w-6xl mx-auto p-8">
            <div className="text-center mb-12 animate-fadeIn">
                <h2 className="text-4xl font-bold text-gray-800 mb-2">Olá, {user.name}</h2>
                <p className="text-gray-500">Selecione um módulo para começar</p>
                <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="mt-3 text-sm text-gray-400 hover:text-heroRed underline decoration-dotted flex items-center justify-center gap-1 mx-auto transition-colors"
                >
                    <KeyRound size={14} /> Alterar minha senha de acesso
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {menuItems.map((item) => {
                    if (!hasPermission(item.requiredPerm)) return null;

                    return (
                    <button
                        key={item.id}
                        onClick={() => !item.disabled && setCurrentView(item.id)}
                        disabled={item.disabled}
                        className={`
                            relative overflow-hidden h-64 rounded-xl shadow-xl transition-all duration-300 
                            flex flex-col items-center justify-center group
                            ${item.disabled ? 'opacity-60 cursor-not-allowed grayscale' : 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl'}
                            bg-white
                        `}
                    >
                        <div className={`absolute inset-0 ${item.color} opacity-90 transition-opacity group-hover:opacity-100`}></div>
                        <div className="relative z-10 text-white flex flex-col items-center">
                            <div className="mb-4 p-4 bg-white/20 rounded-full backdrop-blur-sm">
                                {item.icon}
                            </div>
                            <span className="text-2xl font-bold uppercase tracking-wider">{item.label}</span>
                            {item.disabled && <span className="text-xs mt-2 bg-black/50 px-2 py-1 rounded">Em Construção</span>}
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
                    </button>
                )})}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="relative">
                <Header onHomeClick={() => setCurrentView('home')} />
                <div className="absolute top-6 right-6 flex items-center gap-4">
                    <div className="hidden md:flex items-center">
                         <button 
                            onClick={() => setShowPasswordModal(true)}
                            className="text-gray-400 hover:text-gray-600 text-xs font-bold mr-4 transition-colors"
                        >
                            SENHA
                        </button>
                        <div className="h-4 w-px bg-gray-300 mr-4"></div>
                    </div>
                    <button 
                        onClick={handleLogout} 
                        className="text-gray-500 hover:text-heroRed flex items-center gap-2 text-sm font-bold transition-colors bg-white/80 px-3 py-1 rounded hover:shadow-sm"
                        title="Sair do sistema"
                    >
                        <LogOut size={18} /> SAIR
                    </button>
                </div>
            </div>
            
            <main className="flex-grow py-8">
                {currentView === 'home' && renderHome()}
                {currentView === 'pedidos' && hasPermission('pedidos') && <PedidosModule user={user} />}
                {currentView === 'controle043' && hasPermission('controle043') && <Controle043Module />}
                {currentView === 'saldo' && hasPermission('saldo') && <SaldoModule />}
                {currentView === 'financeiro' && hasPermission('financeiro') && <FinanceiroModule />}
                {currentView === 'novo_financeiro' && hasPermission('novo_financeiro') && <NovoFinanceiroModule user={user} />}
                {currentView === 'backup' && hasPermission('backup') && <BackupModule />}
                {currentView === 'admin' && hasPermission('admin') && <AdminModule />}
            </main>

            <footer className="bg-heroBlack text-white text-center py-6 mt-auto">
                <p className="text-sm opacity-50">
                    &copy; {new Date().getFullYear()} Hero Grill System. Todos os direitos reservados. 
                    <span className="ml-2 text-xs bg-green-900 px-2 py-1 rounded-full text-green-100">v2.2.0 (ACL+)</span>
                </p>
            </footer>

             {showPasswordModal && (
                <ChangePasswordModal 
                    user={user} 
                    onClose={() => setShowPasswordModal(false)} 
                />
            )}
        </div>
    );
};

export default App;
