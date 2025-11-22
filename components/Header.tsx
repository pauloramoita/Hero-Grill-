import React from 'react';
import { LogOut, User as UserIcon, ChevronLeft, Menu } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
    onHomeClick: () => void;
    user?: User | null;
    onLogout?: () => void;
    isHome: boolean;
    disableNavigation?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onHomeClick, user, onLogout, isHome, disableNavigation }) => {
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