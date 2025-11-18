import React, { useRef, useState } from 'react';
import { Download, Upload, Database, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { createBackup, restoreBackup, generateMockData } from '../services/storageService';

export const BackupModule: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    const handleExport = () => {
        createBackup();
    };

    const handleImportClick = () => {
        if (!loading) {
            fileInputRef.current?.click();
        }
    };

    const handleMockData = () => {
        if (window.confirm('Isso apagará os dados atuais e gerará dados fictícios para teste. Útil se o banco de dados foi limpo pelo ambiente de desenvolvimento. Continuar?')) {
            generateMockData();
            alert('Dados de teste gerados com sucesso!');
            window.location.reload();
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (window.confirm('ATENÇÃO: A importação substituirá TODOS os dados atuais do sistema (pedidos e cadastros). Deseja realmente continuar?')) {
            setLoading(true);
            try {
                // Small delay to allow UI to update to loading state
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const result = await restoreBackup(file);
                
                if (result.success) {
                    // Small delay to ensure localStorage is set before alert
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
                Módulo de Backup
            </h1>

            <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn mt-8">
                 <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r shadow-sm">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                            <Database className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-blue-800">Central de Backup</h3>
                            <p className="mt-2 text-sm text-blue-700">
                                Utilize esta área para garantir a segurança dos seus dados. 
                                Recomendamos realizar a exportação (backup) dos dados semanalmente ou antes de grandes alterações.
                                O arquivo gerado contém todos os pedidos e cadastros personalizados.
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
                            Gera um arquivo de segurança (.json) contendo todo o banco de dados do sistema.
                            Salve este arquivo em seu computador ou na nuvem.
                        </p>
                        <button 
                            onClick={handleExport}
                            disabled={loading}
                            className={`w-full py-4 px-6 font-bold rounded-lg flex items-center justify-center gap-3 transition-colors shadow-md ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                            <Download size={24} />
                            FAZER EXPORTAÇÃO
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
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">Importar Dados</h3>
                        <p className="text-gray-500 mb-2 text-sm flex-grow">
                            Restaura o sistema utilizando um arquivo de backup salvo anteriormente.
                        </p>
                        <div className="bg-red-50 border border-red-100 rounded p-2 mb-6 w-full">
                            <span className="text-red-600 font-bold text-xs flex items-center justify-center gap-1">
                                <AlertTriangle size={14} /> 
                                CUIDADO: Substitui os dados atuais!
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
                            disabled={loading}
                            className={`w-full py-4 px-6 font-bold rounded-lg flex items-center justify-center gap-3 transition-colors shadow-md ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-heroBlack hover:bg-gray-800 text-white'}`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={24} className="animate-spin" /> Processando...
                                </>
                            ) : (
                                <>
                                    <Upload size={24} /> IMPORTAR DADOS
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Dev Helper */}
                <div className="mt-8 border-t pt-8 text-center">
                    <h4 className="text-gray-400 font-bold text-sm mb-4 uppercase tracking-widest">Área de Desenvolvimento</h4>
                    <button 
                        onClick={handleMockData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                        <RefreshCw size={16} />
                        Gerar Dados de Teste (Repopular Banco)
                    </button>
                    <p className="text-xs text-gray-400 mt-2">Use se o banco de dados sumir após recarregar a página.</p>
                </div>
            </div>
        </div>
    );
};