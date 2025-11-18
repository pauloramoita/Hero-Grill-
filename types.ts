
export interface AppData {
    stores: string[];
    products: string[];
    brands: string[];
    suppliers: string[];
    units: string[];
}

export interface Order {
    id: string;
    date: string; // YYYY-MM-DD for storage
    store: string;
    product: string;
    brand: string;
    supplier: string;
    unitValue: number;
    unitMeasure: string;
    quantity: number;
    totalValue: number;
    deliveryDate: string | null; // YYYY-MM-DD or null
}

export type View = 'home' | 'pedidos' | 'controle043' | 'financeiro' | 'saldo' | 'backup';

export type PedidosSubView = 'cadastrar' | 'consulta' | 'relatorios' | 'campos';