import React, { useState } from 'react';
import { Lock, User, Flame, Loader2, ShieldAlert } from 'lucide-react';
import { loginUser } from '../services/storageService';
import { User as UserType } from '../types';

interface LoginScreenProps {
    onLogin: (user: UserType) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Use a high-quality Unsplash image that matches the description: 
    // Dark, BBQ, close-up steak, bokeh, premium feel.
    const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?q=80&w=2500&auto=format&fit=crop";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network for UX
            const result = await loginUser(username, password);
            if (result.success && result.user) {
                onLogin(result.user);
            } else {
                setError(result.message || 'Falha no login.');
            }
        } catch (err) {
            setError('Erro inesperado no sistema.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center bg-black">
            {/* 1. Background with Parallax (Subtle Drift) */}
            <div className="absolute inset-0 w-full h-full z-0">
                <img 
                    src={BACKGROUND_IMAGE} 
                    alt="Premium BBQ Background" 
                    className="w-full h-full object-cover animate-subtle-drift opacity-90"
                />
                {/* 2. Mask Overlay for Contrast */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70"></div>
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
            </div>

            {/* 3. Glassmorphism Card */}
            <div className="relative z-10 w-full max-w-[400px] mx-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-floating p-8 md:p-10 animate-slideUp flex flex-col items-center">
                    
                    {/* Logo Icon */}
                    <div className="w-16 h-16 bg-heroRed rounded-2xl flex items-center justify-center mb-6 shadow-glow-red transform transition-transform hover:scale-105 duration-500">
                        <Flame className="text-white w-8 h-8" strokeWidth={2.5} />
                    </div>

                    {/* Header Text */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-white mb-1 tracking-tight flex items-center justify-center gap-1">
                            <span>HERO</span>
                            <span className="text-heroRed">GRILL</span>
                        </h1>
                        <p className="text-gray-300 text-[10px] font-bold tracking-[0.25em] uppercase opacity-80">
                            Sistema de Gestão Premium
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 block">
                                Usuário
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-heroRed transition-colors duration-300" />
                                </div>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-heroRed focus:ring-1 focus:ring-heroRed/50 focus:bg-black/60 transition-all duration-300 font-medium text-sm shadow-inner"
                                    placeholder="Digite seu acesso"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 block">
                                Senha
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-heroRed transition-colors duration-300" />
                                </div>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-heroRed focus:ring-1 focus:ring-heroRed/50 focus:bg-black/60 transition-all duration-300 font-medium text-sm shadow-inner tracking-widest"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-lg flex items-center gap-3 text-xs font-bold animate-fadeIn backdrop-blur-sm">
                                <ShieldAlert size={16} className="flex-shrink-0 text-red-400" /> 
                                <span>{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="group relative w-full bg-white text-black font-black py-4 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(192,57,43,0.6)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {/* Center-out Fill Animation */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="w-0 h-0 rounded-full bg-heroRed opacity-0 group-hover:opacity-100 group-hover:w-[300%] group-hover:h-[300%] transition-all duration-500 ease-out"></span>
                            </div>
                            
                            {/* Content */}
                            <div className="relative z-10 flex items-center justify-center gap-2 group-hover:text-white transition-colors duration-300">
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <span className="tracking-wide text-sm">ENTRAR</span>
                                        <Flame size={18} className="w-0 group-hover:w-5 opacity-0 group-hover:opacity-100 transition-all duration-300 -ml-2 group-hover:ml-0" fill="currentColor" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="mt-8">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">
                            Self-Service System v2.0
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};