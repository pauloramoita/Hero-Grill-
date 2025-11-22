
import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, Info, Send, Trash2, Loader2, CheckCircle, Layout } from 'lucide-react';
import { createSystemMessage, getSystemMessages, deleteSystemMessage } from '../../services/storageService';
import { SystemMessage } from '../../types';

export const MessageSection: React.FC = () => {
    const [messages, setMessages] = useState<SystemMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Form State
    const [type, setType] = useState<'popup' | 'notification' | 'tip'>('notification');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [severity, setSeverity] = useState<'info' | 'warning' | 'alert'>('info');

    useEffect(() => {
        loadMessages();
    }, []);

    const loadMessages = async () => {
        setLoading(true);
        try {
            const data = await getSystemMessages();
            setMessages(data);
        } catch (error) {
            console.error("Error loading messages", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) {
            alert("Preencha título e conteúdo.");
            return;
        }

        setSending(true);
        try {
            await createSystemMessage({
                type,
                title,
                content,
                severity,
                active: true
            });
            setTitle('');
            setContent('');
            alert('Mensagem enviada com sucesso!');
            loadMessages();
        } catch (err: any) {
            alert("Erro ao enviar: " + err.message);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Deseja excluir esta mensagem?")) {
            await deleteSystemMessage(id);
            loadMessages();
        }
    };

    const getTypeIcon = (t: string) => {
        if (t === 'popup') return <Layout size={18} />;
        if (t === 'notification') return <Bell size={18} />;
        return <Info size={18} />;
    };

    return (
        <div className="animate-fadeIn max-w-5xl mx-auto space-y-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-heroBlack">CENTRAL DE MENSAGENS</h2>
                <p className="text-slate-500 mt-2">Envie comunicados, alertas e dicas para os usuários do sistema.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Creation Form */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-lg border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-heroBlack"></div>
                    
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                        <MessageSquare className="text-heroRed" /> Nova Mensagem
                    </h3>

                    <form onSubmit={handleCreate} className="space-y-6">
                        {/* Type Selection */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tipo de Mensagem</label>
                            <div className="grid grid-cols-3 gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setType('popup')}
                                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${type === 'popup' ? 'border-heroRed bg-red-50 text-heroRed' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                >
                                    <Layout size={28} />
                                    <span className="text-xs font-bold uppercase">Pop-up</span>
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setType('notification')}
                                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${type === 'notification' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                >
                                    <Bell size={28} />
                                    <span className="text-xs font-bold uppercase">Notificação</span>
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setType('tip')}
                                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${type === 'tip' ? 'border-yellow-500 bg-yellow-50 text-yellow-600' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                >
                                    <Info size={28} />
                                    <span className="text-xs font-bold uppercase">Dica</span>
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 italic">
                                {type === 'popup' && "Bloqueia a tela ao entrar. Exige confirmação de leitura."}
                                {type === 'notification' && "Aparece no sino do cabeçalho. Discreta."}
                                {type === 'tip' && "Banner no rodapé. Desaparece ao clicar."}
                            </p>
                        </div>

                        {/* Severity */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nível de Prioridade</label>
                            <div className="flex gap-4">
                                {['info', 'warning', 'alert'].map((s) => (
                                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="severity" 
                                            checked={severity === s} 
                                            onChange={() => setSeverity(s as any)} 
                                            className="accent-heroRed"
                                        />
                                        <span className="text-sm font-bold capitalize text-slate-700">
                                            {s === 'info' ? 'Informativo' : s === 'warning' ? 'Atenção' : 'Urgente'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Título</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full p-4 text-lg font-bold border-2 border-slate-100 rounded-xl focus:border-heroRed focus:ring-0 outline-none text-slate-800 placeholder-slate-300"
                                placeholder="Ex: Manutenção Programada"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Conteúdo da Mensagem</label>
                            <textarea 
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full p-4 text-base border-2 border-slate-100 rounded-xl focus:border-heroRed focus:ring-0 outline-none text-slate-600 placeholder-slate-300 min-h-[120px]"
                                placeholder="Digite aqui o texto que será exibido aos usuários..."
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={sending}
                            className="w-full py-4 bg-heroBlack text-white rounded-xl font-black text-lg shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                            {sending ? <Loader2 className="animate-spin" /> : <Send />}
                            ENVIAR MENSAGEM
                        </button>
                    </form>
                </div>

                {/* List of Active Messages */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="font-bold text-slate-500 uppercase text-sm tracking-wider mb-4">Mensagens Ativas</h3>
                    
                    {loading ? (
                        <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-slate-300"/></div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                            <p>Nenhuma mensagem ativa.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {messages.map(msg => (
                                <div key={msg.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`p-1.5 rounded-lg ${msg.type === 'popup' ? 'bg-red-100 text-heroRed' : msg.type === 'notification' ? 'bg-blue-50 text-blue-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                                {getTypeIcon(msg.type)}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase text-slate-400">{msg.type}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(msg.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    
                                    <h4 className="font-bold text-slate-800 leading-tight">{msg.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{msg.content}</p>
                                    
                                    <div className="mt-3 pt-2 border-t border-slate-50 flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                            <CheckCircle size={10} />
                                            {msg.readBy?.length || 0} lidos
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
