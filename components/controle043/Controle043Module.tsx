
import React, { useState } from 'react';
import { Controle043SubView } from '../../types';
import { Cadastro043 } from './Cadastro043';
import { Consulta043 } from './Consulta043';
import { Relatorio043 } from './Relatorio043';
import { ClipboardList, Search, BarChart2, ShieldCheck } from 'lucide-react';

export const Controle043Module: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Controle043SubView>('cadastrar');

    const tabs: { id: Controle043SubView, label: string, icon: React.ReactNode }[] = [
        { id: 'cadastrar', label: 'Cadastrar', icon: <ClipboardList size={20} /> },
        { id: 'consulta', label: 'Consultar', icon: <Search size={20} /> },
        { id: 'relatorios', label: 'Relatórios', icon: <BarChart2 size={20} /> },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
                <div className="p-3 bg-heroBlack rounded-lg text-white shadow-lg">
                    <ShieldCheck size={32} />
                </div>
                <div>
                     <h1 className="text-3xl font-black text-heroBlack uppercase italic">
                        Controle 043
                    </h1>
                    <p className="text-gray-500 text-sm">Gestão de empréstimos e pagamentos da conta 043</p>
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
                            ? 'bg-heroBlack text-white shadow-lg transform -translate-y-1' 
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
                {activeTab === 'cadastrar' && <Cadastro043 />}
                {activeTab === 'consulta' && <Consulta043 />}
                {activeTab === 'relatorios' && <Relatorio043 />}
            </div>
        </div>
    );
};
