import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
    onHomeClick: () => void;
    user?: User | null;
    onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onHomeClick, user, onLogout }) => {
    return (
        <header className="bg-white border-t-4 border-heroRed shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                {/* Logo Area */}
                <button onClick={onHomeClick} className="flex items-end group gap-2 focus:outline-none">
                    <div className="flex flex-col leading-none">
                        <span className="text-3xl font-black text-heroRed italic tracking-tighter" style={{ fontFamily: 'Arial Black, sans-serif' }}>HERO</span>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-3xl font-black text-heroBlack italic tracking-tighter" style={{ fontFamily: 'Arial Black, sans-serif' }}>GRILL</span>
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1 ml-1">Self Service</span>
                </button>

                {/* User Area */}
                {user && (
                    <div className="flex items-center gap-6">
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