
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { PedidosModule } from './components/pedidos/PedidosModule';
import { Controle043Module } from './components/controle043/Controle043Module';
import { SaldoModule } from './components/saldo/SaldoModule';
import { FinanceiroModule } from './components/financeiro/FinanceiroModule'; // Old Financeiro
import { NovoFinanceiroModule } from './components/novo_financeiro/NovoFinanceiroModule'; // New Financeiro
import { EstoqueModule } from './components/estoque/EstoqueModule'; // New Estoque
import { EmprestimosModule } from './components/emprestimos/EmprestimosModule'; // New Emprestimos
import { DashboardModule } from './components/dashboard/DashboardModule';
import { AdminModule } from './components/admin/AdminModule';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { SystemMessages } from './components/SystemMessages';
import { View, User, SystemMessage } from './types';
import { getSystemMessages } from './services/storageService';
import { ShoppingCart, ShieldCheck, DollarSign, Wallet, Database, Settings, KeyRound, Landmark, LayoutDashboard, Beef, ArrowRight, TrendingUp } from 'lucide-react';

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
        
        // SE EXPIROU OU NÃO EXISTE: Limpeza TOTAL (Sessão + Filtros)
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ACTIVITY_KEY);
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('hero_state_')) {
                localStorage.removeItem(key);
            }
        });
        
        return null;
    });

    const [currentView, setCurrentView] = useState<View>('home');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    
    // Messages State
    const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);

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
            fetchMessages(); // Load messages on init
        }
    }, [user, isDashboardOnly]);

    const fetchMessages = async () => {
        try {
            const msgs = await getSystemMessages();
            setSystemMessages(msgs);
        } catch (error) {
            console.error("Error fetching system messages", error);
        }
    };

    const handleLogout = useCallback(() => {
        setUser(null);
        setCurrentView('home');
        setSystemMessages([]); // Clear messages on logout
        
        // Limpa Sessão
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ACTIVITY_KEY);

        // Limpa Estados Persistidos das Telas (Filtros, Formulários em andamento)
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('hero_state_')) {
                localStorage.removeItem(key);
            }
        });
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
        
        // Poll for new messages every 2 minutes
        const msgIntervalId = setInterval(fetchMessages, 120000);

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('touchstart', updateActivity);
            window.removeEventListener('scroll', updateActivity);
            clearInterval(intervalId);
            clearInterval(msgIntervalId);
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

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={24} />, bgClass: 'bg-slate-900', accentColor: 'text-slate-900', description: 'Visão geral e indicadores estratégicos.', requiredPerm: 'dashboard' },
        { id: 'pedidos', label: 'Pedidos de Compra', icon: <ShoppingCart size={24} />, bgClass: 'bg-heroRed', accentColor: 'text-heroRed', description: 'Lançamento de compras e fornecedores.', requiredPerm: 'pedidos' },
        { id: 'estoque', label: 'Estoque de Carnes', icon: <Beef size={24} />, bgClass: 'bg-amber-600', accentColor: 'text-amber-600', description: 'Controle de consumo diário e perdas.', requiredPerm: 'estoque' },
        { id: 'novo_financeiro', label: 'Fluxo de Caixa', icon: <Landmark size={24} />, bgClass: 'bg-emerald-600', accentColor: 'text-emerald-600', description: 'Contas a pagar, receber e transferências.', requiredPerm: 'novo_financeiro' },
        { id: 'controle043', label: 'Controle 043', icon: <ShieldCheck size={24} />, bgClass: 'bg-blue-600', accentColor: 'text-blue-600', description: 'Gestão exclusiva da conta 043.', requiredPerm: 'controle043' },
        { id: 'emprestimos', label: 'Empréstimos', icon: <TrendingUp size={24} />, bgClass: 'bg-indigo-600', accentColor: 'text-indigo-600', description: 'Controle de mútuos Hero Centro.', requiredPerm: 'emprestimos' },
        { id: 'saldo', label: 'Saldos Mensais', icon: <Wallet size={24} />, bgClass: 'bg-cyan-600', accentColor: 'text-cyan-600', description: 'Fechamento e consolidação de saldos.', requiredPerm: 'saldo' },
        { id: 'financeiro', label: 'Financeiro (Legado)', icon: <DollarSign size={24} />, bgClass: 'bg-slate-500', accentColor: 'text-slate-500', description: 'Registro de entradas e saídas antigo.', requiredPerm: 'financeiro' },
        { id: 'admin', label: 'Administração', icon: <Settings size={24} />, bgClass: 'bg-slate-800', accentColor: 'text-slate-800', description: 'Usuários, backups e configurações.', requiredPerm: 'admin' },
    ];

    // Filter for notifications intended for the user and not read
    const notifications = systemMessages.filter(m => 
        m.type === 'notification' && !m.readBy.includes(user.id)
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
            {/* System Popups and Tips Layer */}
            <SystemMessages 
                messages={systemMessages} 
                user={user} 
                onMessageRead={fetchMessages} 
            />

            {/* Header with Notifications */}
            <Header 
                isHome={currentView === 'home'}
                onHomeClick={() => !isDashboardOnly && setCurrentView('home')} 
                user={user} 
                onLogout={handleLogout} 
                disableNavigation={isDashboardOnly}
                notifications={notifications}
                onNotificationRead={fetchMessages}
            />

            {/* Main Content */}
            <main className="flex-grow w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {currentView === 'home' && !isDashboardOnly ? (
                    <div className="py-10 animate-fadeIn">
                        <div className="mb-10 text-center md:text-left">
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
                                Bem-vindo, {user.name.split(' ')[0]}
                            </h1>
                            <p className="text-slate-500 font-medium text-sm">
                                Selecione um módulo para começar suas atividades de hoje.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {menuItems.filter(item => hasPermission(item.requiredPerm)).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentView(item.id as View)}
                                    className="group relative bg-white rounded-[2rem] p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-slate-100 text-left flex flex-col h-full overflow-hidden hover:-translate-y-1"
                                >
                                    {/* Background Hover Effect */}
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 ${item.bgClass.replace('bg-', 'bg-current ')}`}></div>

                                    <div className="flex items-start justify-between mb-8">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${item.bgClass} text-white transform transition-transform group-hover:rotate-6 group-hover:scale-110`}>
                                            {item.icon}
                                        </div>
                                        <div className={`bg-slate-50 p-2 rounded-full opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300 ${item.accentColor}`}>
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto">
                                        <h3 className="text-lg font-black text-slate-800 group-hover:text-heroRed transition-colors leading-tight mb-2">
                                            {item.label}
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed group-hover:text-slate-500 transition-colors">
                                            {item.description}
                                        </p>
                                    </div>
                                </button>
                            ))}
                            
                            {menuItems.filter(item => hasPermission(item.requiredPerm)).length === 0 && (
                                <div className="col-span-full text-center p-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                    <ShieldCheck size={48} className="mx-auto text-slate-300 mb-4" />
                                    <p className="text-slate-500 font-medium text-lg">Nenhum módulo liberado para seu perfil.</p>
                                    <p className="text-sm text-slate-400 mt-2">Contate o administrador do sistema.</p>
                                </div>
                            )}
                        </div>

                         <div className="mt-16 flex justify-center">
                            <button 
                                onClick={() => setShowPasswordModal(true)}
                                className="group flex items-center gap-3 text-xs font-bold py-3 px-6 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-heroRed hover:border-heroRed/30 hover:bg-red-50/50 transition-all shadow-sm"
                            >
                                <div className="p-1.5 bg-slate-100 rounded-full group-hover:bg-white transition-colors">
                                    <KeyRound size={14} />
                                </div>
                                Gerenciar Segurança da Conta
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 animate-fadeIn">
                        {currentView === 'dashboard' && <DashboardModule user={user} />}
                        {currentView === 'pedidos' && <PedidosModule user={user} />}
                        {currentView === 'estoque' && <EstoqueModule user={user} />}
                        {currentView === 'controle043' && <Controle043Module user={user} />}
                        {currentView === 'emprestimos' && <EmprestimosModule user={user} />}
                        {currentView === 'saldo' && <SaldoModule user={user} />}
                        {currentView === 'financeiro' && <FinanceiroModule user={user} />}
                        {currentView === 'novo_financeiro' && <NovoFinanceiroModule user={user} />}
                        {currentView === 'admin' && <AdminModule />}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="py-8 text-center no-print mt-auto">
                <div className="max-w-7xl mx-auto px-4">
                    <p className="text-slate-300 text-[10px] font-black tracking-[0.2em] uppercase hover:text-slate-400 transition-colors cursor-default">
                        Hero Grill System &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </footer>

            {showPasswordModal && <ChangePasswordModal user={user} onClose={() => setShowPasswordModal(false)} />}
        </div>
    );
};

export default App;
