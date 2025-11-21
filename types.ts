

export interface AppData {
    stores: string[];
    products: string[];
    brands: string[];
    suppliers: string[];
    units: string[];
    types: string[]; // Novo
    categories: string[]; // Novo
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
    deliveryDate: string | null; // Usado agora como Data Vencimento visualmente
    type?: string; // Novo
    category?: string; // Novo
    createdAt?: string; // Timestamp de criação
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

export interface FinancialRecord {
    id: string;
    store: string;
    year: number;
    month: string; // "01" to "12"

    // Créditos (Receitas)
    creditCaixa: number;
    creditDelta: number;
    creditPagBankH: number;
    creditPagBankD: number;
    creditIfood: number;
    totalRevenues: number; // Calculated Sum

    // Débitos (Despesas)
    debitCaixa: number;
    debitPagBankH: number;
    debitPagBankD: number;
    debitLoteria: number;
    totalExpenses: number; // Calculated Sum

    // Resultado
    netResult: number; // Revenues - Expenses
}

// === NOVAS INTERFACES PARA O NOVO FINANCEIRO ===

export interface FinancialAccount {
    id: string;
    name: string;
    store: string;
    initialBalance: number;
}

export interface DailyTransaction {
    id: string;
    date: string; // Data Vencimento
    paymentDate: string | null; // Data Pagamento
    store: string; // Origem
    type: 'Receita' | 'Despesa' | 'Transferência';
    accountId: string | null; // Origem
    destinationStore?: string; // Destino (apenas Transferência)
    destinationAccountId?: string | null; // Destino (apenas Transferência)
    paymentMethod: string; // Boleto, PiX, Dinheiro
    product: string;
    category: string;
    supplier: string;
    value: number;
    status: 'Pago' | 'Pendente';
    description?: string;
    classification?: string; // Novo: Tipo (Fixa/Variável)
    origin?: 'manual' | 'pedido'; // Para diferenciar lançamentos manuais de pedidos importados
    createdAt?: string; // Timestamp de criação
}

// === ESTOQUE ===
export interface MeatInventoryLog {
    id: string;
    date: string; // Data do consumo
    store: string; // Loja
    product: string; // Nome da carne
    quantity_consumed: number; // Quantidade retirada/consumida
    created_at?: string;
}

export interface MeatStockAdjustment {
    id: string;
    date: string;
    store: string; // Loja
    product: string;
    quantity: number; // Pode ser positivo (entrada) ou negativo (saída/perda)
    reason: string;
    created_at?: string;
}

export interface UserPermissions {
    modules: string[]; // 'dashboard', 'pedidos', 'controle043', 'saldo', 'financeiro', 'backup', 'admin', 'novo_financeiro', 'estoque', etc
    stores: string[]; // Lista de lojas permitidas
}

export interface User {
    id: string;
    name: string;
    username: string;
    password?: string; // Opcional na listagem para segurança
    permissions: UserPermissions;
    isMaster?: boolean; // Identifica o admin hardcoded
}

export type View = 'home' | 'pedidos' | 'controle043' | 'financeiro' | 'novo_financeiro' | 'saldo' | 'backup' | 'admin' | 'dashboard' | 'estoque';

export type PedidosSubView = 'cadastrar' | 'consulta' | 'relatorios' | 'campos';
export type Controle043SubView = 'cadastrar' | 'consulta' | 'relatorios';
export type SaldoSubView = 'lancamentos' | 'consulta' | 'relatorios';
export type FinanceiroSubView = 'lancamentos' | 'consulta' | 'relatorios';
export type NovoFinanceiroSubView = 'lancamentos' | 'consulta' | 'relatorios' | 'campos';
export type AdminSubView = 'usuarios';
export type EstoqueSubView = 'controle_diario' | 'gerar_pedido';