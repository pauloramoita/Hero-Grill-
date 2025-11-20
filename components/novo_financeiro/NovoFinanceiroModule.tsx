import React, { useState } from 'react';
import { NovoFinanceiroSubView, User } from '../../types';
import { LancamentosFinanceiro } from './LancamentosFinanceiro';
import { CamposFinanceiro } from './CamposFinanceiro';

interface NovoFinanceiroModuleProps {
    user: User;
}

export const NovoFinanceiroModule: React.FC<NovoFinanceiroModuleProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<NovoFinanceiroSubView>('lancamentos');
    const canConfigFinanceiro = user.isMaster || user.permissions.modules?.includes('config_financeiro_campos');

    const tabs: { id: NovoFinanceiroSubView, label: string, disabled?: boolean, visible: boolean }[] = [
        { id: 'lancamentos', label: 'LANÇAMENTOS', visible: true },
        { id: 'consulta', label: 'CONSULTAS', disabled: true, visible: true },
        { id: 'relatorios', label: 'RELATÓRIOS', disabled: true, visible: true },
        { id: 'campos', label: 'CAMPOS FINANCEIRO!', visible: canConfigFinanceiro },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="text-center mb-6">
                 <h1 className="text-2xl font-black text-gray-700 uppercase">FINANCEIRO (CAIXA)</h1>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-8 border-b border-gray-200 pb-4">
                {tabs.map(tab => {
                    if (!tab.visible) return null;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && setActiveTab(tab.id)}
                            disabled={tab.disabled}
                            className={`px-6 py-2 rounded font-bold text-sm transition-all uppercase tracking-wide ${
                                activeTab === tab.id 
                                ? 'bg-heroBlack text-white shadow-md' 
                                : tab.disabled 
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {tab.label}
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