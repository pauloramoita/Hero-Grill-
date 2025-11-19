
import React, { useState } from 'react';
import { AdminSubView } from '../../types';
import { UserManagement } from './UserManagement';
import { Users, Settings } from 'lucide-react';

export const AdminModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminSubView>('usuarios');

    const tabs: { id: AdminSubView, label: string, icon: React.ReactNode }[] = [
        { id: 'usuarios', label: 'Gestão de Usuários', icon: <Users size={20} /> },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
                <div className="p-3 bg-gray-900 rounded-lg text-white shadow-lg">
                    <Settings size={32} />
                </div>
                <div>
                     <h1 className="text-3xl font-black text-gray-900 uppercase italic">
                        Administração
                    </h1>
                    <p className="text-gray-500 text-sm">Controle de acesso e configurações do sistema</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold transition-all ${
                            activeTab === tab.id 
                            ? 'bg-gray-900 text-white shadow-lg transform -translate-y-1' 
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="animate-fadeIn">
                {activeTab === 'usuarios' && <UserManagement />}
            </div>
        </div>
    );
};
