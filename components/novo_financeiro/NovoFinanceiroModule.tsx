
import React, { useState } from 'react';
import { NovoFinanceiroSubView, User } from '../../types';
import { LancamentosFinanceiro } from './LancamentosFinanceiro';
import { CamposFinanceiro } from './CamposFinanceiro';
import { ClipboardList, Search, BarChart2, Settings, Landmark } from 'lucide-react';

interface NovoFinanceiroModuleProps {
    user: User;
}

export const NovoFinanceiroModule: React.FC<NovoFinanceiroModuleProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<NovoFinanceiroSubView>('lancamentos');

    // Permissão para configurar contas financeiras
    const canConfigFinanceiro = user.isMaster || user.permissions.modules?.includes('config_financeiro_campos');

    const tabs: { id: NovoFinanceiroSubView, label: string, icon: React.ReactNode, disabled?: boolean, visible: boolean }[] = [
        { id: 'lancamentos', label: 'Lançamentos', icon: <ClipboardList size={20} />, visible: true },
        { id: 'consulta', label: 'Consultas', icon: <Search size={20} />, disabled: true, visible: true },
        { id: 'relatorios', label: 'Relatórios', icon: <BarChart2 size={20} />, disabled: true, visible: true },
        { id: 'campos', label: 'Campos Financeiro!', icon: <Settings size={20} />, visible: canConfigFinanceiro },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
                <div className="p-3 bg-green-700 rounded-lg text-white shadow-lg">
                    <Landmark size={32} />
                </div>
                <div>
                     <h1 className="text-3xl font-black text-gray-800 uppercase italic">
                        Financeiro
                    </h1>
                    <p className="text-gray-500 text-sm">Controle de Caixa, Contas e Pagamentos Diários</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-1">
                {tabs.map(tab => {
                    if (!tab.visible) return null;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && setActiveTab(tab.id)}
                            disabled={tab.disabled}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-green-700 text-white shadow-lg transform -translate-y-1' 
                                : tab.disabled 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.disabled && <span className="text-[10px] ml-1 bg-gray-200 px-1 rounded">Em Breve</span>}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="animate-fadeIn">
                {activeTab === 'lancamentos' && <LancamentosFinanceiro user={user} />}
                {activeTab === 'campos' && canConfigFinanceiro && <CamposFinanceiro />}
                {(activeTab === 'consulta' || activeTab === 'relatorios') && (
                    <div className="p-10 text-center text-gray-400 bg-gray-50 border border-dashed rounded-lg">
                        <h3 className="text-xl font-bold">Em Construção</h3>
                        <p>Este módulo estará disponível em breve.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
