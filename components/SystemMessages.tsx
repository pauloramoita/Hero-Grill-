
import React, { useState, useEffect } from 'react';
import { SystemMessage, User } from '../types';
import { markMessageAsRead } from '../services/storageService';
import { X, AlertTriangle, Info, Bell } from 'lucide-react';

interface SystemMessagesProps {
    messages: SystemMessage[];
    user: User;
    onMessageRead: () => void; // Refresh parent state
}

export const SystemMessages: React.FC<SystemMessagesProps> = ({ messages, user, onMessageRead }) => {
    // 1. Filter for Popups that haven't been read by this user
    const unreadPopups = messages.filter(m => m.type === 'popup' && !m.readBy.includes(user.id));
    
    // 2. Filter for Tips that haven't been read
    const unreadTips = messages.filter(m => m.type === 'tip' && !m.readBy.includes(user.id));

    const [currentPopup, setCurrentPopup] = useState<SystemMessage | null>(null);
    const [currentTip, setCurrentTip] = useState<SystemMessage | null>(null);

    useEffect(() => {
        if (unreadPopups.length > 0) {
            setCurrentPopup(unreadPopups[0]);
        } else {
            setCurrentPopup(null);
        }
    }, [unreadPopups.length]);

    useEffect(() => {
        if (unreadTips.length > 0) {
            setCurrentTip(unreadTips[0]);
        } else {
            setCurrentTip(null);
        }
    }, [unreadTips.length]);

    const handleReadPopup = async () => {
        if (currentPopup) {
            await markMessageAsRead(currentPopup.id, user.id);
            onMessageRead();
        }
    };

    const handleReadTip = async () => {
        if (currentTip) {
            await markMessageAsRead(currentTip.id, user.id);
            onMessageRead();
        }
    };

    const getSeverityColor = (s: string) => {
        if (s === 'alert') return 'text-red-600 bg-red-50 border-red-200';
        if (s === 'warning') return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-blue-600 bg-blue-50 border-blue-200';
    };

    return (
        <>
            {/* POPUP MODAL */}
            {currentPopup && (
                <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative animate-scaleIn">
                        <div className={`h-2 w-full ${currentPopup.severity === 'alert' ? 'bg-red-600' : 'bg-heroBlack'}`}></div>
                        <div className="p-8 text-center">
                            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${currentPopup.severity === 'alert' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
                                {currentPopup.severity === 'alert' ? <AlertTriangle size={32} /> : <Info size={32} />}
                            </div>
                            
                            <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase">{currentPopup.title}</h2>
                            <p className="text-slate-600 text-sm leading-relaxed mb-8">{currentPopup.content}</p>
                            
                            <button 
                                onClick={handleReadPopup}
                                className="w-full py-4 bg-heroBlack text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                            >
                                LIDO / CONTINUAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TIP BANNER (Bottom) */}
            {currentTip && !currentPopup && (
                <div 
                    onClick={handleReadTip}
                    className={`fixed bottom-0 left-0 w-full z-[9990] border-t-4 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] cursor-pointer animate-slideUp ${getSeverityColor(currentTip.severity)} bg-white`}
                >
                    <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/50 p-2 rounded-full">
                                <Info size={24} />
                            </div>
                            <div>
                                <h4 className="font-black uppercase text-sm tracking-wider">{currentTip.title}</h4>
                                <p className="text-sm font-medium opacity-90">{currentTip.content}</p>
                            </div>
                        </div>
                        <button className="text-current hover:opacity-70 p-2">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
