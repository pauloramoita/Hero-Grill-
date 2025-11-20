import React, { useState } from 'react';
import { Header } from './components/Header';
import { PedidosModule } from './components/pedidos/PedidosModule';
import { Controle043Module } from './components/controle043/Controle043Module';
import { BackupModule } from './components/BackupModule';
import { SaldoModule } from './components/saldo/SaldoModule';
import { FinanceiroModule } from './components/financeiro/FinanceiroModule'; // Old Financeiro
import { NovoFinanceiroModule } from './components/novo_financeiro/NovoFinanceiroModule'; // New Financeiro
import { DashboardModule } from './components/dashboard/DashboardModule';
import { AdminModule } from './components/admin/AdminModule';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { View, User } from './types';
import { ShoppingCart, ShieldCheck, DollarSign, Wallet, Database, Settings, KeyRound, Landmark, LayoutDashboard } from 'lucide-react';

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

    const hasPermission = (moduleId: string) => {
        if (user.isMaster) return true;
        if (!user.permissions || !user.permissions.modules) return false;
        return user.permissions.modules.includes(moduleId);
    };

    const menuItems: { id: View, label: string, icon: React.ReactNode, colorClass: string, description: string, requiredPerm: string }[] = [
        { id: 'dashboard', label: 'DASHBOARD', icon: <LayoutDashboard size={32} />, colorClass: 'text-blue-600 bg-blue-50', description: 'Visão Geral', requiredPerm: 'dashboard' },
        { id: 'pedidos', label: 'CADASTRO', icon: <ShoppingCart size={32} />, colorClass: 'text-heroRed bg-red-50', description: 'Pedidos e Produtos', requiredPerm: 'pedidos' },
        { id: 'controle043', label: 'CONTROLE 043', icon: <ShieldCheck size={32} />, colorClass: 'text-gray-800 bg-gray-100', description: 'Débitos e Créditos', requiredPerm: 'controle043' },
        { id: 'saldo', label: 'SALDO CONTAS', icon: <Wallet size={32} />, colorClass: 'text-emerald-600 bg-emerald-50', description: 'Balanço Mensal', requiredPerm: 'saldo' },
        { id: 'financeiro', label: 'ENTRADAS E SAÍDAS', icon: <DollarSign size={32} />, colorClass: 'text-orange-600 bg-orange-50', description: 'Fluxo Financeiro (Antigo)', requiredPerm: 'financeiro' }, 
        { id: 'novo_financeiro', label: 'FINANCEIRO', icon: <Landmark size={32} />, colorClass: 'text-green-700 bg-green-50', description: 'Caixa Diário', requiredPerm: 'novo_financeiro' }, 
        { id: 'backup', label: 'BACKUP', icon: <Database size={32} />, colorClass: 'text-indigo-600 bg-indigo-50', description: 'Segurança de Dados', requiredPerm: 'backup' },
        { id: 'admin', label: 'CONTROLE SISTEMA', icon: <Settings size={32} />, colorClass: 'text-gray-900 bg-gray-200', description: 'Usuários e Permissões', requiredPerm: 'admin' },
    ];

    const renderHome = () => (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
                {menuItems.map((item) => {
                    if (!hasPermission(item.requiredPerm)) return null;

                    return (
                    <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center gap-4 group h-56"
                    >
                        <div className={`p-4 rounded-full ${item.colorClass} group-hover:scale-110 transition-transform`}>
                            {item.icon}
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-black text-gray-800 tracking-tight">{item.label}</h3>
                            <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-wider">{item.description}</p>
                        </div>
                    </button>
                )})}
            </div>
            
             <div className="mt-12 text-center">
                <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="text-xs text-gray-400 hover:text-heroRed font-bold flex items-center justify-center gap-2 mx-auto transition-colors border border-gray-200 px-4 py-2 rounded-full hover:bg-white"
                >
                    <KeyRound size={14} /> ALTERAR MINHA SENHA
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Header onHomeClick={() => setCurrentView('home')} user={user} onLogout={handleLogout} />
            
            <main className="flex-grow">
                {currentView === 'home' && renderHome()}
                {currentView === 'dashboard' && hasPermission('dashboard') && <DashboardModule />}
                {currentView === 'pedidos' && hasPermission('pedidos') && <PedidosModule user={user} />}
                {currentView === 'controle043' && hasPermission('controle043') && <Controle043Module />}
                {currentView === 'saldo' && hasPermission('saldo') && <SaldoModule />}
                {currentView === 'financeiro' && hasPermission('financeiro') && <FinanceiroModule />}
                {currentView === 'novo_financeiro' && hasPermission('novo_financeiro') && <NovoFinanceiroModule user={user} />}
                {currentView === 'backup' && hasPermission('backup') && <BackupModule />}
                {currentView === 'admin' && hasPermission('admin') && <AdminModule />}
            </main>

            {currentView === 'home' && (
                <footer className="bg-white border-t border-gray-200 text-center py-6 mt-auto">
                    <p className="text-xs text-gray-400 font-medium">
                        &copy; {new Date().getFullYear()} Hero Grill System. Todos os direitos reservados.
                    </p>
                </footer>
            )}

             {showPasswordModal && user && (
                <ChangePasswordModal 
                    user={user} 
                    onClose={() => setShowPasswordModal(false)} 
                />
            )}
        </div>
    );
};

export default App;