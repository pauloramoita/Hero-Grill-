import React, { useState } from 'react';
import { Lock, User, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Pequeno delay para UX
            
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
        <div className="min-h-screen bg-white flex flex-col relative overflow-hidden font-sans">
            {/* Background Vermelho Inclinado */}
            <div className="absolute top-0 left-0 w-full h-[45vh] bg-heroRed transform -skew-y-3 origin-top-left z-0 shadow-lg"></div>
            
            <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-[400px] bg-white rounded-[32px] shadow-floating p-8 md:p-10 animate-slideUp">
                    
                    {/* Header do Card */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-20 h-20 bg-heroRed/10 rounded-2xl flex items-center justify-center mb-6 transform rotate-3 transition-transform hover:rotate-0">
                            <div className="bg-heroRed text-white p-3.5 rounded-xl shadow-md">
                                <Lock className="w-8 h-8" strokeWidth={2.5} />
                            </div>
                        </div>
                        
                        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Bem-vindo</h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Faça login para gerenciar o<br/>
                            <span className="text-heroRed font-bold">Hero Grill Self-service</span>
                        </p>
                    </div>

                    {/* Formulário */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Usuário</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-heroRed transition-colors" />
                                </div>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-heroRed focus:ring-1 focus:ring-heroRed transition-all font-medium text-sm"
                                    placeholder="Seu usuário"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-heroRed transition-colors" />
                                </div>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-heroRed focus:ring-1 focus:ring-heroRed transition-all font-medium text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-3 text-sm font-medium animate-fadeIn border border-red-100">
                                <ShieldAlert size={18} /> 
                                <span>{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full group bg-gradient-to-r from-heroRed to-red-700 hover:to-red-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-200 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    Entrar no Sistema
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                            Sistema de Gestão v2.0
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};