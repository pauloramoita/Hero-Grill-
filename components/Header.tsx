import React from 'react';

interface HeaderProps {
    onHomeClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onHomeClick }) => {
    return (
        <header className="bg-white shadow-md py-4 flex justify-center items-center sticky top-0 z-50 border-b-4 border-heroRed">
            <button onClick={onHomeClick} className="flex flex-col items-center group transition-transform hover:scale-105">
                {/* Conceptual Logo Representation based on description */}
                <div className="flex flex-col items-center">
                    <div className="flex items-center">
                        <span className="text-5xl font-black text-heroRed italic tracking-tighter" style={{fontFamily: 'Arial Black, sans-serif'}}>HERO</span>
                        {/* Flame icon simulation */}
                        <svg className="w-10 h-10 text-heroRed ml-1 mb-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C12 2 15 6 15 9C15 11.5 13.5 13 12 16C13.5 13.5 16 12 16 15C16 18.5 13.5 21.5 10.5 22C7.5 22.5 5 20 5 17C5 14 8 11 8 8C8 8 6 10 6 12C6 8 9 5 12 2Z" />
                        </svg>
                    </div>
                    <span className="text-6xl font-black text-heroBlack italic tracking-tighter leading-none -mt-2" style={{fontFamily: 'Arial Black, sans-serif'}}>GRILL</span>
                    <span className="text-sm font-light tracking-[0.5em] text-heroBlack mt-1 uppercase">Self Service</span>
                </div>
            </button>
        </header>
    );
};