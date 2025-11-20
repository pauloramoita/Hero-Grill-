
import React, { useState } from 'react';
import { SaldoSubView, User } from '../../types';
import { CadastroSaldo } from './CadastroSaldo';
import { ConsultaSaldo } from './ConsultaSaldo';
import { RelatorioSaldo } from './RelatorioSaldo';

interface SaldoModuleProps {
    user: User;
}

export const SaldoModule: React.FC<SaldoModuleProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<SaldoSubView>('lancamentos');

    const tabs: { id: SaldoSubView, label: string }[] = [
        { id: 'lancamentos', label: 'LANÇAMENTOS' },
        { id: 'consulta', label: 'CONSULTAR' },
        { id: 'relatorios', label: 'RELATÓRIOS' },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
             <div className="text-center mb-6">
                 <h1 className="text-2xl font-black text-gray-700 uppercase">SALDO DE CONTAS</h1>
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
                {activeTab === 'lancamentos' && <CadastroSaldo user={user} />}
                {activeTab === 'consulta' && <ConsultaSaldo user={user} />}
                {activeTab === 'relatorios' && <RelatorioSaldo user={user} />}
            </div>
        </div>
    );
};
