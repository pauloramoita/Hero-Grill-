
import React, { useState } from 'react';
import { PedidosSubView, User } from '../../types';
import { CadastroPedido } from './CadastroPedido';
import { CamposConfig } from './CamposConfig';
import { ConsultaPedidos } from './ConsultaPedidos';
import { RelatorioPedidos } from './RelatorioPedidos';
import { ClipboardList, Search, BarChart2, Settings } from 'lucide-react';

interface PedidosModuleProps {
    user: User;
}

export const PedidosModule: React.FC<PedidosModuleProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<PedidosSubView>('cadastrar');

    // Abas padrão acessíveis a todos com permissão no módulo
    const tabs: { id: PedidosSubView, label: string, icon: React.ReactNode }[] = [
        { id: 'cadastrar', label: 'Cadastrar', icon: <ClipboardList size={20} /> },
        { id: 'consulta', label: 'Consulta', icon: <Search size={20} /> },
        { id: 'relatorios', label: 'Relatórios', icon: <BarChart2 size={20} /> },
    ];

    // Adiciona a aba "Campos!" se for Administrador Mestre OU tiver a permissão específica
    const canConfigCampos = user.isMaster || user.permissions.modules?.includes('config_campos');

    if (canConfigCampos) {
        tabs.push({ id: 'campos', label: 'Campos!', icon: <Settings size={20} /> });
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <h1 className="text-3xl font-black text-heroBlack mb-6 border-l-8 border-heroRed pl-4 uppercase italic">
                Módulo de Cadastro
            </h1>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold transition-all ${
                            activeTab === tab.id 
                            ? 'bg-heroRed text-white shadow-lg transform -translate-y-1' 
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
                {activeTab === 'cadastrar' && <CadastroPedido />}
                {activeTab === 'consulta' && <ConsultaPedidos />}
                {activeTab === 'relatorios' && <RelatorioPedidos />}
                {activeTab === 'campos' && canConfigCampos && <CamposConfig />}
            </div>
        </div>
    );
};
