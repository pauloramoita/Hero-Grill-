
import React, { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, Loader2, HardDriveDownload, HardDriveUpload } from 'lucide-react';
import { createBackup, restoreBackup } from '../../services/storageService';

export const BackupSection: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            await createBackup();
        } catch (error: any) {
            alert(`Erro ao exportar backup: ${error.message}`);
        } finally {
            setExporting(false);
        }
    };

    const handleImportClick = () => {
        if (!loading) fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (window.confirm('⚠️ ATENÇÃO CRÍTICA:\n\nA importação substituirá TODOS os dados atuais (Pedidos, Usuários, Financeiro).\n\nTem certeza absoluta que deseja continuar?')) {
            setLoading(true);
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                const result = await restoreBackup(file);
                
                if (result.success) {
                    alert(result.message);
                    window.location.reload();
                } else {
                    alert(`FALHA: ${result.message}`);
                }
            } catch (err) {
                 console.error(err);
                 alert('Erro crítico durante a importação.');
            } finally {
                setLoading(false);
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="animate-fadeIn max-w-5xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-black text-heroBlack">CENTRAL DE BACKUP</h2>
                <p className="text-slate-500 mt-2">Exporte seus dados regularmente para garantir segurança.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Export Card */}
                <div className="group bg-white p-8 rounded-3xl shadow-card hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                    
                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <HardDriveDownload className="w-10 h-10 text-emerald-600" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Exportar Dados</h3>
                    <p className="text-slate-500 text-sm mb-8 flex-grow px-4">
                        Baixe um arquivo <strong>.json</strong> completo contendo todos os pedidos, usuários, configurações e lançamentos financeiros.
                    </p>
                    
                    <button 
                        onClick={handleExport}
                        disabled={exporting || loading}
                        className="w-full py-4 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {exporting ? <Loader2 className="animate-spin" /> : <Download />}
                        {exporting ? 'Gerando Arquivo...' : 'BAIXAR BACKUP'}
                    </button>
                </div>

                {/* Import Card */}
                <div className="group bg-white p-8 rounded-3xl shadow-card hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-heroBlack"></div>
                    
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <HardDriveUpload className="w-10 h-10 text-heroBlack" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Restaurar Dados</h3>
                    <p className="text-slate-500 text-sm mb-4 flex-grow px-4">
                        Recupere o sistema a partir de um arquivo salvo anteriormente.
                    </p>

                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-6 w-full">
                        <span className="text-red-700 font-bold text-xs flex items-center justify-center gap-2">
                            <AlertTriangle size={14} /> 
                            Substitui TODOS os dados atuais!
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
                        disabled={loading || exporting}
                        className="w-full py-4 rounded-xl font-bold bg-heroBlack text-white hover:bg-slate-800 shadow-lg shadow-slate-300 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Upload />}
                        {loading ? 'Restaurando...' : 'ENVIAR ARQUIVO'}
                    </button>
                </div>

            </div>
        </div>
    );
};
