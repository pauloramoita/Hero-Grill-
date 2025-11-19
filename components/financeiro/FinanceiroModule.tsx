

import React, { useState } from 'react';
import { FinanceiroSubView } from '../../types';
import { CadastroFinanceiro } from './CadastroFinanceiro';
import { ConsultaFinanceiro } from './ConsultaFinanceiro';
import { RelatorioFinanceiro } from './RelatorioFinanceiro';
import { ClipboardList, Search, BarChart2, DollarSign } from 'lucide-react';

export const FinanceiroModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<FinanceiroSubView>('lancamentos');

    const tabs: { id: FinanceiroSubView, label: string, icon: React.ReactNode }[] = [
        { id: 'lancamentos', label: 'Lançamentos', icon: <ClipboardList size={20} /> },
        { id: 'consulta', label: 'Consultar', icon: <Search size={20} /> },
        { id: 'relatorios', label: 'Relatórios', icon: <BarChart2 size={20} /> },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
                <div className="p-3 bg-gray-700 rounded-lg text-white shadow-lg">
                    <DollarSign size={32} />
                </div>
                <div>
                     <h1 className="text-3xl font-black text-gray-800 uppercase italic">
                        Entradas e Saídas
                    </h1>
                    <p className="text-gray-500 text-sm">Gestão de Receitas e Despesas (Cash Flow Mensal)</p>
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
                            ? 'bg-gray-700 text-white shadow-lg transform -translate-y-1' 
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
                {activeTab === 'lancamentos' && <CadastroFinanceiro />}
                {activeTab === 'consulta' && <ConsultaFinanceiro />}
                {activeTab === 'relatorios' && <RelatorioFinanceiro />}
            </div>
        </div>
    );
};
