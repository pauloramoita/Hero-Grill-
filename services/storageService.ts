import { createClient } from '@supabase/supabase-js';
import { 
    AppData, Order, Transaction043, AccountBalance, FinancialRecord, 
    DailyTransaction, FinancialAccount, MeatInventoryLog, MeatStockAdjustment, User 
} from '../types';

// --- SAFE INITIALIZATION ---
// Helper to safely access environment variables without crashing
const getEnv = (key: string) => {
    try {
        // Check if import.meta.env exists (Vite standard)
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            return (import.meta as any).env[key] || '';
        }
        // Fallback for other environments
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key] || '';
        }
    } catch (e) {
        console.warn('Error accessing environment variables:', e);
    }
    return '';
};

const rawSupabaseUrl = getEnv('VITE_SUPABASE_URL');
const rawSupabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Ensure createClient receives a valid URL format to prevent throwing an error immediately
// If credentials are missing, we use a placeholder so the app loads (and shows connection error in UI) rather than crashing white screen.
const supabaseUrl = rawSupabaseUrl && rawSupabaseUrl.startsWith('http') 
    ? rawSupabaseUrl 
    : 'https://placeholder.supabase.co';

const supabaseKey = rawSupabaseKey || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPERS ---

export const formatCurrency = (value: number | string | undefined | null) => {
    const num = Number(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

export const formatDateBr = (dateStr: string) => {
    if(!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

export const getTodayLocalISO = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split('T')[0];
};

// --- APP CONFIG / DATA ---

export const getAppData = async (): Promise<AppData> => {
    const { data, error } = await supabase.from('app_config').select('data').single();
    if (error || !data) return { stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] };
    return data.data;
};

export const saveAppData = async (appData: AppData) => {
    const { error } = await supabase.from('app_config').upsert({ id: 1, data: appData });
    if (error) throw new Error(error.message);
};

// --- ORDERS (PEDIDOS) ---

export const getOrders = async (): Promise<Order[]> => {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) throw new Error(error.message);
    
    // Sanitização de dados: Garante que números sejam números, evitando NaN na interface
    return (data || []).map((order: any) => ({
        ...order,
        unitValue: Number(order.unitValue) || 0,
        quantity: Number(order.quantity) || 0,
        totalValue: Number(order.totalValue) || 0
    }));
};

export const saveOrder = async (order: Order) => {
    const { id, ...rest } = order;
    // Garantir que estamos salvando números
    const safeOrder = {
        ...rest,
        unitValue: Number(rest.unitValue) || 0,
        quantity: Number(rest.quantity) || 0,
        totalValue: Number(rest.totalValue) || 0
    };
    const { error } = await supabase.from('orders').insert([safeOrder]);
    if (error) throw new Error(error.message);
};

export const updateOrder = async (order: Order) => {
    const { id, ...rest } = order;
    const safeOrder = {
        ...rest,
        unitValue: Number(rest.unitValue) || 0,
        quantity: Number(rest.quantity) || 0,
        totalValue: Number(rest.totalValue) || 0
    };
    const { error } = await supabase.from('orders').update(safeOrder).eq('id', id);
    if (error) throw new Error(error.message);
};

export const deleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getLastOrderForProduct = async (product: string): Promise<Order | null> => {
    const { data } = await supabase.from('orders').select('*').eq('product', product).order('date', { ascending: false }).limit(1);
    if (data && data.length > 0) {
        const o = data[0];
        return {
            ...o,
            unitValue: Number(o.unitValue) || 0,
            quantity: Number(o.quantity) || 0,
            totalValue: Number(o.totalValue) || 0
        };
    }
    return null;
};

export const exportToXML = (data: Order[], filename: string) => {
    console.log("Exporting to XML...", filename, data.length);
    alert("Exportação iniciada (Simulação).");
};

// --- MEAT STOCK (ESTOQUE CARNES) ---

export const getMeatConsumptionLogs = async (): Promise<MeatInventoryLog[]> => {
    const { data, error } = await supabase.from('meat_inventory_logs').select('*');
    if (error) console.error(error);
    return (data || []).map((log: any) => ({
        ...log,
        quantity_consumed: Number(log.quantity_consumed) || 0
    }));
};

export const saveMeatConsumption = async (log: MeatInventoryLog) => {
    const { id, ...rest } = log;
    const { error } = await supabase.from('meat_inventory_logs').insert([rest]);
    if (error) throw new Error(error.message);
};

export const updateMeatConsumption = async (id: string, quantity: number) => {
    const { error } = await supabase.from('meat_inventory_logs').update({ quantity_consumed: quantity }).eq('id', id);
    if (error) throw new Error(error.message);
};

export const deleteMeatConsumption = async (id: string) => {
    const { error } = await supabase.from('meat_inventory_logs').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getMeatAdjustments = async (): Promise<MeatStockAdjustment[]> => {
    const { data, error } = await supabase.from('meat_stock_adjustments').select('*');
    if (error) console.error(error);
    return (data || []).map((adj: any) => ({
        ...adj,
        quantity: Number(adj.quantity) || 0
    }));
};

export const saveMeatAdjustment = async (adj: MeatStockAdjustment) => {
    const { id, ...rest } = adj;
    const { error } = await supabase.from('meat_stock_adjustments').insert([rest]);
    if (error) throw new Error(error.message);
};

export const deleteMeatAdjustment = async (id: string) => {
    const { error } = await supabase.from('meat_stock_adjustments').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

// --- FINANCEIRO 043 ---

export const getTransactions043 = async (): Promise<Transaction043[]> => {
    const { data, error } = await supabase.from('transactions_043').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((t: any) => ({
        ...t,
        value: Number(t.value) || 0
    }));
};

export const saveTransaction043 = async (t: Transaction043) => {
    const { id, ...rest } = t;
    const { error } = await supabase.from('transactions_043').insert([rest]);
    if (error) throw new Error(error.message);
};

export const updateTransaction043 = async (t: Transaction043) => {
    const { id, ...rest } = t;
    const { error } = await supabase.from('transactions_043').update(rest).eq('id', id);
    if (error) throw new Error(error.message);
};

export const deleteTransaction043 = async (id: string) => {
    const { error } = await supabase.from('transactions_043').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const exportTransactionsToXML = (data: Transaction043[], filename: string) => {
    console.log("Exporting 043...", filename);
    alert("Exportação 043 iniciada (Simulação).");
};

// --- SALDO DE CONTAS ---

export const getAccountBalances = async (): Promise<AccountBalance[]> => {
    const { data, error } = await supabase.from('account_balances').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((b: any) => ({
        ...b,
        caixaEconomica: Number(b.caixaEconomica) || 0,
        cofre: Number(b.cofre) || 0,
        loteria: Number(b.loteria) || 0,
        pagbankH: Number(b.pagbankH) || 0,
        pagbankD: Number(b.pagbankD) || 0,
        investimentos: Number(b.investimentos) || 0,
        totalBalance: Number(b.totalBalance) || 0
    }));
};

export const saveAccountBalance = async (b: AccountBalance) => {
    const { id, ...rest } = b;
    const { error } = await supabase.from('account_balances').insert([rest]);
    if (error) throw new Error(error.message);
};

export const updateAccountBalance = async (b: AccountBalance) => {
    const { id, ...rest } = b;
    const { error } = await supabase.from('account_balances').update(rest).eq('id', id);
    if (error) throw new Error(error.message);
};

export const deleteAccountBalance = async (id: string) => {
    const { error } = await supabase.from('account_balances').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getPreviousMonthBalance = async (store: string, year: number, month: string): Promise<AccountBalance | null> => {
    // Logic to calculate previous month
    let prevMonth = parseInt(month) - 1;
    let prevYear = year;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
    }
    const mStr = String(prevMonth).padStart(2, '0');
    
    const { data } = await supabase.from('account_balances')
        .select('*')
        .eq('store', store)
        .eq('year', prevYear)
        .eq('month', mStr)
        .single();
        
    if (data) {
        return {
            ...data,
            totalBalance: Number(data.totalBalance) || 0
        } as AccountBalance;
    }
    return null;
};

export const exportBalancesToXML = (data: AccountBalance[], filename: string) => {
    console.log("Exporting Balances...", filename);
    alert("Exportação Saldos iniciada (Simulação).");
};

// --- FINANCEIRO (ENTRADAS/SAIDAS - OLD) ---

export const getFinancialRecords = async (): Promise<FinancialRecord[]> => {
    const { data, error } = await supabase.from('financial_records').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({
        ...r,
        creditCaixa: Number(r.creditCaixa) || 0,
        creditDelta: Number(r.creditDelta) || 0,
        creditPagBankH: Number(r.creditPagBankH) || 0,
        creditPagBankD: Number(r.creditPagBankD) || 0,
        creditIfood: Number(r.creditIfood) || 0,
        totalRevenues: Number(r.totalRevenues) || 0,
        debitCaixa: Number(r.debitCaixa) || 0,
        debitPagBankH: Number(r.debitPagBankH) || 0,
        debitPagBankD: Number(r.debitPagBankD) || 0,
        debitLoteria: Number(r.debitLoteria) || 0,
        totalExpenses: Number(r.totalExpenses) || 0,
        netResult: Number(r.netResult) || 0
    }));
};

export const saveFinancialRecord = async (r: FinancialRecord) => {
    const { id, ...rest } = r;
    const { error } = await supabase.from('financial_records').insert([rest]);
    if (error) throw new Error(error.message);
};

export const updateFinancialRecord = async (r: FinancialRecord) => {
    const { id, ...rest } = r;
    const { error } = await supabase.from('financial_records').update(rest).eq('id', id);
    if (error) throw new Error(error.message);
};

export const deleteFinancialRecord = async (id: string) => {
    const { error } = await supabase.from('financial_records').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const exportFinancialToXML = (data: FinancialRecord[], filename: string) => {
    console.log("Exporting Financial...", filename);
    alert("Exportação Financeiro iniciada (Simulação).");
};

// --- NOVO FINANCEIRO (DAILY TRANSACTIONS) ---

export const getFinancialAccounts = async (): Promise<FinancialAccount[]> => {
    const { data, error } = await supabase.from('financial_accounts').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((a: any) => ({
        ...a,
        initialBalance: Number(a.initialBalance) || 0
    }));
};

export const saveFinancialAccount = async (acc: FinancialAccount) => {
    const { id, ...rest } = acc;
    const { error } = await supabase.from('financial_accounts').insert([rest]);
    if (error) throw new Error(error.message);
};

export const updateFinancialAccount = async (acc: FinancialAccount) => {
    const { id, ...rest } = acc;
    const { error } = await supabase.from('financial_accounts').update(rest).eq('id', id);
    if (error) throw new Error(error.message);
};

export const deleteFinancialAccount = async (id: string) => {
    const { error } = await supabase.from('financial_accounts').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getDailyTransactions = async (): Promise<DailyTransaction[]> => {
    const { data, error } = await supabase.from('daily_transactions').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((t: any) => ({
        ...t,
        value: Number(t.value) || 0
    }));
};

export const saveDailyTransaction = async (t: DailyTransaction) => {
    const { id, ...rest } = t;
    if (id) {
        const { error } = await supabase.from('daily_transactions').update(rest).eq('id', id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('daily_transactions').insert([rest]);
        if (error) throw new Error(error.message);
    }
};

export const deleteDailyTransaction = async (id: string) => {
    const { error } = await supabase.from('daily_transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

// --- USERS & AUTH ---

export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('system_users').select('*');
    if (error) {
        console.error(error);
        return [];
    }
    return data || [];
};

export const saveUser = async (user: User) => {
    const { id, ...rest } = user;
    if (id) {
        const { error } = await supabase.from('system_users').update(rest).eq('id', id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('system_users').insert([rest]);
        if (error) throw new Error(error.message);
    }
};

export const deleteUser = async (id: string) => {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const loginUser = async (username: string, password: string): Promise<{ success: boolean, user?: User, message?: string }> => {
    // 1. Master Admin Hardcoded
    if (username === 'admin' && password === 'admin123') {
        return { success: true, user: { id: 'master', name: 'Administrador Mestre', username: 'admin', permissions: { modules: [], stores: [] }, isMaster: true } };
    }

    // 2. Database Users
    const { data, error } = await supabase.from('system_users').select('*').eq('username', username).single();
    
    if (error || !data) {
        return { success: false, message: 'Usuário não encontrado.' };
    }

    if (data.password !== password) {
        return { success: false, message: 'Senha incorreta.' };
    }

    return { success: true, user: data };
};

export const changeUserPassword = async (userId: string, current: string, newPass: string) => {
    if (userId === 'master') throw new Error("Não é possível alterar senha do Admin Mestre por aqui.");
    
    const { data } = await supabase.from('system_users').select('password').eq('id', userId).single();
    if (data.password !== current) throw new Error("Senha atual incorreta.");

    const { error } = await supabase.from('system_users').update({ password: newPass }).eq('id', userId);
    if (error) throw new Error(error.message);
};

// --- BACKUP & DIAGNOSTICS ---

export const createBackup = async () => {
    try {
        const tables = ['app_config', 'orders', 'meat_inventory_logs', 'meat_stock_adjustments', 'transactions_043', 'account_balances', 'financial_records', 'financial_accounts', 'daily_transactions', 'system_users'];
        const backup: Record<string, any> = {};

        for (const table of tables) {
            const { data } = await supabase.from(table).select('*');
            backup[table] = data;
        }

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `backup_hero_grill_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e: any) {
        throw new Error(e.message);
    }
};

export const restoreBackup = async (file: File): Promise<{ success: boolean, message: string }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target?.result as string);
                
                for (const [table, rows] of Object.entries(backup)) {
                    if (Array.isArray(rows) && rows.length > 0) {
                        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
                        const { error } = await supabase.from(table).insert(rows);
                        if (error) console.warn(`Error restoring table ${table}`, error);
                    }
                }
                resolve({ success: true, message: 'Backup restaurado com sucesso!' });
            } catch (err: any) {
                resolve({ success: false, message: err.message });
            }
        };
        reader.readAsText(file);
    });
};

export const checkConnection = async () => {
    try {
        const { count, error } = await supabase.from('app_config').select('*', { count: 'exact', head: true });
        if (error) return { status: 'error', message: error.message, details: error.hint };
        return { status: 'ok', message: 'Conectado ao Supabase' };
    } catch (e: any) {
        return { status: 'error', message: e.message };
    }
};

export const getConfigStatus = () => {
    return { 
        urlConfigured: !!rawSupabaseUrl, 
        urlPreview: rawSupabaseUrl ? `${rawSupabaseUrl.substring(0, 15)}...` : 'Não configurado' 
    };
};

export const generateMockData = async () => {
    alert("Mock Data generator not implemented in production build.");
};

export const SETUP_SQL = `
-- Criação de Tabelas para o Sistema Hero Grill

CREATE TABLE IF NOT EXISTS app_config (
    id SERIAL PRIMARY KEY,
    data JSONB
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE,
    store TEXT,
    product TEXT,
    brand TEXT,
    supplier TEXT,
    "unitValue" NUMERIC,
    "unitMeasure" TEXT,
    quantity NUMERIC,
    "totalValue" NUMERIC,
    "deliveryDate" DATE,
    type TEXT,
    category TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meat_inventory_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE,
    store TEXT,
    product TEXT,
    quantity_consumed NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meat_stock_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE,
    store TEXT,
    product TEXT,
    quantity NUMERIC,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions_043 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE,
    store TEXT,
    type TEXT,
    value NUMERIC,
    description TEXT
);

CREATE TABLE IF NOT EXISTS account_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store TEXT,
    year INTEGER,
    month TEXT,
    "caixaEconomica" NUMERIC,
    cofre NUMERIC,
    loteria NUMERIC,
    "pagbankH" NUMERIC,
    "pagbankD" NUMERIC,
    investimentos NUMERIC,
    "totalBalance" NUMERIC
);

CREATE TABLE IF NOT EXISTS financial_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store TEXT,
    year INTEGER,
    month TEXT,
    "creditCaixa" NUMERIC,
    "creditDelta" NUMERIC,
    "creditPagBankH" NUMERIC,
    "creditPagBankD" NUMERIC,
    "creditIfood" NUMERIC,
    "totalRevenues" NUMERIC,
    "debitCaixa" NUMERIC,
    "debitPagBankH" NUMERIC,
    "debitPagBankD" NUMERIC,
    "debitLoteria" NUMERIC,
    "totalExpenses" NUMERIC,
    "netResult" NUMERIC
);

CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    store TEXT,
    "initialBalance" NUMERIC
);

CREATE TABLE IF NOT EXISTS daily_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE,
    "paymentDate" DATE,
    store TEXT,
    type TEXT,
    "accountId" TEXT,
    "destinationStore" TEXT,
    "destinationAccountId" TEXT,
    "paymentMethod" TEXT,
    product TEXT,
    category TEXT,
    supplier TEXT,
    value NUMERIC,
    status TEXT,
    description TEXT,
    classification TEXT,
    origin TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    username TEXT UNIQUE,
    password TEXT,
    permissions JSONB,
    "isMaster" BOOLEAN DEFAULT FALSE
);
`;