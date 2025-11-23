
import React, { useState } from 'react';
import { EmprestimosSubView, User } from '../../types';
import { CadastroEmprestimos } from './CadastroEmprestimos';
import { ConsultaEmprestimos } from './ConsultaEmprestimos';
import { RelatorioEmprestimos } from './RelatorioEmprestimos';
import { Landmark, Search, FileText } from 'lucide-react';

interface EmprestimosModuleProps {
    user: User;
}

export const EmprestimosModule: React.FC<EmprestimosModuleProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<EmprestimosSubView>('cadastrar');

    const tabs: { id: EmprestimosSubView, label: string, icon: React.ReactNode }[] = [
        { id: 'cadastrar', label: 'CADASTRAR', icon: <Landmark size={18}/> },
        { id: 'consulta', label: 'CONSULTAR', icon: <Search size={18}/> },
        { id: 'relatorios', label: 'RELATÓRIOS', icon: <FileText size={18}/> },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
             <div className="text-center mb-8">
                 <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                     CONTROLE EMPRÉSTIMOS <span className="text-indigo-600 block text-lg mt-1 font-bold">- HERO CENTRO -</span>
                 </h1>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-3 mb-8 border-b border-slate-200 pb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 rounded-xl font-bold text-xs transition-all uppercase tracking-wide flex items-center gap-2 ${
                            activeTab === tab.id 
                            ? 'bg-indigo-900 text-white shadow-lg transform scale-105' 
                            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="animate-fadeIn">
                {activeTab === 'cadastrar' && <CadastroEmprestimos user={user} />}
                {activeTab === 'consulta' && <ConsultaEmprestimos user={user} />}
                {activeTab === 'relatorios' && <RelatorioEmprestimos user={user} />}
            </div>
        </div>
    );
};
