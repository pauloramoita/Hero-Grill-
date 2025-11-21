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

// Robust number parser to recover data saved as text, currency strings, or with commas
const safeNumber = (val: any): number => {
    if (typeof val === 'number') {
        return isNaN(val) ? 0 : val;
    }
    if (val === null || val === undefined) return 0;
    
    if (typeof val === 'string') {
        let clean = val.trim();
        if (!clean || clean === 'NaN' || clean === 'null') return 0;

        // Remove currency symbols and standard text
        clean = clean.replace(/[R$\s]/g, '');

        // Check Brazilian format "1.200,50"
        // If it has a comma at the end (last 3 chars) and dot before, or just comma
        if (clean.includes(',') && !clean.includes('.')) {
             // "10,50" -> "10.50"
             clean = clean.replace(',', '.');
        } else if (clean.includes('.') && clean.includes(',')) {
            // "1.200,50" -> Remove dots, replace comma with dot
            // Find last separator
            const lastComma = clean.lastIndexOf(',');
            const lastDot = clean.lastIndexOf('.');
            
            if (lastComma > lastDot) {
                // Brazilian: 1.000,00
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                // US: 1,000.00
                clean = clean.replace(/,/g, '');
            }
        }
        
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

export const formatCurrency = (value: number | string | undefined | null) => {
    const num = safeNumber(value);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

export const formatDateBr = (dateStr: string) => {
    if(!dateStr) return '-';
    // Handle timestamps if necessary
    const cleanDate = dateStr.split('T')[0];
    const [y, m, d] = cleanDate.split('-');
    return `${d}/${m}/${y}`;
};

export const getTodayLocalISO = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split('T')[0];
};

// --- APP CONFIG / DATA ---

export const getAppData = async (): Promise<AppData> => {
    // Default empty structure
    const defaults: AppData = { stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] };

    try {
        // Try to fetch specific ID 1 first (Standard)
        let { data, error } = await supabase.from('app_config').select('data').eq('id', 1).single();
        
        // Recovery: If ID 1 is gone, try fetching ANY row (Limit 1)
        if (error || !data) {
            const { data: fallbackData, error: fallbackError } = await supabase.from('app_config').select('data').limit(1).single();
            if (!fallbackError && fallbackData) {
                data = fallbackData;
            }
        }

        if (!data || !data.data) return defaults;

        // Merge defaults with found data to prevent undefined arrays
        return {
            stores: Array.isArray(data.data.stores) ? data.data.stores : [],
            products: Array.isArray(data.data.products) ? data.data.products : [],
            brands: Array.isArray(data.data.brands) ? data.data.brands : [],
            suppliers: Array.isArray(data.data.suppliers) ? data.data.suppliers : [],
            units: Array.isArray(data.data.units) ? data.data.units : [],
            types: Array.isArray(data.data.types) ? data.data.types : [],
            categories: Array.isArray(data.data.categories) ? data.data.categories : [],
        };
    } catch (e) {
        console.error("Fatal Error loading AppData", e);
        return defaults;
    }
};

export const saveAppData = async (appData: AppData) => {
    // We try to update ID 1. If it doesn't exist, upsert handles insertion.
    const { error } = await supabase.from('app_config').upsert({ id: 1, data: appData });
    if (error) throw new Error(error.message);
};

// --- ORDERS (PEDIDOS) ---

export const getOrders = async (): Promise<Order[]> => {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) throw new Error(error.message);
    
    return (data || []).map((order: any) => ({
        ...order,
        // DATA RECOVERY: Check multiple casing variations
        unitValue: safeNumber(order.unitValue ?? order.unitvalue ?? order.unit_value),
        quantity: safeNumber(order.quantity),
        totalValue: safeNumber(order.totalValue ?? order.totalvalue ?? order.total_value),
        unitMeasure: order.unitMeasure ?? order.unitmeasure ?? order.unit_measure,
        deliveryDate: order.deliveryDate ?? order.deliverydate ?? order.delivery_date ?? null,
        createdAt: order.createdAt ?? order.createdat ?? order.created_at
    }));
};

export const saveOrder = async (order: Order) => {
    const { id, ...rest } = order;
    // Ensure we save numbers, not strings
    const safeOrder = {
        ...rest,
        unitValue: safeNumber(rest.unitValue),
        quantity: safeNumber(rest.quantity),
        totalValue: safeNumber(rest.totalValue)
    };
    const { error } = await supabase.from('orders').insert([safeOrder]);
    if (error) throw new Error(error.message);
};

export const updateOrder = async (order: Order) => {
    const { id, ...rest } = order;
    const safeOrder = {
        ...rest,
        unitValue: safeNumber(rest.unitValue),
        quantity: safeNumber(rest.quantity),
        totalValue: safeNumber(rest.totalValue)
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
            unitValue: safeNumber(o.unitValue ?? o.unitvalue ?? o.unit_value),
            quantity: safeNumber(o.quantity),
            totalValue: safeNumber(o.totalValue ?? o.totalvalue ?? o.total_value)
        };
    }
    return null;
};

