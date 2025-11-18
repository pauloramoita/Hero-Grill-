
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

export interface Transaction043 {
    id: string;
    date: string; // YYYY-MM-DD
    store: string;
    type: 'DEBIT' | 'CREDIT';
    value: number;
    description: string; // Max 50 chars
}

export interface AccountBalance {
    id: string;
    store: string;
    year: number;
    month: string; // "01" to "12"
    
    // Contas
    caixaEconomica: number;
    cofre: number;
    loteria: number;
    pagbankH: number;
    pagbankD: number;
    investimentos: number;
    
    // Calculados
    totalBalance: number; // Soma das contas
    // Note: "Total" (Variação) é calculado dinamicamente comparando com o registro anterior
}

export type View = 'home' | 'pedidos' | 'controle043' | 'financeiro' | 'saldo' | 'backup';

export type PedidosSubView = 'cadastrar' | 'consulta' | 'relatorios' | 'campos';
export type Controle043SubView = 'cadastrar' | 'consulta' | 'relatorios';
export type SaldoSubView = 'lancamentos' | 'consulta' | 'relatorios';