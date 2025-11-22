
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
import { ShoppingCart, ShieldCheck, DollarSign, Wallet, Database, Settings, KeyRound, Landmark, LayoutDashboard, ChevronRight, Beef, ArrowRight } from 'lucide-react';

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
    }, [user, isDashboardOnly]);

    const handleLogout = useCallback(() => {
        setUser(null);
        setCurrentView('home');
        
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

    const menuItems: { id: View, label: string, icon: React.ReactNode, bgClass: string, textClass: string, description: string, requiredPerm: string }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={28} />, bgClass: 'bg-slate-800', textClass: 'text-white', description: 'Visão geral e indicadores', requiredPerm: 'dashboard' },
        { id: 'pedidos', label: 'Pedidos', icon: <ShoppingCart size={28} />, bgClass: 'bg-heroRed', textClass: 'text-white', description: 'Cadastro e gestão de compras', requiredPerm: 'pedidos' },
        { id: 'estoque', label: 'Estoque Carnes', icon: <Beef size={28} />, bgClass: 'bg-orange-500', textClass: 'text-white', description: 'Controle de churrasco', requiredPerm: 'estoque' },
        { id: 'novo_financeiro', label: 'Financeiro', icon: <Landmark size={28} />, bgClass: 'bg-blue-600', textClass: 'text-white', description: 'Fluxo de caixa e lançamentos', requiredPerm: 'novo_financeiro' },
        { id: 'controle043', label: 'Controle 043', icon: <ShieldCheck size={28} />, bgClass: 'bg-emerald-600', textClass: 'text-white', description: 'Gestão de conta 043', requiredPerm: 'controle043' },
        { id: 'saldo', label: 'Saldo Contas', icon: <Wallet size={28} />, bgClass: 'bg-violet-600', textClass: 'text-white', description: 'Balanço mensal consolidado', requiredPerm: 'saldo' },
        { id: 'financeiro', label: 'Entradas/Saídas', icon: <DollarSign size={28} />, bgClass: 'bg-amber-500', textClass: 'text-white', description: 'Registro consolidado (Legado)', requiredPerm: 'financeiro' },
        { id: 'backup', label: 'Backup', icon: <Database size={28} />, bgClass: 'bg-cyan-600', textClass: 'text-white', description: 'Segurança dos dados', requiredPerm: 'backup' },
        { id: 'admin', label: 'Admin', icon: <Settings size={28} />, bgClass: 'bg-slate-200', textClass: 'text-slate-800', description: 'Usuários e permissões', requiredPerm: 'admin' },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
            {/* Header */}
            <Header 
                isHome={currentView === 'home'}
                onHomeClick={() => !isDashboardOnly && setCurrentView('home')} 
                user={user} 
                onLogout={handleLogout} 
                disableNavigation={isDashboardOnly}
            />

            {/* Main Content */}
            <main className="flex-grow w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {currentView === 'home' && !isDashboardOnly ? (
                    <div className="py-12 animate-fadeIn">
                        <div className="mb-10">
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Painel Principal</h1>
                            <p className="text-slate-500 font-medium">
                                Selecione um módulo abaixo para iniciar.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {menuItems.filter(item => hasPermission(item.requiredPerm)).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentView(item.id)}
                                    className="group relative bg-white rounded-3xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-slate-100 text-left flex flex-col h-full overflow-hidden active:scale-[0.98]"
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${item.bgClass} ${item.textClass} transform transition-transform group-hover:rotate-6`}>
                                            {item.icon}
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-full opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all">
                                            <ArrowRight size={20} className="text-slate-400" />
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto">
                                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-heroRed transition-colors">{item.label}</h3>
                                        <p className="text-sm text-slate-500 mt-2 leading-relaxed font-medium">{item.description}</p>
                                    </div>
                                </button>
                            ))}
                            
                            {menuItems.filter(item => hasPermission(item.requiredPerm)).length === 0 && (
                                <div className="col-span-full text-center p-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                    <ShieldCheck size={48} className="mx-auto text-slate-300 mb-4" />
                                    <p className="text-slate-500 font-medium text-lg">Nenhum módulo liberado para seu perfil.</p>
                                    <p className="text-sm text-slate-400 mt-2">Contate o administrador.</p>
                                </div>
                            )}
                        </div>

                         <div className="mt-16 flex justify-center">
                            <button 
                                onClick={() => setShowPasswordModal(true)}
                                className="text-slate-400 hover:text-heroRed flex items-center gap-2 text-xs font-bold py-3 px-6 rounded-full bg-white border border-slate-100 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm"
                            >
                                <KeyRound size={14} /> Alterar Minha Senha
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 animate-fadeIn">
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
            <footer className="bg-white border-t border-slate-100 py-8 text-center no-print mt-auto">
                <div className="max-w-7xl mx-auto px-4">
                    <p className="text-slate-400 text-xs font-bold tracking-wide">
                        &copy; {new Date().getFullYear()} HERO GRILL SELF-SERVICE
                    </p>
                </div>
            </footer>

            {showPasswordModal && <ChangePasswordModal user={user} onClose={() => setShowPasswordModal(false)} />}
        </div>
    );
};

export default App;
