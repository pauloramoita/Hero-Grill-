
import React from 'react';
import { Database, Copy, RefreshCw, Terminal } from 'lucide-react';
import { SETUP_SQL, generateMockData } from '../../services/storageService';

export const SqlSection: React.FC = () => {
    const copySqlToClipboard = () => {
        navigator.clipboard.writeText(SETUP_SQL).then(() => alert('Código SQL copiado para a área de transferência!'));
    };

    const handleMockData = () => {
        if(window.confirm("Isso irá gerar dados aleatórios. Usar apenas em ambiente de teste. Continuar?")) {
            generateMockData();
        }
    };

    return (
        <div className="animate-fadeIn max-w-5xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-heroBlack">SQL DE INSTALAÇÃO & MANUTENÇÃO</h2>
                <p className="text-slate-500 mt-2">Ferramentas para estruturar o banco de dados Supabase.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Instructions */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                        <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                            <Database size={20}/> Instruções
                        </h3>
                        <p className="text-sm text-blue-800 leading-relaxed">
                            Se você está vendo erros de <strong>"relation does not exist"</strong>, significa que as tabelas não foram criadas.
                        </p>
                        <ol className="list-decimal ml-4 mt-3 text-sm text-blue-800 space-y-1">
                            <li>Copie o código SQL ao lado.</li>
                            <li>Vá ao Painel do Supabase.</li>
                            <li>Entre no <strong>SQL Editor</strong>.</li>
                            <li>Cole e execute o script.</li>
                        </ol>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-xl">
                        <h3 className="font-bold text-yellow-900 flex items-center gap-2 mb-2">
                            <RefreshCw size={20}/> Dados de Teste
                        </h3>
                        <p className="text-xs text-yellow-800 mb-4">
                            Gera pedidos e usuários fictícios para popular o dashboard.
                        </p>
                        <button 
                            onClick={handleMockData}
                            className="w-full py-2 bg-yellow-600 text-white rounded-lg font-bold text-sm hover:bg-yellow-700 transition-colors"
                        >
                            Gerar Dados Mock
                        </button>
                    </div>
                </div>

                {/* Right: SQL Terminal */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900 rounded-t-xl p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                            <Terminal size={14}/> setup_database.sql
                        </div>
                        <button 
                            onClick={copySqlToClipboard}
                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
                        >
                            <Copy size={12}/> Copiar Código
                        </button>
                    </div>
                    <div className="bg-black p-4 rounded-b-xl border-t border-slate-800 overflow-x-auto">
                        <pre className="text-green-400 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                            {SETUP_SQL}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};
