import React, { useState } from 'react';
import { Header } from './components/Header';
import { PedidosModule } from './components/pedidos/PedidosModule';
import { Controle043Module } from './components/controle043/Controle043Module';
import { BackupModule } from './components/BackupModule';
import { View } from './types';
import { ShoppingCart, ShieldCheck, DollarSign, Wallet, Database, Grid } from 'lucide-react';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('home');

    const menuItems: { id: View, label: string, icon: React.ReactNode, color: string, disabled: boolean }[] = [
        { id: 'pedidos', label: 'Pedidos', icon: <ShoppingCart size={48} />, color: 'bg-heroRed', disabled: false },
        { id: 'controle043', label: 'Controle 043', icon: <ShieldCheck size={48} />, color: 'bg-heroBlack', disabled: false },
        { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={48} />, color: 'bg-gray-700', disabled: true },
        { id: 'saldo', label: 'Saldo Contas', icon: <Wallet size={48} />, color: 'bg-gray-800', disabled: true },
        { id: 'backup', label: 'Backup', icon: <Database size={48} />, color: 'bg-gray-700', disabled: false },
        { id: 'home', label: 'Extra', icon: <Grid size={48} />, color: 'bg-gray-800', disabled: true },
    ];

    const renderHome = () => (
        <div className="max-w-6xl mx-auto p-8">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-800 mb-2">Bem-vindo ao Painel de Gestão</h2>
                <p className="text-gray-500">Selecione um módulo para começar</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {menuItems.map((item) => {
                    if (item.id === 'home') return null; 
                    return (
                    <button
                        key={item.id}
                        onClick={() => !item.disabled && setCurrentView(item.id)}
                        disabled={item.disabled}
                        className={`
                            relative overflow-hidden h-64 rounded-xl shadow-xl transition-all duration-300 
                            flex flex-col items-center justify-center group
                            ${item.disabled ? 'opacity-60 cursor-not-allowed grayscale' : 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl'}
                            bg-white
                        `}
                    >
                        <div className={`absolute inset-0 ${item.color} opacity-90 transition-opacity group-hover:opacity-100`}></div>
                        <div className="relative z-10 text-white flex flex-col items-center">
                            <div className="mb-4 p-4 bg-white/20 rounded-full backdrop-blur-sm">
                                {item.icon}
                            </div>
                            <span className="text-2xl font-bold uppercase tracking-wider">{item.label}</span>
                            {item.disabled && <span className="text-xs mt-2 bg-black/50 px-2 py-1 rounded">Em Construção</span>}
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
                    </button>
                )})}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header onHomeClick={() => setCurrentView('home')} />
            
            <main className="flex-grow py-8">
                {currentView === 'home' && renderHome()}
                {currentView === 'pedidos' && <PedidosModule />}
                {currentView === 'controle043' && <Controle043Module />}
                {currentView === 'backup' && <BackupModule />}
                
                {/* Fallback for undefined views */}
                {currentView !== 'home' && currentView !== 'pedidos' && currentView !== 'controle043' && currentView !== 'backup' && (
                    <div className="text-center mt-20">
                        <h2 className="text-3xl font-bold text-gray-400">Módulo em desenvolvimento...</h2>
                        <button onClick={() => setCurrentView('home')} className="mt-4 text-blue-500 hover:underline">Voltar</button>
                    </div>
                )}
            </main>

            <footer className="bg-heroBlack text-white text-center py-6 mt-auto">
                <p className="text-sm opacity-50">
                    &copy; {new Date().getFullYear()} Hero Grill System. Todos os direitos reservados. 
                    <span className="ml-2 text-xs bg-green-900 px-2 py-1 rounded-full text-green-100">v1.9 (Stable Build)</span>
                </p>
            </footer>
        </div>
    );
};

export default App;