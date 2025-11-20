import React, { useState } from 'react';
import { AdminSubView } from '../../types';
import { UserManagement } from './UserManagement';

export const AdminModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminSubView>('usuarios');

    const tabs: { id: AdminSubView, label: string }[] = [
        { id: 'usuarios', label: 'GESTÃO DE USUÁRIOS' },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="text-center mb-6">
                 <h1 className="text-2xl font-black text-gray-700 uppercase">ADMINISTRAÇÃO</h1>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-8 border-b border-gray-200 pb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-2 rounded font-bold text-sm transition-all uppercase tracking-wide ${
                            activeTab === tab.id 
                            ? 'bg-heroBlack text-white shadow-md' 
                            : 'text-gray-500 hover:bg-gray-200'
                        }`}
                    >
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