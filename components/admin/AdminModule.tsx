

import React, { useState } from 'react';
import { AdminSubView } from '../../types';
import { UserManagement } from './UserManagement';
import { BackupSection } from './BackupSection';
import { SqlSection } from './SqlSection';
import { DiagnosticSection } from './DiagnosticSection';
import { MessageSection } from './MessageSection';
import { Users, Database, MessageSquare, Activity, Terminal, Lock } from 'lucide-react';

export const AdminModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminSubView>('usuarios');

    const tabs: { id: AdminSubView, label: string, icon: React.ReactNode, disabled: boolean }[] = [
        { id: 'usuarios', label: 'GESTÃO DE USUÁRIOS', icon: <Users size={18}/>, disabled: false },
        { id: 'mensagens', label: 'MENSAGENS', icon: <MessageSquare size={18}/>, disabled: false },
        { id: 'backup', label: 'BACKUP & DADOS', icon: <Database size={18}/>, disabled: false },
        { id: 'sql', label: 'SQL MANUTENÇÃO', icon: <Terminal size={18}/>, disabled: false },
        { id: 'diagnostico', label: 'DIAGNÓSTICO', icon: <Activity size={18}/>, disabled: false },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="text-center mb-8">
                 <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight">PAINEL ADMINISTRATIVO</h1>
                 <p className="text-slate-500 mt-1">Gestão técnica e controle de acesso.</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap justify-center gap-3 mb-8 border-b border-gray-200 pb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                        disabled={tab.disabled}
                        className={`relative px-6 py-3 rounded-xl font-bold text-xs transition-all uppercase tracking-wide flex flex-col items-center min-w-[140px] border-2 ${
                            activeTab === tab.id 
                            ? 'bg-heroBlack text-white border-heroBlack shadow-xl transform scale-105 z-10' 
                            : tab.disabled 
                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100'
                                : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            {tab.disabled ? <Lock size={14} className="text-gray-300"/> : tab.icon}
                        </div>
                        {tab.label}
                        {tab.disabled && (
                            <span className="absolute -top-2 -right-2 bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider border border-white">
                                EM BREVE
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'usuarios' && <UserManagement />}
                {activeTab === 'mensagens' && <MessageSection />}
                {activeTab === 'backup' && <BackupSection />}
                {activeTab === 'sql' && <SqlSection />}
                {activeTab === 'diagnostico' && <DiagnosticSection />}
            </div>
        </div>
    );
};