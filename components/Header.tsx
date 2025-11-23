
import React, { useState } from 'react';
import { LogOut, ChevronLeft, Bell, X, Menu, Home } from 'lucide-react';
import { User, SystemMessage } from '../types';
import { markMessageAsRead } from '../services/storageService';

interface HeaderProps {
    onHomeClick: () => void;
    user?: User | null;
    onLogout?: () => void;
    isHome: boolean;
    disableNavigation?: boolean;
    notifications: SystemMessage[];
    onNotificationRead: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    onHomeClick, 
    user, 
    onLogout, 
    isHome, 
    disableNavigation,
    notifications,
    onNotificationRead
}) => {
    const [showNotifications, setShowNotifications] = useState(false);

    const handleRead = async (id: string) => {
        if (user) {
            await markMessageAsRead(id, user.id);
            onNotificationRead();
        }
    };

    return (
        <header className="sticky top-4 z-50 px-4 md:px-6 animate-slideUp">
            <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-xl border border-white/40 shadow-soft rounded-2xl px-4 sm:px-6 h-16 flex justify-between items-center transition-all duration-300">
                
                {/* Left Section: Logo & Navigation */}
                <div className="flex items-center gap-4">
                    {!isHome && !disableNavigation && (
                        <button 
                            onClick={onHomeClick}
                            className="p-2 rounded-xl hover:bg-slate-100/50 text-slate-400 hover:text-heroBlack transition-all active:scale-90 group"
                            title="Voltar ao Início"
                        >
                            <Home size={22} className="group-hover:text-heroRed transition-colors" />
                        </button>
                    )}
                    
                    <button 
                        onClick={!disableNavigation ? onHomeClick : undefined} 
                        className={`flex items-center gap-3 group ${!disableNavigation ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 bg-gradient-to-tr from-heroRed to-orange-500 rounded-xl transform rotate-3 group-hover:rotate-6 transition-transform duration-300 opacity-20"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-heroRed to-heroRedDark rounded-xl shadow-lg shadow-heroRed/30 flex items-center justify-center transform transition-transform group-hover:scale-105">
                                <span className="text-white font-black text-xl italic">H</span>
                            </div>
                        </div>
                        
                        <div className="hidden md:flex flex-col">
                            <span className="font-extrabold text-slate-800 text-lg leading-none tracking-tight group-hover:text-heroRed transition-colors">
                                HERO<span className="text-heroRed">GRILL</span>
                            </span>
                            {!isHome && (
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.25em] leading-none mt-1">
                                    Gestão Integrada
                                </span>
                            )}
                        </div>
                    </button>
                </div>

                {/* Right Section: User & Actions */}
                {user && (
                    <div className="flex items-center gap-3 md:gap-6">
                        
                        {/* Notifications */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`p-2.5 rounded-xl transition-all duration-300 relative group ${showNotifications ? 'bg-slate-100 text-heroBlack' : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                            >
                                <Bell size={20} className={notifications.length > 0 ? 'animate-pulse-slow' : ''} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-heroRed rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {showNotifications && (
                                <>
                                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowNotifications(false)}></div>
                                    <div className="absolute right-0 mt-4 w-80 md:w-96 bg-white rounded-3xl shadow-card border border-slate-100 z-50 overflow-hidden animate-scaleIn origin-top-right">
                                        <div className="p-5 bg-slate-50/80 backdrop-blur-sm border-b border-slate-100 flex justify-between items-center">
                                            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Notificações</h3>
                                            <span className="bg-heroBlack text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{notifications.length}</span>
                                        </div>
                                        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center flex flex-col items-center text-slate-400">
                                                    <Bell size={24} className="mb-2 opacity-20" />
                                                    <span className="text-xs font-medium">Tudo limpo por aqui!</span>
                                                </div>
                                            ) : (
                                                notifications.map(msg => (
                                                    <div key={msg.id} onClick={() => handleRead(msg.id)} className="p-4 hover:bg-slate-50 border-b border-slate-50 cursor-pointer transition-colors group relative last:border-0">
                                                        <div className="flex gap-3">
                                                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${msg.severity === 'alert' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                                            <div>
                                                                <h4 className={`text-sm font-bold mb-0.5 ${msg.severity === 'alert' ? 'text-red-600' : 'text-slate-800'}`}>{msg.title}</h4>
                                                                <p className="text-xs text-slate-500 leading-relaxed">{msg.content}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* User Profile */}
                        <div className="hidden md:flex items-center gap-3 pl-6 border-l border-slate-100 h-8">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-slate-800 leading-none">{user.name.split(' ')[0]}</span>
                                <span className="text-[10px] font-medium text-slate-400 leading-none mt-1">Operador</span>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-sm flex items-center justify-center">
                                <span className="text-xs font-black text-slate-600">{user.name.charAt(0)}</span>
                            </div>
                        </div>

                        <button 
                            onClick={onLogout}
                            className="md:hidden p-2 text-slate-400 hover:text-heroRed transition-colors"
                        >
                            <LogOut size={20} />
                        </button>

                        {/* Desktop Logout */}
                        <button 
                            onClick={onLogout}
                            className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-heroRed transition-all group"
                            title="Sair"
                        >
                            <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};
