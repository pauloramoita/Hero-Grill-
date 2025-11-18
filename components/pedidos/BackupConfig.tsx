
import React, { useRef } from 'react';
import { Download, Upload, Database, AlertTriangle } from 'lucide-react';
import { createBackup, restoreBackup } from '../../services/storageService';

export const BackupConfig: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        createBackup();
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (window.confirm('ATENÇÃO: A importação substituirá TODOS os dados atuais do sistema (pedidos e cadastros). Deseja realmente continuar?')) {
            try {
                const result = await restoreBackup(file);
                if (result.success) {
                    alert(`Sucesso! ${result.message}\n\nO sistema será reiniciado para aplicar as alterações.`);
                    window.location.reload();
                } else {
                    alert(`Falha na importação: ${result.message}`);
                }
            } catch (err) {
                 alert('Ocorreu um erro inesperado durante a importação.');
            }
        }
        // Reset input to allow selecting the same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
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
                        className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center justify-center gap-3 transition-colors shadow-md"
                    >
                        <Download size={24} />
                        FAZER EXPORTAÇÃO
                    </button>
                </div>

                {/* Import Card */}
                <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="w-20 h-20 bg-heroBlack/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Upload className="w-10 h-10 text-heroBlack" />
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
                        className="w-full py-4 px-6 bg-heroBlack hover:bg-gray-800 text-white font-bold rounded-lg flex items-center justify-center gap-3 transition-colors shadow-md"
                    >
                        <Upload size={24} />
                        IMPORTAR DADOS
                    </button>
                </div>
            </div>
        </div>
    );
};
