
import React, { useState } from 'react';
import { X, Save, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { changeUserPassword } from '../services/storageService';
import { User } from '../types';

interface ChangePasswordModalProps {
    user: User;
    onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ user, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("Preencha todos os campos.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("A nova senha e a confirmação não conferem.");
            return;
        }

        if (newPassword.length < 4) {
            setError("A nova senha deve ter pelo menos 4 caracteres.");
            return;
        }

        setLoading(true);
        try {
            await changeUserPassword(user.id, currentPassword, newPassword);
            alert("Senha alterada com sucesso! Por favor, faça login novamente.");
            onClose();
            window.location.reload(); // Força logout/reload
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden">
                <div className="bg-heroBlack p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-heroRed p-2 rounded-full">
                            <Lock className="text-white w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Alterar Minha Senha</h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-blue-50 p-3 rounded border border-blue-100 text-sm text-blue-800 mb-4">
                        Usuário: <strong>{user.username}</strong>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Senha Atual</label>
                        <input 
                            type="password" 
                            value={currentPassword} 
                            onChange={(e) => setCurrentPassword(e.target.value)} 
                            className="w-full p-3 border rounded focus:border-heroRed focus:ring-1 focus:ring-heroRed outline-none"
                            placeholder="Digite sua senha atual"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nova Senha</label>
                        <input 
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            className="w-full p-3 border rounded focus:border-heroRed focus:ring-1 focus:ring-heroRed outline-none"
                            placeholder="Digite a nova senha"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Confirmar Nova Senha</label>
                        <input 
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            className="w-full p-3 border rounded focus:border-heroRed focus:ring-1 focus:ring-heroRed outline-none"
                            placeholder="Repita a nova senha"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-heroRed p-3 text-red-700 text-sm font-medium flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0"/>
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-heroRed text-white px-6 py-2 rounded font-bold hover:bg-red-800 flex items-center gap-2 shadow disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Salvando...' : <><CheckCircle size={18} /> Salvar Nova Senha</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