export const exportToXML = (data: Order[], filename: string) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data,Loja,Produto,Marca,Fornecedor,Qtd,Valor Unit,Total,Vencimento\n";
    
    data.forEach(row => {
        const line = [
            row.date,
            row.store,
            row.product,
            row.brand,
            row.supplier,
            safeNumber(row.quantity),
            safeNumber(row.unitValue),
            safeNumber(row.totalValue),
            row.deliveryDate || ''
        ].join(",");
        csvContent += line + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- MEAT STOCK (ESTOQUE CARNES) ---

export const getMeatConsumptionLogs = async (): Promise<MeatInventoryLog[]> => {
    const { data, error } = await supabase.from('meat_inventory_logs').select('*');
    if (error) console.error(error);
    return (data || []).map((log: any) => ({
        ...log,
        quantity_consumed: safeNumber(log.quantity_consumed ?? log.quantityconsumed)
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
        quantity: safeNumber(adj.quantity)
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
        value: safeNumber(t.value)
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
    let csvContent = "data:text/csv;charset=utf-8,Data,Loja,Tipo,Valor,Descricao\n";
    data.forEach(row => {
        csvContent += `${row.date},${row.store},${row.type},${safeNumber(row.value)},${row.description || ''}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- SALDO DE CONTAS ---

export const getAccountBalances = async (): Promise<AccountBalance[]> => {
    const { data, error } = await supabase.from('account_balances').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((b: any) => ({
        ...b,
        // Robust retrieval for mixed casing
        caixaEconomica: safeNumber(b.caixaEconomica ?? b.caixaeconomica ?? b.caixa_economica),
        cofre: safeNumber(b.cofre),
        loteria: safeNumber(b.loteria),
        pagbankH: safeNumber(b.pagbankH ?? b.pagbankh ?? b.pagbank_h),
        pagbankD: safeNumber(b.pagbankD ?? b.pagbankd ?? b.pagbank_d),
        investimentos: safeNumber(b.investimentos),
        totalBalance: safeNumber(b.totalBalance ?? b.totalbalance ?? b.total_balance)
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
            totalBalance: safeNumber(data.totalBalance ?? data.totalbalance ?? data.total_balance)
        } as AccountBalance;
    }
    return null;
};

export const exportBalancesToXML = (data: AccountBalance[], filename: string) => {
    let csvContent = "data:text/csv;charset=utf-8,Ano,Mes,Loja,Total\n";
    data.forEach(row => {
        csvContent += `${row.year},${row.month},${row.store},${safeNumber(row.totalBalance)}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- FINANCEIRO (ENTRADAS/SAIDAS - OLD) ---

export const getFinancialRecords = async (): Promise<FinancialRecord[]> => {
    const { data, error } = await supabase.from('financial_records').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({
        ...r,
        // Robust casing retrieval
        creditCaixa: safeNumber(r.creditCaixa ?? r.creditcaixa ?? r.credit_caixa),
        creditDelta: safeNumber(r.creditDelta ?? r.creditdelta ?? r.credit_delta),
        creditPagBankH: safeNumber(r.creditPagBankH ?? r.creditpagbankh ?? r.credit_pagbank_h),
        creditPagBankD: safeNumber(r.creditPagBankD ?? r.creditpagbankd ?? r.credit_pagbank_d),
        creditIfood: safeNumber(r.creditIfood ?? r.creditifood ?? r.credit_ifood),
        totalRevenues: safeNumber(r.totalRevenues ?? r.totalrevenues ?? r.total_revenues),
        debitCaixa: safeNumber(r.debitCaixa ?? r.debitcaixa ?? r.debit_caixa),
        debitPagBankH: safeNumber(r.debitPagBankH ?? r.debitpagbankh ?? r.debit_pagbank_h),
        debitPagBankD: safeNumber(r.debitPagBankD ?? r.debitpagbankd ?? r.debit_pagbank_d),
        debitLoteria: safeNumber(r.debitLoteria ?? r.debitloteria ?? r.debit_loteria),
        totalExpenses: safeNumber(r.totalExpenses ?? r.totalexpenses ?? r.total_expenses),
        netResult: safeNumber(r.netResult ?? r.netresult ?? r.net_result)
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
    // alert("Exportação Financeiro iniciada (Simulação).");
};

// --- NOVO FINANCEIRO (DAILY TRANSACTIONS) ---

export const getFinancialAccounts = async (): Promise<FinancialAccount[]> => {
    const { data, error } = await supabase.from('financial_accounts').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((a: any) => ({
        ...a,
        initialBalance: safeNumber(a.initialBalance ?? a.initialbalance ?? a.initial_balance)
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
        paymentDate: t.paymentDate ?? t.paymentdate ?? t.payment_date,
        accountId: t.accountId ?? t.accountid ?? t.account_id,
        destinationStore: t.destinationStore ?? t.destinationstore ?? t.destination_store,
        destinationAccountId: t.destinationAccountId ?? t.destinationaccountid ?? t.destination_account_id,
        paymentMethod: t.paymentMethod ?? t.paymentmethod ?? t.payment_method,
        value: safeNumber(t.value),
        createdAt: t.createdAt ?? t.createdat ?? t.created_at
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
                        // WARNING: This deletes all data in table except special ID (if exists)
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