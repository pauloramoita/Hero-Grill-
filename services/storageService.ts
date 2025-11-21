
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
const supabaseUrl = rawSupabaseUrl && rawSupabaseUrl.startsWith('http') 
    ? rawSupabaseUrl 
    : 'https://placeholder.supabase.co';

const supabaseKey = rawSupabaseKey || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPERS ---

// Robust number parser
const safeNumber = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (val === null || val === undefined) return 0;
    
    if (typeof val === 'string') {
        let clean = val.trim();
        if (!clean || clean === 'NaN' || clean === 'null') return 0;

        clean = clean.replace(/[R$\s]/g, '');

        if (clean.includes(',') && !clean.includes('.')) {
             clean = clean.replace(',', '.');
        } else if (clean.includes('.') && clean.includes(',')) {
            const lastComma = clean.lastIndexOf(',');
            const lastDot = clean.lastIndexOf('.');
            if (lastComma > lastDot) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                clean = clean.replace(/,/g, '');
            }
        }
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

// Robust string parser
const safeString = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
};

export const formatCurrency = (value: number | string | undefined | null) => {
    const num = safeNumber(value);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

export const formatDateBr = (dateStr: string) => {
    if(!dateStr) return '-';
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
    const defaults: AppData = { stores: [], products: [], brands: [], suppliers: [], units: [], types: [], categories: [] };
    let loadedData: any = null;

    try {
        let { data, error } = await supabase.from('app_config').select('*').limit(1);
        if (data && data.length > 0) {
            const row = data[0];
            const rowKeys = Object.keys(row);
            const dataKey = rowKeys.find(k => k.toLowerCase() === 'data');
            if (dataKey) loadedData = row[dataKey];
        }
    } catch (e) {
        console.error("Error fetching AppData", e);
    }

    const config = { ...defaults };

    if (loadedData) {
        const keys = Object.keys(loadedData);
        const findKey = (target: string) => keys.find(k => k.toLowerCase() === target.toLowerCase());

        config.stores = loadedData[findKey('stores') || 'stores'] || [];
        config.products = loadedData[findKey('products') || 'products'] || [];
        config.brands = loadedData[findKey('brands') || 'brands'] || [];
        config.suppliers = loadedData[findKey('suppliers') || 'suppliers'] || [];
        config.units = loadedData[findKey('units') || 'units'] || [];
        config.types = loadedData[findKey('types') || 'types'] || [];
        config.categories = loadedData[findKey('categories') || 'categories'] || [];
    }

    // AUTO-RECONSTRUCTION
    if (config.stores.length === 0 || config.products.length === 0) {
        try {
            const { data: orders } = await supabase.from('orders').select('*');
            if (orders && orders.length > 0) {
                const uniqueStores = new Set<string>(config.stores);
                const uniqueProducts = new Set<string>(config.products);
                const uniqueBrands = new Set<string>(config.brands);
                const uniqueSuppliers = new Set<string>(config.suppliers);
                const uniqueTypes = new Set<string>(config.types);
                const uniqueCategories = new Set<string>(config.categories);

                orders.forEach((o: any) => {
                    const s = safeString(o.store || o.Store);
                    const p = safeString(o.product || o.Product);
                    const b = safeString(o.brand || o.Brand);
                    const sup = safeString(o.supplier || o.Supplier);
                    const t = safeString(o.type || o.Type);
                    const c = safeString(o.category || o.Category);

                    if (s) uniqueStores.add(s);
                    if (p) uniqueProducts.add(p);
                    if (b) uniqueBrands.add(b);
                    if (sup) uniqueSuppliers.add(sup);
                    if (t && t !== 'undefined') uniqueTypes.add(t);
                    if (c && c !== 'undefined') uniqueCategories.add(c);
                });

                config.stores = Array.from(uniqueStores).sort();
                config.products = Array.from(uniqueProducts).sort();
                config.brands = Array.from(uniqueBrands).sort();
                config.suppliers = Array.from(uniqueSuppliers).sort();
                config.types = Array.from(uniqueTypes).sort();
                config.categories = Array.from(uniqueCategories).sort();
                if (config.units.length === 0) config.units = ['Kg', 'Un', 'Lt', 'Cx', 'Pç'];
            }
        } catch (recError) {
            console.error("Reconstruction failed:", recError);
        }
    }

    return {
        stores: Array.isArray(config.stores) ? config.stores : [],
        products: Array.isArray(config.products) ? config.products : [],
        brands: Array.isArray(config.brands) ? config.brands : [],
        suppliers: Array.isArray(config.suppliers) ? config.suppliers : [],
        units: Array.isArray(config.units) ? config.units : [],
        types: Array.isArray(config.types) ? config.types : [],
        categories: Array.isArray(config.categories) ? config.categories : [],
    };
};

export const saveAppData = async (appData: AppData) => {
    const { error } = await supabase.from('app_config').upsert({ id: 1, data: appData });
    if (error) throw new Error(error.message);
};

// --- ORDERS ---

export const getOrders = async (): Promise<Order[]> => {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) throw new Error(error.message);
    
    return (data || []).map((order: any) => ({
        id: order.id,
        date: order.date ?? order.Date,
        store: safeString(order.store ?? order.Store),
        product: safeString(order.product ?? order.Product),
        brand: safeString(order.brand ?? order.Brand),
        supplier: safeString(order.supplier ?? order.Supplier),
        unitValue: safeNumber(order.unitValue ?? order.unitvalue ?? order.unit_value),
        unitMeasure: safeString(order.unitMeasure ?? order.unitmeasure ?? order.unit_measure),
        quantity: safeNumber(order.quantity ?? order.Quantity),
        totalValue: safeNumber(order.totalValue ?? order.totalvalue ?? order.total_value),
        deliveryDate: order.deliveryDate ?? order.deliverydate ?? order.delivery_date ?? null,
        type: safeString(order.type ?? order.Type),
        category: safeString(order.category ?? order.Category),
        createdAt: order.createdAt ?? order.createdat ?? order.created_at
    }));
};

