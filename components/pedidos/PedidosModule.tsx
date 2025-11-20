import React, { useState } from 'react';
import { PedidosSubView, User } from '../../types';
import { CadastroPedido } from './CadastroPedido';
import { CamposConfig } from './CamposConfig';
import { ConsultaPedidos } from './ConsultaPedidos';
import { RelatorioPedidos } from './RelatorioPedidos';

interface PedidosModuleProps {
    user: User;
}

export const PedidosModule: React.FC<PedidosModuleProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<PedidosSubView>('cadastrar');

    const tabs: { id: PedidosSubView, label: string }[] = [
        { id: 'cadastrar', label: 'CADASTRAR' },
        { id: 'consulta', label: 'CONSULTA' },
        { id: 'relatorios', label: 'RELATORIOS' },
    ];

    const canConfigCampos = user.isMaster || user.permissions.modules?.includes('config_campos');
    if (canConfigCampos) {
        tabs.push({ id: 'campos', label: 'CAMPOS!' });
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="text-center mb-6">
                 <h1 className="text-2xl font-black text-gray-700 uppercase">CADASTRO DE PEDIDOS</h1>
            </div>

            {/* Black Tabs */}
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
                {activeTab === 'cadastrar' && <CadastroPedido />}
                {activeTab === 'consulta' && <ConsultaPedidos />}
                {activeTab === 'relatorios' && <RelatorioPedidos />}
                {activeTab === 'campos' && canConfigCampos && <CamposConfig />}
            </div>
        </div>
    );
};