import React, { useState } from 'react';
import { Controle043SubView } from '../../types';
import { Cadastro043 } from './Cadastro043';
import { Consulta043 } from './Consulta043';
import { Relatorio043 } from './Relatorio043';

export const Controle043Module: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Controle043SubView>('cadastrar');

    const tabs: { id: Controle043SubView, label: string }[] = [
        { id: 'cadastrar', label: 'CADASTRAR' },
        { id: 'consulta', label: 'CONSULTAR' },
        { id: 'relatorios', label: 'RELATÓRIOS' },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
             <div className="text-center mb-6">
                 <h1 className="text-2xl font-black text-gray-700 uppercase">CONTROLE 043</h1>
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
                {activeTab === 'cadastrar' && <Cadastro043 />}
                {activeTab === 'consulta' && <Consulta043 />}
                {activeTab === 'relatorios' && <Relatorio043 />}
            </div>
        </div>
    );
};