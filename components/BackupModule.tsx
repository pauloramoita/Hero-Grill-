import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Database, AlertTriangle, Loader2, RefreshCw, CheckCircle, XCircle, Server } from 'lucide-react';
import { createBackup, restoreBackup, generateMockData, checkConnection, getConfigStatus } from '../services/storageService';

export const BackupModule: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    
    // Diagnostic State
    const [connectionStatus, setConnectionStatus] = useState<'checking' | 'ok' | 'error' | 'config_missing'>('checking');
    const [connectionMessage, setConnectionMessage] = useState('');
    const [configInfo, setConfigInfo] = useState({ urlConfigured: false, urlPreview: '' });

    useEffect(() => {
        runDiagnostic();
    }, []);

    const runDiagnostic = async () => {
        setConnectionStatus('checking');
        setConnectionMessage('Iniciando verificação...');
        
        await new Promise(resolve => setTimeout(resolve, 500));

        setConfigInfo(getConfigStatus());
        const result = await checkConnection();
        
        setConnectionStatus(result.status);
        const time = new Date().toLocaleTimeString();
        setConnectionMessage(`[${time}] ${result.message}` + (result.details ? ` (${result.details})` : ''));
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await createBackup();
        } catch (error: any) {
            alert(`Erro ao exportar backup: ${error.message}\nVerifique sua conexão com a internet.`);
        } finally {
            setExporting(false);
        }
    };

    const handleImportClick = () => {
        if (!loading) {
            fileInputRef.current?.click();
        }
    };

    const handleMockData = () => {
        generateMockData();
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (window.confirm('ATENÇÃO: A importação substituirá TODOS os dados atuais do sistema (pedidos e cadastros). Deseja realmente continuar?')) {
            setLoading(true);
            try {
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const result = await restoreBackup(file);
                
                if (result.success) {
                    setTimeout(() => {
                        alert(result.message);
                        window.location.reload();
                    }, 100);
                } else {
                    setLoading(false);
                    alert(`FALHA NA IMPORTAÇÃO:\n\n${result.message}`);
                }
            } catch (err) {
                 setLoading(false);
                 console.error(err);
                 alert('Ocorreu um erro crítico durante a importação.');
            }
        }
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <h1 className="text-3xl font-black text-heroBlack mb-6 border-l-8 border-heroRed pl-4 uppercase italic">
                Módulo de Backup & Diagnóstico
            </h1>

            <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn mt-8">
                
                {/* DIAGNOSTIC PANEL */}
                <div className={`p-6 rounded-lg shadow-md border-l-8 flex flex-col gap-4 ${
                    connectionStatus === 'ok' ? 'bg-green-50 border-green-500' : 
                    connectionStatus === 'checking' ? 'bg-gray-50 border-gray-400' : 
                    'bg-red-50 border-red-500'
                }`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-start gap-4">
                            <div className="mt-1">
                                {connectionStatus === 'ok' && <CheckCircle className="text-green-600" size={32} />}
                                {connectionStatus === 'error' && <XCircle className="text-red-600" size={32} />}
                                {connectionStatus === 'config_missing' && <AlertTriangle className="text-orange-600" size={32} />}
                                {connectionStatus === 'checking' && <Loader2 className="text-gray-600 animate-spin" size={32} />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">
                                    {connectionStatus === 'ok' ? 'Banco de Dados Conectado' : 
                                     connectionStatus === 'checking' ? 'Verificando Conexão...' : 
                                     'Falha na Conexão'}
                                </h3>
                                <p className={`text-sm mt-1 font-medium ${
                                    connectionStatus === 'ok' ? 'text-green-700' : 
                                    connectionStatus === 'checking' ? 'text-gray-500' : 
                                    'text-red-700'
                                }`}>
                                    {connectionMessage}
                                </p>
                                
                                {/* Config Info Block */}
                                <div className="mt-2 text-xs text-gray-500 bg-white/50 p-2 rounded border border-gray-200 inline-block">
                                    <div>URL Detectada: <strong>{configInfo.urlPreview}</strong></div>
                                    <div>Chave API: <strong>{configInfo.urlConfigured ? 'Carregada' : 'Ausente'}</strong></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <button onClick={runDiagnostic} className="px-4 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm font-bold hover:bg-gray-50 flex items-center justify-center gap-2">
                                <RefreshCw size={16}/> Testar Novamente
                            </button>
                            {connectionStatus !== 'ok' && (
                                <div className="text-xs text-center text-red-600 font-bold bg-red-100 p-1 rounded flex items-center justify-center gap-1">
                                    <Server size={12}/> Reinicie o servidor se alterou .env
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                 <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r shadow-sm">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                            <Database className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-blue-800">Gerenciamento de Dados</h3>
                            <p className="mt-2 text-sm text-blue-700">
                                Utilize esta área para exportar dados para segurança ou restaurar backups antigos.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Export Card */}
                    <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <Download className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">Exportar Dados</h3>
                        <p className="text-gray-500 mb-8 text-sm flex-grow">
                            Baixar backup completo (.json)
                        </p>
                        <button 
                            onClick={handleExport}
                            disabled={loading || exporting || connectionStatus !== 'ok'}
                            className={`w-full py-4 px-6 font-bold rounded-lg flex items-center justify-center gap-3 transition-colors shadow-md ${loading || exporting || connectionStatus !== 'ok' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                            {exporting ? (
                                <>
                                    <Loader2 size={24} className="animate-spin" /> Gerando...
                                </>
                            ) : (
                                <>
                                    <Download size={24} /> DOWNLOAD BACKUP
                                </>
                            )}
                        </button>
                    </div>

                    {/* Import Card */}
                    <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="w-20 h-20 bg-heroBlack/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            {loading ? (
                                <Loader2 className="w-10 h-10 text-heroBlack animate-spin" />
                            ) : (
                                <Upload className="w-10 h-10 text-heroBlack" />
                            )}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">Restaurar Dados</h3>
                        <p className="text-gray-500 mb-2 text-sm flex-grow">
                            Carregar arquivo .json
                        </p>
                        <div className="bg-red-50 border border-red-100 rounded p-2 mb-6 w-full">
                            <span className="text-red-600 font-bold text-xs flex items-center justify-center gap-1">
                                <AlertTriangle size={14} /> 
                                Atualiza/Substitui dados!
                            </span>
                        </div>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            className="hidden"
                        />
                        <button 
                            onClick={handleImportClick}
                            disabled={loading || exporting || connectionStatus !== 'ok'}
                            className={`w-full py-4 px-6 font-bold rounded-lg flex items-center justify-center gap-3 transition-colors shadow-md ${loading || exporting || connectionStatus !== 'ok' ? 'bg-gray-400 cursor-not-allowed' : 'bg-heroBlack hover:bg-gray-800 text-white'}`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={24} className="animate-spin" /> Processando...
                                </>
                            ) : (
                                <>
                                    <Upload size={24} /> UPLOAD ARQUIVO
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Dev Helper */}
                <div className="mt-8 border-t pt-8 text-center">
                    <h4 className="text-gray-400 font-bold text-sm mb-4 uppercase tracking-widest">Ferramentas de Teste</h4>
                    <button 
                        onClick={handleMockData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors text-sm font-bold border border-yellow-300"
                    >
                        <RefreshCw size={16} />
                        Inserir Dados de Teste no Supabase
                    </button>
                    <p className="text-xs text-gray-400 mt-2">Use isso se o banco estiver vazio para confirmar que a escrita está funcionando.</p>
                    <p className="text-xs text-gray-300 mt-2">v1.12.5 (Fix)</p>
                </div>
            </div>
        </div>
    );
};