export const saveOrder = async (order: Order) => {
    const { id, ...rest } = order;
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
        csvContent += `${row.date},${row.store},${row.product},${row.brand},${row.supplier},${safeNumber(row.quantity)},${safeNumber(row.unitValue)},${safeNumber(row.totalValue)},${row.deliveryDate||''}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- MEAT STOCK ---

export const getMeatConsumptionLogs = async (): Promise<MeatInventoryLog[]> => {
    const { data, error } = await supabase.from('meat_inventory_logs').select('*');
    if (error) console.error(error);
    return (data || []).map((log: any) => ({
        id: log.id,
        date: log.date ?? log.Date,
        store: safeString(log.store ?? log.Store),
        product: safeString(log.product ?? log.Product),
        quantity_consumed: safeNumber(log.quantity_consumed ?? log.quantityconsumed),
        created_at: log.created_at
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
        id: adj.id,
        date: adj.date,
        store: safeString(adj.store),
        product: safeString(adj.product),
        quantity: safeNumber(adj.quantity),
        reason: safeString(adj.reason),
        created_at: adj.created_at
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

// --- TRANSACTION 043 ---

export const getTransactions043 = async (): Promise<Transaction043[]> => {
    const { data, error } = await supabase.from('transactions_043').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((t: any) => ({ ...t, value: safeNumber(t.value) }));
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

// --- ACCOUNT BALANCES ---

export const getAccountBalances = async (): Promise<AccountBalance[]> => {
    const { data, error } = await supabase.from('account_balances').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((b: any) => ({
        ...b,
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

// --- OLD FINANCEIRO ---

export const getFinancialRecords = async (): Promise<FinancialRecord[]> => {
    const { data, error } = await supabase.from('financial_records').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({
        ...r,
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
};

// --- DAILY TRANSACTIONS (NOVO FINANCEIRO) ---

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
        // Prioritize Snake Case, fallback to CamelCase or Lowercase
        paymentDate: t.payment_date ?? t.paymentDate ?? t.paymentdate,
        accountId: t.account_id ?? t.accountId ?? t.accountid,
        destinationStore: t.destination_store ?? t.destinationStore ?? t.destinationstore,
        destinationAccountId: t.destination_account_id ?? t.destinationAccountId ?? t.destinationaccountid,
        paymentMethod: t.payment_method ?? t.paymentMethod ?? t.paymentmethod,
        createdAt: t.created_at ?? t.createdAt ?? t.createdat,
        value: safeNumber(t.value)
    }));
};

export const saveDailyTransaction = async (t: DailyTransaction) => {
    const { id, ...rest } = t;
    
    // MAPPING: Try to save using snake_case first (Postgres Standard)
    const snakeCasePayload = {
        date: rest.date,
        store: rest.store,
        type: rest.type,
        account_id: rest.accountId, // Map
        destination_store: rest.destinationStore, // Map
        destination_account_id: rest.destinationAccountId, // Map
        payment_method: rest.paymentMethod, // Map
        payment_date: rest.paymentDate, // Map
        product: rest.product,
        category: rest.category,
        supplier: rest.supplier,
        value: rest.value,
        status: rest.status,
        description: rest.description,
        classification: rest.classification,
        origin: rest.origin,
        // created_at usually auto-generated, but if we pass it:
        created_at: rest.createdAt
    };

    // Legacy fallback payload (CamelCase)
    const camelCasePayload = { ...rest };

    const performSave = async (payload: any) => {
        if (id) return await supabase.from('daily_transactions').update(payload).eq('id', id);
        else return await supabase.from('daily_transactions').insert([payload]);
    };

    // 1. Try Snake Case (Preferred)
    let result = await performSave(snakeCasePayload);

    // 2. If fail, try Camel Case (Legacy)
    if (result.error) {
        console.warn("Snake_case save failed, retrying with CamelCase...", result.error.message);
        result = await performSave(camelCasePayload);
    }

    // 3. If still fail, try Lower Case (Nuclear Option)
    if (result.error && (result.error.message.includes('column') || result.error.message.includes('find'))) {
        console.warn("CamelCase failed, retrying with lowercase...", result.error.message);
        const lowerCasePayload: any = {};
        Object.keys(camelCasePayload).forEach(key => {
            lowerCasePayload[key.toLowerCase()] = (camelCasePayload as any)[key];
        });
        result = await performSave(lowerCasePayload);
    }

    if (result.error) {
        throw new Error(`Erro de Banco de Dados: ${result.error.message}. \nTente executar o SQL de correção no menu Backup.`);
    }
};

export const deleteDailyTransaction = async (id: string) => {
    const { error } = await supabase.from('daily_transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

// --- USERS ---

export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('system_users').select('*');
    if (error) return [];
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
    if (username === 'Paulo' && password === 'Moita3033') {
        return { success: true, user: { id: 'master', name: 'Paulo (Mestre)', username: 'Paulo', permissions: { modules: [], stores: [] }, isMaster: true } };
    }
    const { data, error } = await supabase.from('system_users').select('*').eq('username', username).single();
    if (error || !data) return { success: false, message: 'Usuário não encontrado.' };
    if (data.password !== password) return { success: false, message: 'Senha incorreta.' };
    return { success: true, user: data };
};

export const changeUserPassword = async (userId: string, current: string, newPass: string) => {
    if (userId === 'master') throw new Error("Não é possível alterar senha do Admin Mestre por aqui.");
    const { data } = await supabase.from('system_users').select('password').eq('id', userId).single();
    if (data.password !== current) throw new Error("Senha atual incorreta.");
    const { error } = await supabase.from('system_users').update({ password: newPass }).eq('id', userId);
    if (error) throw new Error(error.message);
};

// --- BACKUP & UTILS ---

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

-- CORREÇÕES DE COLUNAS (ADICIONAR SE FALTAR) - PREFERÊNCIA SNAKE_CASE
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "accountId" TEXT; -- Legacy
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "account_id" TEXT; -- Standard
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "destinationStore" TEXT; -- Legacy
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "destination_store" TEXT; -- Standard
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "destinationAccountId" TEXT; -- Legacy
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "destination_account_id" TEXT; -- Standard
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT; -- Legacy
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "payment_method" TEXT; -- Standard
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "paymentDate" DATE; -- Legacy
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "payment_date" DATE; -- Standard
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "classification" TEXT;
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "origin" TEXT;
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT NOW();

-- CORREÇÕES TABELA DE PEDIDOS
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryDate" DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW();
`;
