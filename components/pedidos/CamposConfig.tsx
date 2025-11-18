import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getAppData, saveAppData } from '../../services/storageService';
import { AppData } from '../../types';

export const CamposConfig: React.FC = () => {
    const [data, setData] = useState<AppData>(getAppData());
    const [inputs, setInputs] = useState({
        stores: '',
        products: '',
        brands: '',
        suppliers: '',
        units: ''
    });

    useEffect(() => {
        setData(getAppData());
    }, []);

    // Helper to capitalize first letter of each word (Title Case)
    const toTitleCase = (str: string) => {
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleAdd = (key: keyof AppData) => {
        const rawValue = inputs[key].trim();
        if (!rawValue) return;

        // Format text: Initials Uppercase
        const value = toTitleCase(rawValue);

        // Check for duplicate (case insensitive)
        if (data[key].some(item => item.toLowerCase() === value.toLowerCase())) {
            alert('Item já cadastrado!');
            return;
        }

        // Add and Sort
        const updatedList = [...data[key], value].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const newData = { ...data, [key]: updatedList };
        
        setData(newData);
        saveAppData(newData);
        setInputs(prev => ({ ...prev, [key]: '' }));
    };

    const removeItem = (key: keyof AppData, itemToRemove: string) => {
        // Removed window.confirm to ensure action is immediate and guaranteed to execute on click
        const updatedList = data[key].filter(item => item !== itemToRemove);
        const newData = { ...data, [key]: updatedList };
        
        setData(newData);
        saveAppData(newData);
    };

    const renderSection = (title: string, key: keyof AppData, placeholder: string) => (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-bold text-heroRed mb-4 border-b pb-2">{title}</h3>
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={inputs[key]}
                    onChange={(e) => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:border-heroRed capitalize"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd(key)}
                />
                <button
                    type="button"
                    onClick={() => handleAdd(key)}
                    className="bg-heroBlack text-white p-2 rounded hover:bg-gray-800 transition-colors"
                    title="Adicionar"
                >
                    <Plus size={20} />
                </button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {data[key].map((item) => (
                    <li key={item} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 hover:bg-gray-100 transition-colors group">
                        <span className="text-gray-700 break-all font-medium">{item}</span>
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                removeItem(key, item);
                            }}
                            className="text-red-500 hover:text-white hover:bg-red-600 p-2 rounded transition-colors flex-shrink-0 cursor-pointer relative z-10"
                            title="Excluir"
                        >
                            <Trash2 size={20} className="pointer-events-none" />
                        </button>
                    </li>
                ))}
                {data[key].length === 0 && <li className="text-gray-400 text-sm italic text-center py-2">Nenhum item cadastrado.</li>}
            </ul>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderSection("Lojas", "stores", "Nome da Loja")}
            {renderSection("Produtos", "products", "Nome do Produto")}
            {renderSection("Marcas", "brands", "Marca do Produto")}
            {renderSection("Fornecedores", "suppliers", "Nome do Fornecedor")}
            {renderSection("Medidas", "units", "Ex: Kg, Un, Lt")}
        </div>
    );
};