
import React, { useState } from 'react';
import { Lock, User, LogIn, Loader2, ShieldAlert, ChefHat } from 'lucide-react';
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-card border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="p-8 pb-0 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                         <Lock className="text-heroRed w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bem-vindo de volta</h1>
                    <p className="text-sm text-slate-500 mt-2">Insira suas credenciais para acessar o <span className="font-bold text-slate-700">Hero Grill Self-service</span>.</p>
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Usuário</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed transition-all outline-none sm:text-sm"
                                    placeholder="Seu login"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-heroRed/20 focus:border-heroRed transition-all outline-none sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg flex items-start gap-3 text-sm animate-fadeIn">
                                <ShieldAlert size={18} className="mt-0.5 flex-shrink-0" /> 
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 bg-heroRed hover:bg-heroRedDark text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                            {loading ? 'Validando...' : 'Acessar Sistema'}
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400 font-medium">Hero Grill Self-service &copy; {new Date().getFullYear()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};