
import React, { useState } from 'react';
import { SaldoSubView } from '../../types';
import { CadastroSaldo } from './CadastroSaldo';
import { ConsultaSaldo } from './ConsultaSaldo';
import { RelatorioSaldo } from './RelatorioSaldo';
import { ClipboardList, Search, BarChart2, Wallet } from 'lucide-react';

export const SaldoModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SaldoSubView>('lancamentos');

    const tabs: { id: SaldoSubView, label: string, icon: React.ReactNode }[] = [
        { id: 'lancamentos', label: 'Lançamentos', icon: <ClipboardList size={20} /> },
        { id: 'consulta', label: 'Consultar', icon: <Search size={20} /> },
        { id: 'relatorios', label: 'Relatórios', icon: <BarChart2 size={20} /> },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
                <div className="p-3 bg-gray-800 rounded-lg text-white shadow-lg">
                    <Wallet size={32} />
                </div>
                <div>
                     <h1 className="text-3xl font-black text-gray-800 uppercase italic">
                        Saldo Contas
                    </h1>
                    <p className="text-gray-500 text-sm">Controle contábil de saldos e evolução financeira</p>
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
                            ? 'bg-gray-800 text-white shadow-lg transform -translate-y-1' 
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
                {activeTab === 'lancamentos' && <CadastroSaldo />}
                {activeTab === 'consulta' && <ConsultaSaldo />}
                {activeTab === 'relatorios' && <RelatorioSaldo />}
            </div>
        </div>
    );
};