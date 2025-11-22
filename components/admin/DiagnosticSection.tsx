
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Server, RefreshCw } from 'lucide-react';
import { checkConnection, getConfigStatus } from '../../services/storageService';

export const DiagnosticSection: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<'checking' | 'ok' | 'error' | 'config_missing'>('checking');
    const [connectionMessage, setConnectionMessage] = useState('');
    const [configInfo, setConfigInfo] = useState({ urlConfigured: false, urlPreview: '' });

    useEffect(() => {
        runDiagnostic();
    }, []);

    const runDiagnostic = async () => {
        setConnectionStatus('checking');
        setConnectionMessage('Iniciando verificação de conectividade...');
        
        // Artificial delay for UX
        await new Promise(resolve => setTimeout(resolve, 800));

        setConfigInfo(getConfigStatus());
        const result = await checkConnection();
        
        setConnectionStatus(result.status as any);
        const time = new Date().toLocaleTimeString();
        setConnectionMessage(`[${time}] ${result.message}` + (result.details ? ` (${result.details})` : ''));
    };

    return (
        <div className="animate-fadeIn max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-heroBlack">DIAGNÓSTICO DO SISTEMA</h2>
                <p className="text-slate-500 mt-2">Verifique a conexão com o banco de dados e integridade da configuração.</p>
            </div>

            <div className={`p-8 rounded-3xl shadow-lg border-2 transition-all duration-500 ${
                connectionStatus === 'ok' ? 'bg-white border-green-100 shadow-green-100/50' : 
                connectionStatus === 'checking' ? 'bg-white border-slate-100' : 
                'bg-red-50 border-red-100'
            }`}>
                <div className="flex flex-col items-center text-center gap-6">
                    
                    {/* Icon Status */}
                    <div className="relative">
                        {connectionStatus === 'ok' && (
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-scaleIn">
                                <CheckCircle className="text-green-600 w-12 h-12" />
                            </div>
                        )}
                        {connectionStatus === 'error' && (
                            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center animate-scaleIn">
                                <XCircle className="text-red-600 w-12 h-12" />
                            </div>
                        )}
                        {connectionStatus === 'config_missing' && (
                            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center animate-scaleIn">
                                <AlertTriangle className="text-orange-600 w-12 h-12" />
                            </div>
                        )}
                        {connectionStatus === 'checking' && (
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
                                <Loader2 className="text-slate-400 w-10 h-10 animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Status Text */}
                    <div>
                        <h3 className={`text-2xl font-black mb-2 ${
                            connectionStatus === 'ok' ? 'text-green-700' :
                            connectionStatus === 'error' ? 'text-red-700' :
                            connectionStatus === 'checking' ? 'text-slate-700' : 'text-orange-700'
                        }`}>
                            {connectionStatus === 'ok' ? 'Banco de Dados Conectado' : 
                             connectionStatus === 'checking' ? 'Verificando...' : 
                             'Falha na Conexão'}
                        </h3>
                        <p className="text-slate-500 font-medium">{connectionMessage}</p>
                    </div>

                    {/* Details Box */}
                    <div className="w-full max-w-md bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-600 space-y-2">
                        <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span>URL do Projeto:</span>
                            <span className="font-mono font-bold text-slate-800">{configInfo.urlPreview || '...'}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                            <span>Chave de API:</span>
                            <span className={`font-bold ${configInfo.urlConfigured ? 'text-green-600' : 'text-red-500'}`}>
                                {configInfo.urlConfigured ? 'Carregada' : 'Ausente'}
                            </span>
                        </div>
                    </div>

                    {/* Action */}
                    <button 
                        onClick={runDiagnostic} 
                        disabled={connectionStatus === 'checking'}
                        className="mt-2 px-8 py-3 bg-heroBlack text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={connectionStatus === 'checking' ? 'animate-spin' : ''}/>
                        Testar Novamente
                    </button>

                    {connectionStatus !== 'ok' && connectionStatus !== 'checking' && (
                        <div className="text-xs text-red-500 font-bold bg-red-50 px-4 py-2 rounded-lg flex items-center gap-2">
                            <Server size={14}/> Reinicie a aplicação se alterou as variáveis de ambiente (.env).
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
