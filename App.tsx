
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { PedidosModule } from './components/pedidos/PedidosModule';
import { Controle043Module } from './components/controle043/Controle043Module';
import { BackupModule } from './components/BackupModule';
import { SaldoModule } from './components/saldo/SaldoModule';
import { FinanceiroModule } from './components/financeiro/FinanceiroModule'; // Old Financeiro
import { NovoFinanceiroModule } from './components/novo_financeiro/NovoFinanceiroModule'; // New Financeiro
import { EstoqueModule } from './components/estoque/EstoqueModule'; // New Estoque
import { DashboardModule } from './components/dashboard/DashboardModule';
import { AdminModule } from './components/admin/AdminModule';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { View, User } from './types';
import { ShoppingCart, ShieldCheck, DollarSign, Wallet, Database, Settings, KeyRound, Landmark, LayoutDashboard, ChevronRight, Beef } from 'lucide-react';

// Constantes para persistência e timeout
const SESSION_KEY = 'hero_grill_user_session';
const ACTIVITY_KEY = 'hero_grill_last_activity';
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos em milissegundos

const App: React.FC = () => {
    // Inicializa o estado do usuário verificando o localStorage
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem(SESSION_KEY);
        const lastActivity = localStorage.getItem(ACTIVITY_KEY);

        if (savedUser && lastActivity) {
            const now = Date.now();
            const lastActivityTime = parseInt(lastActivity, 10);
            
            // Verifica se o tempo de inatividade já estourou antes mesmo de carregar
            if (now - lastActivityTime < INACTIVITY_TIMEOUT) {
                try {
                    return JSON.parse(savedUser);
                } catch (e) {
                    return null;
                }
            }
        }
        // Limpa se estiver expirado ou inválido
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ACTIVITY_KEY);
        return null;
    });

    const [currentView, setCurrentView] = useState<View>('home');
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Determina se o usuário é restrito ao Dashboard
    const isDashboardOnly = useMemo(() => {
        if (!user || user.isMaster) return false;
        const modules = user.permissions?.modules || [];
        const mainModules = modules.filter(m => !m.startsWith('view_') && !m.startsWith('config_'));
        return mainModules.length === 1 && mainModules.includes('dashboard');
    }, [user]);

    // Efeito para roteamento inicial ao recarregar a página (Restaurar view correta)
    useEffect(() => {
        if (user && isDashboardOnly) {
            setCurrentView('dashboard');
        }
        // Atualiza timestamp ao carregar
        if (user) {
            localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
        }
    }, [user, isDashboardOnly]); // Dependências ajustadas

    const handleLogout = useCallback(() => {
        setUser(null);
        setCurrentView('home');
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ACTIVITY_KEY);
    }, []);

    // Monitor de Inatividade
    useEffect(() => {
        if (!user) return;

        const updateActivity = () => {
            localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
        };

        const checkInactivity = () => {
            const lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0', 10);
            if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
                handleLogout();
                alert("Sessão encerrada por inatividade (10 min).");
            }
        };

        // Listeners para resetar o timer
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('touchstart', updateActivity);
        window.addEventListener('scroll', updateActivity);

        // Verifica a cada 1 minuto
        const intervalId = setInterval(checkInactivity, 60000);

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('touchstart', updateActivity);
            window.removeEventListener('scroll', updateActivity);
            clearInterval(intervalId);
        };
    }, [user, handleLogout]);

    const handleLogin = (loggedUser: User) => {
        const safeUser = {
            ...loggedUser,
            permissions: loggedUser.permissions || { modules: [], stores: [] }
        };
        
        // Salva na sessão
        localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
        localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
        
        setUser(safeUser);
        
        const modules = safeUser.permissions.modules || [];
        const mainModules = modules.filter(m => !m.startsWith('view_') && !m.startsWith('config_'));
        const isRestricted = mainModules.length === 1 && mainModules[0] === 'dashboard' && !safeUser.isMaster;

        if (isRestricted) {
            setCurrentView('dashboard');
        } else {
            setCurrentView('home');
        }
    };

    if (!user) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    const hasPermission = (moduleId: string) => {
        if (user.isMaster) return true;
        if (!user.permissions || !user.permissions.modules) return false;
        // Auto-allow stock module if user has 'pedidos' permission
        if (moduleId === 'estoque' && user.permissions.modules.includes('pedidos')) return true; 
        return user.permissions.modules.includes(moduleId);
    };

    const menuItems: { id: View, label: string, icon: React.ReactNode, color: string, description: string, requiredPerm: string }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={24} />, color: 'text-slate-700 bg-slate-100', description: 'Visão geral e indicadores', requiredPerm: 'dashboard' },
        { id: 'pedidos', label: 'Pedidos', icon: <ShoppingCart size={24} />, color: 'text-red-600 bg-red-50', description: 'Cadastro e gestão de compras', requiredPerm: 'pedidos' },
        { id: 'estoque', label: 'Estoque Carnes', icon: <Beef size={24} />, color: 'text-orange-600 bg-orange-50', description: 'Controle de churrasco', requiredPerm: 'estoque' },
        { id: 'novo_financeiro', label: 'Financeiro', icon: <Landmark size={24} />, color: 'text-blue-600 bg-blue-50', description: 'Fluxo de caixa e lançamentos', requiredPerm: 'novo_financeiro' },
        { id: 'controle043', label: 'Controle 043', icon: <ShieldCheck size={24} />, color: 'text-emerald-600 bg-emerald-50', description: 'Gestão de conta 043', requiredPerm: 'controle043' },
        { id: 'saldo', label: 'Saldo Contas', icon: <Wallet size={24} />, color: 'text-violet-600 bg-violet-50', description: 'Balanço mensal consolidado', requiredPerm: 'saldo' },
        { id: 'financeiro', label: 'Entradas/Saídas', icon: <DollarSign size={24} />, color: 'text-amber-600 bg-amber-50', description: 'Registro consolidado (Legado)', requiredPerm: 'financeiro' },
        { id: 'backup', label: 'Backup', icon: <Database size={24} />, color: 'text-cyan-600 bg-cyan-50', description: 'Segurança dos dados', requiredPerm: 'backup' },
        { id: 'admin', label: 'Admin', icon: <Settings size={24} />, color: 'text-slate-800 bg-slate-200', description: 'Usuários e permissões', requiredPerm: 'admin' },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
            {/* Header */}
            <Header 
                isHome={currentView === 'home'}
                onHomeClick={() => !isDashboardOnly && setCurrentView('home')} 
                user={user} 
                onLogout={handleLogout} 
                disableNavigation={isDashboardOnly}
            />

            {/* Main Content */}
            <main className="flex-grow w-full">
                {currentView === 'home' && !isDashboardOnly ? (
                    <div className="max-w-5xl mx-auto p-6 sm:p-8 animate-fadeIn">
                        <div className="mb-10 text-center">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Painel Principal</h1>
                            <p className="text-slate-500 text-sm max-w-md mx-auto">Selecione um módulo abaixo para acessar as funcionalidades do sistema.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {menuItems.filter(item => hasPermission(item.requiredPerm)).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentView(item.id)}
                                    className="group relative bg-white rounded-xl p-6 shadow-card hover:shadow-lg transition-all duration-300 border border-slate-200 hover:border-slate-300 text-left flex flex-col h-full overflow-hidden"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-lg ${item.color} transition-transform group-hover:scale-110 duration-300`}>
                                            {item.icon}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                                            <ChevronRight size={20} className="text-slate-300" />
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto">
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-heroRed transition-colors">{item.label}</h3>
                                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                                    </div>
                                    
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-heroRed/0 to-heroRed/0 group-hover:via-heroRed/10 group-hover:to-heroRed/20 transition-all duration-500"></div>
                                </button>
                            ))}
                            
                            {menuItems.filter(item => hasPermission(item.requiredPerm)).length === 0 && (
                                <div className="col-span-full text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
                                    <p className="text-slate-400 font-medium">Nenhum módulo liberado para seu perfil.</p>
                                    <p className="text-xs text-slate-400 mt-1">Contate o administrador.</p>
                                </div>
                            )}
                        </div>

                         <div className="mt-16 flex justify-center">
                            <button 
                                onClick={() => setShowPasswordModal(true)}
                                className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-xs font-semibold py-2 px-4 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <KeyRound size={14} /> Alterar Minha Senha
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 sm:py-8">
                        {currentView === 'dashboard' && <DashboardModule user={user} />}
                        {currentView === 'pedidos' && <PedidosModule user={user} />}
                        {currentView === 'estoque' && <EstoqueModule user={user} />}
                        {currentView === 'controle043' && <Controle043Module user={user} />}
                        {currentView === 'saldo' && <SaldoModule user={user} />}
                        {currentView === 'financeiro' && <FinanceiroModule user={user} />}
                        {currentView === 'novo_financeiro' && <NovoFinanceiroModule user={user} />}
                        {currentView === 'backup' && <BackupModule />}
                        {currentView === 'admin' && <AdminModule />}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-6 text-center no-print">
                <p className="text-slate-400 text-xs font-medium">
                    &copy; {new Date().getFullYear()} <span className="font-bold text-slate-600">Hero Grill Self-service</span>. Todos os direitos reservados.
                </p>
            </footer>

            {showPasswordModal && <ChangePasswordModal user={user} onClose={() => setShowPasswordModal(false)} />}
        </div>
    );
};

export default App;
