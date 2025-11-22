
import React, { useState } from 'react';
import { LogOut, ChevronLeft, Bell, X } from 'lucide-react';
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
        <header className="bg-white/95 border-b border-slate-100 sticky top-0 z-50 h-20 backdrop-blur-sm shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center">
                {/* Logo Area */}
                <div className="flex items-center gap-4">
                    {!isHome && !disableNavigation && (
                        <button 
                            onClick={onHomeClick}
                            className="p-2 -ml-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-heroBlack transition-all md:hidden active:scale-95"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    
                    <button 
                        onClick={!disableNavigation ? onHomeClick : undefined} 
                        className={`flex items-center gap-3 focus:outline-none group ${!disableNavigation ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                        {/* Logo Icon */}
                        <div className="flex items-center justify-center w-11 h-11 bg-heroRed rounded-xl shadow-lg shadow-red-100 transform transition-transform group-hover:scale-105 group-active:scale-95">
                            <span className="text-white font-black text-2xl italic leading-none mt-0.5">H</span>
                        </div>
                        
                        <div className="flex flex-col items-start">
                            <div className="flex items-baseline gap-0.5 select-none leading-none">
                                <span className="font-black text-heroBlack text-xl tracking-tighter italic">HERO</span>
                                <span className="font-black text-heroRed text-xl tracking-tighter italic">GRILL</span>
                            </div>
                            {!isHome && (
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                                    Gestão Integrada
                                </span>
                            )}
                        </div>
                    </button>
                </div>

                {/* User Area */}
                {user && (
                    <div className="flex items-center gap-4 md:gap-6">
                        
                        {/* Notification Bell */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 relative transition-colors"
                            >
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                                )}
                            </button>

                            {/* Dropdown */}
                            {showNotifications && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-fadeIn">
                                        <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50">
                                            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Notificações</span>
                                            <span className="text-xs font-bold bg-heroBlack text-white px-2 py-0.5 rounded-full">{notifications.length}</span>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center text-slate-400 text-xs italic">
                                                    Nenhuma nova notificação.
                                                </div>
                                            ) : (
                                                notifications.map(msg => (
                                                    <div key={msg.id} onClick={() => handleRead(msg.id)} className="p-4 hover:bg-slate-50 border-b border-slate-50 cursor-pointer transition-colors group relative">
                                                        <h4 className={`text-sm font-bold mb-1 ${msg.severity === 'alert' ? 'text-red-600' : 'text-slate-800'}`}>{msg.title}</h4>
                                                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{msg.content}</p>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X size={14} className="text-slate-300 hover:text-red-500" />
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Operador</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"></div>
                                <span className="text-sm font-bold text-slate-800 leading-none">
                                    {user.name.split(' ')[0]}
                                </span>
                            </div>
                        </div>
                        
                        <div className="h-8 w-px bg-slate-100 hidden md:block"></div>

                        <button 
                            onClick={onLogout}
                            className="group flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-100 transition-all duration-300 active:scale-95"
                            title="Sair do Sistema"
                        >
                            <LogOut size={16} className="text-slate-400 group-hover:text-heroRed transition-colors" />
                            <span className="text-xs font-bold text-slate-600 group-hover:text-heroRed hidden md:block">SAIR</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};
