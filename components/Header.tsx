
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
        <header className="bg-white border-b border-slate-100 sticky top-0 z-50 h-18 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] backdrop-blur-xl bg-white/90">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full py-4 flex justify-between items-center">
                {/* Logo Area */}
                <div className="flex items-center gap-4">
                    {!isHome && !disableNavigation && (
                        <button 
                            onClick={onHomeClick}
                            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all md:hidden active:scale-95"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    
                    <button 
                        onClick={!disableNavigation ? onHomeClick : undefined} 
                        className={`flex items-center gap-3 focus:outline-none group ${!disableNavigation ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                        {/* Logo Visual Reforçado */}
                        <div className="flex items-center justify-center w-10 h-10 bg-heroRed rounded-lg shadow-md shadow-red-100 transform transition-transform group-hover:scale-105">
                            <span className="text-white font-black text-xl italic">H</span>
                        </div>
                        
                        <div className="flex flex-col items-start">
                            <div className="flex items-baseline gap-0.5 select-none leading-none">
                                <span className="font-black text-heroRed text-xl tracking-tighter italic">HERO</span>
                                <span className="font-black text-heroBlack text-xl tracking-tighter italic">GRILL</span>
                            </div>
                            {!isHome && (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                    Self-service
                                </span>
                            )}
                        </div>
                    </button>
                </div>

                {/* User Area */}
                {user && (
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Logado como</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                <span className="text-sm font-bold text-slate-800 leading-none">
                                    {user.name.split(' ')[0]}
                                </span>
                            </div>
                        </div>
                        
                        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                        <button 
                            onClick={onLogout}
                            className="group flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-100 transition-all duration-300 active:scale-95"
                            title="Sair do Sistema"
                        >
                            <LogOut size={16} className="text-slate-500 group-hover:text-heroRed transition-colors" />
                            <span className="text-xs font-bold text-slate-600 group-hover:text-heroRed hidden md:block">Sair</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};
