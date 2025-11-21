
import React, { useState } from 'react';
import { EstoqueSubView, User } from '../../types';
import { ControleCarnes } from './ControleCarnes';
import { GerarPedidoCarnes } from './GerarPedidoCarnes';
import { Beef, ScrollText } from 'lucide-react';

interface EstoqueModuleProps {
    user: User;
}

export const EstoqueModule: React.FC<EstoqueModuleProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<EstoqueSubView>('controle_diario');

    const tabs: { id: EstoqueSubView, label: string, icon: React.ReactNode }[] = [
        { id: 'controle_diario', label: 'CONTROLE DIÁRIO', icon: <Beef size={18}/> },
        { id: 'gerar_pedido', label: 'GERAR PEDIDO', icon: <ScrollText size={18}/> },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="text-center mb-6 no-print">
                 <h1 className="text-2xl font-black text-gray-700 uppercase">ESTOQUE DE CARNES</h1>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-8 border-b border-gray-200 pb-4 no-print">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 rounded-lg font-bold text-sm transition-all uppercase tracking-wide flex items-center gap-2 ${
                            activeTab === tab.id 
                            ? 'bg-heroRed text-white shadow-md' 
                            : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="animate-fadeIn">
                {activeTab === 'controle_diario' && <ControleCarnes user={user} />}
                {activeTab === 'gerar_pedido' && <GerarPedidoCarnes />}
            </div>
        </div>
    );
};