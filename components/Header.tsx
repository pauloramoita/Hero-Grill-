
import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
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
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16 flex items-center shadow-sm">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center h-full">
                {/* Logo Area */}
                <button 
                    onClick={!disableNavigation ? onHomeClick : undefined} 
                    className={`flex items-center gap-2 focus:outline-none transition-opacity duration-300 ${!disableNavigation ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                >
                    <div className="flex items-baseline gap-1 select-none">
                        <span className="font-black text-heroRed text-2xl italic tracking-tighter" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                            HERO
                        </span>
                        <span className="font-black text-heroBlack text-2xl italic tracking-tighter" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                            GRILL
                        </span>
                    </div>
                    {!isHome && (
                        <div className="hidden md:flex h-6 w-px bg-slate-300 mx-2"></div>
                    )}
                    {!isHome && (
                        <span className="hidden md:block text-slate-400 text-xs font-semibold uppercase tracking-widest">
                            Self-service
                        </span>
                    )}
                </button>

                {/* User Area */}
                {user && (
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logado como</span>
                            <span className="text-sm font-semibold text-slate-700 leading-tight">
                                {user.name.split(' ')[0]}
                            </span>
                        </div>
                        
                        <button 
                            onClick={onLogout}
                            className="group flex items-center justify-center w-9 h-9 rounded-full bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all duration-200"
                            title="Sair do Sistema"
                        >
                            <LogOut size={18} className="text-slate-500 group-hover:text-heroRed transition-colors" />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};