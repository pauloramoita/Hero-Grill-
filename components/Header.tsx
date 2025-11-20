
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
        <header className="bg-white border-t-4 border-heroRed shadow-sm sticky top-0 z-50 h-20 flex items-center transition-all duration-300">
            <div className="w-full max-w-7xl mx-auto px-6 flex justify-between items-center relative h-full">
                {/* Logo Area */}
                <button 
                    onClick={!disableNavigation ? onHomeClick : undefined} 
                    className={`flex items-end group gap-2 focus:outline-none transition-all duration-500 ${
                        isHome || disableNavigation
                        ? 'relative translate-x-0 translate-y-0 cursor-default' 
                        : 'absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 hover:scale-105 cursor-pointer'
                    }`}
                >
                    <div className="flex flex-col leading-none">
                        <span 
                            className={`font-black text-heroRed italic tracking-tighter transition-all duration-500 ${isHome || disableNavigation ? 'text-3xl' : 'text-4xl md:text-5xl'}`} 
                            style={{ fontFamily: 'Arial Black, sans-serif' }}
                        >
                            HERO
                        </span>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span 
                            className={`font-black text-heroBlack italic tracking-tighter transition-all duration-500 ${isHome || disableNavigation ? 'text-3xl' : 'text-4xl md:text-5xl'}`} 
                            style={{ fontFamily: 'Arial Black, sans-serif' }}
                        >
                            GRILL
                        </span>
                    </div>
                    <span 
                        className={`font-bold tracking-widest text-gray-400 uppercase mb-1 ml-1 transition-all duration-500 ${isHome || disableNavigation ? 'text-[10px] opacity-100' : 'text-[0px] opacity-0 w-0 overflow-hidden'}`}
                    >
                        Self Service
                    </span>
                </button>

                {/* User Area - Always forced to the right */}
                {user && (
                    <div className="ml-auto flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Bem-vindo</span>
                            <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                                Olá, {user.name.split(' ')[0]}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-gray-200"></div>
                        <button 
                            onClick={onLogout}
                            className="text-heroRed hover:bg-red-50 p-2 rounded-full transition-colors"
                            title="Sair"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};
