
import React, { useState, useMemo } from 'react';
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

    // Determine if user is restricted to Dashboard only
    const isDashboardOnly = useMemo(() => {
        if (!user || user.isMaster) return false;
        const modules = user.permissions?.modules || [];
        // Check if Dashboard is the ONLY module permission (ignoring auxiliary permissions)
        const mainModules = modules.filter(m => !m.startsWith('view_') && !m.startsWith('config_'));
        return mainModules.length === 1 && mainModules.includes('dashboard');
    }, [user]);

    const handleLogin = (loggedUser: User) => {
        // Ensure permissions object exists
        const safeUser = {
            ...loggedUser,
            permissions: loggedUser.permissions || { modules: [], stores: [] }
        };
        
        setUser(safeUser);
        
        // Lógica de Redirecionamento IMEDIATO
        const modules = safeUser.permissions.modules || [];
        
        // Verifica se é um usuário restrito ao Dashboard (Investidor/Observador)
        // Se tiver apenas 'dashboard' como módulo principal, força a view 'dashboard'
        const mainModules = modules.filter(m => !m.startsWith('view_') && !m.startsWith('config_'));
        const isRestricted = mainModules.length === 1 && mainModules[0] === 'dashboard' && !safeUser.isMaster;

        if (isRestricted) {
            setCurrentView('dashboard');
        } else {
            setCurrentView('home');
        }
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
        { id: 'dashboard', label: 'Dashboard Gerencial', icon: <LayoutDashboard size={32} />, colorClass: 'bg-gray-800 text-white', description: 'Visão geral e indicadores', requiredPerm: 'dashboard' },
        { id: 'pedidos', label: 'Cadastro de Pedidos', icon: <ShoppingCart size={32} />, colorClass: 'bg-heroRed text-white', description: 'Gerenciar pedidos e produtos', requiredPerm: 'pedidos' },
        { id: 'novo_financeiro', label: 'Financeiro (Caixa)', icon: <Landmark size={32} />, colorClass: 'bg-blue-600 text-white', description: 'Lançamentos e Fluxo de Caixa', requiredPerm: 'novo_financeiro' },
        { id: 'controle043', label: 'Controle 043', icon: <ShieldCheck size={32} />, colorClass: 'bg-gray-700 text-white', description: 'Lançamentos de conta 043', requiredPerm: 'controle043' },
        { id: 'saldo', label: 'Saldo de Contas', icon: <Wallet size={32} />, colorClass: 'bg-gray-700 text-white', description: 'Balanço mensal de contas', requiredPerm: 'saldo' },
        { id: 'financeiro', label: 'Entradas e Saídas', icon: <DollarSign size={32} />, colorClass: 'bg-gray-700 text-white', description: 'Registro financeiro consolidado (Antigo)', requiredPerm: 'financeiro' },
        { id: 'backup', label: 'Backup e Dados', icon: <Database size={32} />, colorClass: 'bg-gray-600 text-white', description: 'Salvar e restaurar dados', requiredPerm: 'backup' },
        { id: 'admin', label: 'Administração', icon: <Settings size={32} />, colorClass: 'bg-black text-white', description: 'Gerenciar usuários e acessos', requiredPerm: 'admin' },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <Header 
                isHome={currentView === 'home'}
                onHomeClick={() => !isDashboardOnly && setCurrentView('home')} 
                user={user} 
                onLogout={handleLogout} 
                disableNavigation={isDashboardOnly}
            />

            {/* Main Content */}
            <main className="flex-grow">
                {/* Se a view for HOME e NÃO for restrito, mostra o menu.
                    Se for restrito (isDashboardOnly), ele nunca deve cair aqui, mas se cair, não mostra nada. */}
                {currentView === 'home' && !isDashboardOnly ? (
                    <div className="max-w-7xl mx-auto p-6 animate-fadeIn">
                        <div className="mb-8 text-center">
                            <h1 className="text-3xl font-black text-heroBlack uppercase italic tracking-tighter mb-2">Painel Principal</h1>
                            <p className="text-gray-500">Selecione um módulo para começar</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {menuItems.filter(item => hasPermission(item.requiredPerm)).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentView(item.id)}
                                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group text-left border border-gray-100 hover:-translate-y-1"
                                >
                                    <div className={`p-6 flex items-start gap-4`}>
                                        <div className={`p-4 rounded-lg shadow-sm ${item.colorClass} group-hover:scale-110 transition-transform duration-300`}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800 group-hover:text-heroRed transition-colors">{item.label}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 mt-auto">
                                        <div className={`h-full w-0 group-hover:w-full transition-all duration-500 ${item.colorClass.split(' ')[0]}`}></div>
                                    </div>
                                </button>
                            ))}
                            {menuItems.filter(item => hasPermission(item.requiredPerm)).length === 0 && (
                                <div className="col-span-full text-center p-10 bg-white rounded-lg shadow">
                                    <p className="text-gray-400 font-bold">Nenhum módulo liberado para seu perfil.</p>
                                    <p className="text-xs text-gray-400 mt-2">Contate o administrador.</p>
                                </div>
                            )}
                        </div>

                         <div className="mt-12 flex justify-center">
                            <button 
                                onClick={() => setShowPasswordModal(true)}
                                className="text-gray-400 hover:text-gray-600 flex items-center gap-2 text-sm font-bold py-2 px-4 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <KeyRound size={16} /> Alterar Minha Senha
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-6">
                        {/* Renderiza o módulo correspondente */}
                        {currentView === 'dashboard' && <DashboardModule user={user} />}
                        {currentView === 'pedidos' && <PedidosModule user={user} />}
                        {currentView === 'controle043' && <Controle043Module user={user} />}
                        {currentView === 'saldo' && <SaldoModule user={user} />}
                        {currentView === 'financeiro' && <FinanceiroModule />}
                        {currentView === 'novo_financeiro' && <NovoFinanceiroModule user={user} />}
                        {currentView === 'backup' && <BackupModule />}
                        {currentView === 'admin' && <AdminModule />}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t py-6 text-center text-gray-400 text-sm">
                <p>&copy; {new Date().getFullYear()} Hero Grill Manager. Todos os direitos reservados.</p>
            </footer>

            {showPasswordModal && <ChangePasswordModal user={user} onClose={() => setShowPasswordModal(false)} />}
        </div>
    );
};

export default App;
