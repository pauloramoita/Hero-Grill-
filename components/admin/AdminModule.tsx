import React, { useState } from 'react';
import { AdminSubView } from '../../types';
import { UserManagement } from './UserManagement';
import { Users, Database, MessageSquare, Activity, Terminal, Hammer, Lock } from 'lucide-react';

export const AdminModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminSubView>('usuarios');

    const tabs: { id: AdminSubView, label: string, icon: React.ReactNode, disabled: boolean }[] = [
        { id: 'usuarios', label: 'GESTÃO DE USUÁRIOS', icon: <Users size={18}/>, disabled: false },
        { id: 'backup', label: 'BACKUP', icon: <Database size={18}/>, disabled: true },
        { id: 'mensagens', label: 'MENSAGENS', icon: <MessageSquare size={18}/>, disabled: true },
        { id: 'diagnostico', label: 'DIAGNÓSTICO', icon: <Activity size={18}/>, disabled: true },
        { id: 'sql', label: 'SQL', icon: <Terminal size={18}/>, disabled: true },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="text-center mb-6">
                 <h1 className="text-2xl font-black text-gray-700 uppercase">ADMINISTRAÇÃO DO SISTEMA</h1>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap justify-center gap-3 mb-8 border-b border-gray-200 pb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                        disabled={tab.disabled}
                        className={`relative px-6 py-3 rounded-lg font-bold text-sm transition-all uppercase tracking-wide flex flex-col items-center min-w-[140px] ${
                            activeTab === tab.id 
                            ? 'bg-heroBlack text-white shadow-lg transform scale-105 z-10' 
                            : tab.disabled 
                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 hover:shadow-sm'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {tab.disabled ? <Lock size={14} className="text-gray-300"/> : tab.icon}
                            {tab.label}
                        </div>
                        {tab.disabled && (
                            <span className="text-[8px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full mt-1 font-black tracking-wider flex items-center gap-1">
                                <Hammer size={8} /> EM CRIAÇÃO
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="animate-fadeIn">
                {activeTab === 'usuarios' && <UserManagement />}
                
                {/* Placeholders for disabled tabs (in case enabled later) */}
                {activeTab === 'backup' && <div className="p-10 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">Módulo de Backup em desenvolvimento.</div>}
                {activeTab === 'mensagens' && <div className="p-10 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">Módulo de Mensagens em desenvolvimento.</div>}
                {activeTab === 'diagnostico' && <div className="p-10 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">Módulo de Diagnóstico em desenvolvimento.</div>}
                {activeTab === 'sql' && <div className="p-10 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">Módulo SQL em desenvolvimento.</div>}
            </div>
        </div>
    );
};