
import React, { useState } from 'react';
import { Lock, User, LogIn, Loader2, ShieldAlert } from 'lucide-react';
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
            // Simula um delay mínimo para UX
            await new Promise(resolve => setTimeout(resolve, 500));
            
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
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-heroBlack p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-heroRed p-3 rounded-full shadow-lg">
                            <Lock className="text-white w-8 h-8" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter">HERO <span className="text-heroRed">GRILL</span></h1>
                    <p className="text-gray-400 text-xs tracking-[0.3em] uppercase mt-1">Sistema de Gestão</p>
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Usuário</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-heroRed focus:border-heroRed bg-gray-50"
                                    placeholder="Seu login"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-heroRed focus:border-heroRed bg-gray-50"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2 text-sm font-bold animate-fadeIn">
                                <ShieldAlert size={16} /> {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 bg-heroRed hover:bg-red-700 text-white font-bold py-4 px-4 rounded-lg shadow transition-colors disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
                            {loading ? 'Acessando...' : 'ENTRAR NO SISTEMA'}
                        </button>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-400">Versão 1.14.0 - Controle de Acesso</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
