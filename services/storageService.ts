
// ... existing imports ...
import { createClient } from '@supabase/supabase-js';
import { AppData, Order, Transaction043, AccountBalance, FinancialRecord, User, FinancialAccount, DailyTransaction, MeatInventoryLog, MeatStockAdjustment } from '../types';

// ... existing config setup ...
let supabaseUrl = '';
let supabaseKey = '';

try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        // @ts-ignore
        supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
} catch (e) {}

if (!supabaseUrl && typeof process !== 'undefined' && process.env) {
    try {
        // @ts-ignore
        supabaseUrl = process.env.VITE_SUPABASE_URL;
        // @ts-ignore
        supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    } catch (e) {}
}

const isConfigured = !!supabaseUrl && !!supabaseKey && !supabaseUrl.includes('missing');
export const supabase = createClient(supabaseUrl || 'https://missing-url.supabase.co', supabaseKey || 'missing-key');

export const SETUP_SQL = `
-- Tabela de Usuários do Sistema
CREATE TABLE IF NOT EXISTS system_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  store text,
  product text,
  brand text,
  supplier text,
  unit_measure text,
  unit_value numeric,
  quantity numeric,
  total_value numeric,
  delivery_date date,
  type text,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Configurações
CREATE TABLE IF NOT EXISTS app_configurations (
  category text PRIMARY KEY,
  items jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Tabela de Transações 043
CREATE TABLE IF NOT EXISTS transactions_043 (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  store text,
  type text, -- 'DEBIT' or 'CREDIT'
  value numeric,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Saldos de Contas (Antigo Financeiro)
CREATE TABLE IF NOT EXISTS account_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store text NOT NULL,
  year int NOT NULL,
  month text NOT NULL,
  caixa_economica numeric DEFAULT 0,
  cofre numeric DEFAULT 0,
  loteria numeric DEFAULT 0,
  pagbank_h numeric DEFAULT 0,
  pagbank_d numeric DEFAULT 0,
  investimentos numeric DEFAULT 0,
  total_balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Registros Financeiros (Receitas/Despesas - Antigo)
CREATE TABLE IF NOT EXISTS financial_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store text NOT NULL,
  year int NOT NULL,
  month text NOT NULL,
  credit_caixa numeric DEFAULT 0,
  credit_delta numeric DEFAULT 0,
  credit_pagbank_h numeric DEFAULT 0,
  credit_pagbank_d numeric DEFAULT 0,
  credit_ifood numeric DEFAULT 0,
  total_revenues numeric DEFAULT 0,
  debit_caixa numeric DEFAULT 0,
  debit_pagbank_h numeric DEFAULT 0,
  debit_pagbank_d numeric DEFAULT 0,
  debit_loteria numeric DEFAULT 0,
  total_expenses numeric DEFAULT 0,
  net_result numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- === NOVO FINANCEIRO ===

-- Tabela de Contas Bancárias/Caixas
CREATE TABLE IF NOT EXISTS financial_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  store text NOT NULL,
  initial_balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Lançamentos Diários (Novo Financeiro)
CREATE TABLE IF NOT EXISTS daily_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL, -- Vencimento
  payment_date date, -- Pagamento
  store text,
  type text, -- Receita, Despesa, Transferencia
  account_id uuid REFERENCES financial_accounts(id),
  destination_store text, -- Novo: Destino Transferencia
  destination_account_id uuid REFERENCES financial_accounts(id), -- Novo: Destino Transferencia
  payment_method text,
  product text,
  category text,
  supplier text,
  value numeric DEFAULT 0,
  status text DEFAULT 'Pendente', -- Pago, Pendente
  description text,
  classification text, -- Novo: Classificação (Fixo/Variável)
  origin text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- Tabela de Estoque de Carnes (Consumo)
CREATE TABLE IF NOT EXISTS meat_inventory_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  store text, -- Loja
  product text NOT NULL,
  quantity_consumed numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Ajustes Manuais de Estoque
CREATE TABLE IF NOT EXISTS meat_stock_adjustments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  store text, -- Loja
  product text NOT NULL,
  quantity numeric NOT NULL, -- Pode ser negativo para perda/saída
  reason text,
  created_at timestamptz DEFAULT now()
);

-- MIGRAÇÃO AUTOMÁTICA
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS destination_store text;
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS destination_account_id uuid REFERENCES financial_accounts(id);
ALTER TABLE daily_transactions ADD COLUMN IF NOT EXISTS classification text;
ALTER TABLE meat_inventory_logs ADD COLUMN IF NOT EXISTS store text;
ALTER TABLE meat_stock_adjustments ADD COLUMN IF NOT EXISTS store text;
`;

// ... existing diagnosis functions ...

export const checkConnection = async (): Promise<{ status: 'ok' | 'error' | 'config_missing', message: string, details?: string }> => {
    if (!isConfigured) return { status: 'config_missing', message: 'Variáveis não detectadas no ambiente.' };
    try {
        const { count, error } = await supabase.from('app_configurations').select('*', { count: 'exact', head: true });
        if (error) return { status: 'error', message: `Erro Supabase: ${error.message}` };
        return { status: 'ok', message: 'Conectado ao Supabase com sucesso!' };
    } catch (err: any) {
        return { status: 'error', message: `Erro de Rede/Cliente: ${err.message}` };
    }
};

export const getConfigStatus = () => ({
    urlConfigured: !!supabaseUrl,
    keyConfigured: !!supabaseKey,
    urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : '(vazio)'
});

export const isValidUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

// ... App Data functions ...
const defaultData: AppData = { stores: [], products: [], brands: [], suppliers: [], units: [], types: ['Variável', 'Fixa'], categories: [] };

export const getAppData = async (): Promise<AppData> => {
    const { data, error } = await supabase.from('app_configurations').select('*');
    if (error) return defaultData;
    const appData: AppData = { ...defaultData };
    data.forEach((row: any) => {
        if (appData.hasOwnProperty(row.category)) {
            // @ts-ignore
            appData[row.category] = row.items || [];
        }
    });
    if (appData.types.length === 0) appData.types = ['Variável', 'Fixa'];
    const sortList = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return {
        stores: sortList(appData.stores),
        products: sortList(appData.products),
        brands: sortList(appData.brands),
        suppliers: sortList(appData.suppliers),
        units: sortList(appData.units),
        types: sortList(appData.types),
        categories: sortList(appData.categories)
    };
};

export const saveAppData = async (data: AppData) => {
    const categories = [
        { category: 'stores', items: data.stores },
        { category: 'products', items: data.products },
        { category: 'brands', items: data.brands },
        { category: 'suppliers', items: data.suppliers },
        { category: 'units', items: data.units },
        { category: 'types', items: data.types },
        { category: 'categories', items: data.categories },
    ];
    for (const cat of categories) {
        await supabase.from('app_configurations').upsert({ category: cat.category, items: cat.items }, { onConflict: 'category' });
    }
};

// --- ORDERS ---
export const getOrders = async (): Promise<Order[]> => {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) return [];
    return data.map((item: any) => ({
        id: item.id,
        date: item.date,
        store: item.store,
        product: item.product,
        brand: item.brand,
        supplier: item.supplier,
        unitMeasure: item.unit_measure,
        unitValue: item.unit_value,
        quantity: item.quantity,
        totalValue: item.total_value,
        deliveryDate: item.delivery_date,
        type: item.type,
        category: item.category,
        createdAt: item.created_at
    }));
};

export const saveOrder = async (order: Order) => {
    const payload: any = {
        date: order.date,
        store: order.store,
        product: order.product,
        brand: order.brand,
        supplier: order.supplier,
        unit_measure: order.unitMeasure,
        unit_value: order.unitValue,
        quantity: order.quantity,
        total_value: order.totalValue,
        delivery_date: order.deliveryDate,
        type: order.type,
        category: order.category
    };
    
    if (order.id) {
        const { error } = await supabase.from('orders').update(payload).eq('id', order.id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('orders').insert([payload]);
        if (error) throw new Error(error.message);
    }
};

export const deleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const updateOrder = async (order: Order) => {
    return saveOrder(order);
};

export const getLastOrderForProduct = async (productName: string): Promise<Order | null> => {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('product', productName)
        .order('date', { ascending: false })
        .limit(1);
    
    if (error || !data || data.length === 0) return null;
    const item = data[0];
    return {
        id: item.id,
        date: item.date,
        store: item.store,
        product: item.product,
        brand: item.brand,
        supplier: item.supplier,
        unitMeasure: item.unit_measure,
        unitValue: item.unit_value,
        quantity: item.quantity,
        totalValue: item.total_value,
        deliveryDate: item.delivery_date,
        type: item.type,
        category: item.category
    };
};

// --- TRANSACTIONS 043 ---
export const getTransactions043 = async (): Promise<Transaction043[]> => {
    const { data, error } = await supabase.from('transactions_043').select('*');
    if (error) return [];
    return data.map((item: any) => ({
        id: item.id,
        date: item.date,
        store: item.store,
        type: item.type,
        value: item.value,
        description: item.description
    }));
};

export const saveTransaction043 = async (transaction: Transaction043) => {
    const payload = {
        date: transaction.date,
        store: transaction.store,
        type: transaction.type,
        value: transaction.value,
        description: transaction.description
    };
    if (transaction.id) {
        const { error } = await supabase.from('transactions_043').update(payload).eq('id', transaction.id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('transactions_043').insert([payload]);
        if (error) throw new Error(error.message);
    }
};

export const deleteTransaction043 = async (id: string) => {
    const { error } = await supabase.from('transactions_043').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const updateTransaction043 = async (transaction: Transaction043) => {
    return saveTransaction043(transaction);
};

// --- ACCOUNT BALANCES (Financeiro Antigo / Saldo) ---
export const getAccountBalances = async (): Promise<AccountBalance[]> => {
    const { data, error } = await supabase.from('account_balances').select('*');
    if (error) return [];
    return data.map((item: any) => ({
        id: item.id,
        store: item.store,
        year: item.year,
        month: item.month,
        caixaEconomica: item.caixa_economica,
        cofre: item.cofre,
        loteria: item.loteria,
        pagbankH: item.pagbank_h,
        pagbankD: item.pagbank_d,
        investimentos: item.investimentos,
        totalBalance: item.total_balance
    }));
};

export const saveAccountBalance = async (balance: AccountBalance) => {
    const payload = {
        store: balance.store,
        year: balance.year,
        month: balance.month,
        caixa_economica: balance.caixaEconomica,
        cofre: balance.cofre,
        loteria: balance.loteria,
        pagbank_h: balance.pagbankH,
        pagbank_d: balance.pagbankD,
        investimentos: balance.investimentos,
        total_balance: balance.totalBalance
    };
    if (balance.id) {
        const { error } = await supabase.from('account_balances').update(payload).eq('id', balance.id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('account_balances').insert([payload]);
        if (error) throw new Error(error.message);
    }
};

export const updateAccountBalance = async (balance: AccountBalance) => saveAccountBalance(balance);

export const deleteAccountBalance = async (id: string) => {
    const { error } = await supabase.from('account_balances').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getPreviousMonthBalance = async (store: string, year: number, month: string): Promise<AccountBalance | null> => {
    let prevYear = year;
    let prevMonthInt = parseInt(month, 10) - 1;
    if (prevMonthInt === 0) {
        prevMonthInt = 12;
        prevYear -= 1;
    }
    const prevMonthStr = String(prevMonthInt).padStart(2, '0');

    const { data, error } = await supabase
        .from('account_balances')
        .select('*')
        .eq('store', store)
        .eq('year', prevYear)
        .eq('month', prevMonthStr)
        .limit(1);

    if (error || !data || data.length === 0) return null;
    const item = data[0];
    return {
        id: item.id,
        store: item.store,
        year: item.year,
        month: item.month,
        caixaEconomica: item.caixa_economica,
        cofre: item.cofre,
        loteria: item.loteria,
        pagbankH: item.pagbank_h,
        pagbankD: item.pagbank_d,
        investimentos: item.investimentos,
        totalBalance: item.total_balance
    };
};

// --- FINANCIAL RECORDS (Entradas e Saídas - Antigo) ---
export const getFinancialRecords = async (): Promise<FinancialRecord[]> => {
    const { data, error } = await supabase.from('financial_records').select('*');
    if (error) return [];
    return data.map((item: any) => ({
        id: item.id,
        store: item.store,
        year: item.year,
        month: item.month,
        creditCaixa: item.credit_caixa,
        creditDelta: item.credit_delta,
        creditPagBankH: item.credit_pagbank_h,
        creditPagBankD: item.credit_pagbank_d,
        creditIfood: item.credit_ifood,
        totalRevenues: item.total_revenues,
        debitCaixa: item.debit_caixa,
        debitPagBankH: item.debit_pagbank_h,
        debitPagBankD: item.debit_pagbank_d,
        debitLoteria: item.debit_loteria,
        totalExpenses: item.total_expenses,
        netResult: item.net_result
    }));
};

export const saveFinancialRecord = async (record: FinancialRecord) => {
    const payload = {
        store: record.store,
        year: record.year,
        month: record.month,
        credit_caixa: record.creditCaixa,
        credit_delta: record.creditDelta,
        credit_pagbank_h: record.creditPagBankH,
        credit_pagbank_d: record.creditPagBankD,
        credit_ifood: record.creditIfood,
        total_revenues: record.totalRevenues,
        debit_caixa: record.debitCaixa,
        debit_pagbank_h: record.debitPagBankH,
        debit_pagbank_d: record.debitPagBankD,
        debit_loteria: record.debitLoteria,
        total_expenses: record.totalExpenses,
        net_result: record.netResult
    };
    if (record.id) {
        const { error } = await supabase.from('financial_records').update(payload).eq('id', record.id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('financial_records').insert([payload]);
        if (error) throw new Error(error.message);
    }
};

export const updateFinancialRecord = async (record: FinancialRecord) => saveFinancialRecord(record);

export const deleteFinancialRecord = async (id: string) => {
    const { error } = await supabase.from('financial_records').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

// --- NOVO FINANCEIRO (CONTAS E LANÇAMENTOS) ---

export const getFinancialAccounts = async (): Promise<FinancialAccount[]> => {
    const { data, error } = await supabase.from('financial_accounts').select('*');
    if (error) return [];
    return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        store: item.store,
        initialBalance: item.initial_balance
    }));
};

export const saveFinancialAccount = async (account: FinancialAccount) => {
    const { error } = await supabase.from('financial_accounts').insert([{
        name: account.name,
        store: account.store,
        initial_balance: account.initialBalance
    }]);
    if (error) throw new Error(error.message);
};

export const updateFinancialAccount = async (account: FinancialAccount) => {
    const { error } = await supabase.from('financial_accounts').update({
        name: account.name,
        store: account.store,
        initial_balance: account.initialBalance
    }).eq('id', account.id);
    if (error) throw new Error(error.message);
};

export const deleteFinancialAccount = async (id: string) => {
    const { error } = await supabase.from('financial_accounts').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getDailyTransactions = async (): Promise<DailyTransaction[]> => {
    const { data, error } = await supabase.from('daily_transactions').select('*');
    if (error) return [];
    return data.map((item: any) => ({
        id: item.id,
        date: item.date,
        paymentDate: item.payment_date,
        store: item.store,
        type: item.type,
        accountId: item.account_id,
        destinationStore: item.destination_store,
        destinationAccountId: item.destination_account_id,
        paymentMethod: item.payment_method,
        product: item.product,
        category: item.category,
        supplier: item.supplier,
        value: item.value,
        status: item.status,
        description: item.description,
        classification: item.classification,
        origin: item.origin,
        createdAt: item.created_at
    }));
};

export const saveDailyTransaction = async (t: DailyTransaction) => {
    const payload: any = {
        date: t.date,
        payment_date: t.paymentDate,
        store: t.store,
        type: t.type,
        account_id: t.accountId,
        destination_store: t.destinationStore,
        destination_account_id: t.destinationAccountId,
        payment_method: t.paymentMethod,
        product: t.product,
        category: t.category,
        supplier: t.supplier,
        value: t.value,
        status: t.status,
        description: t.description,
        classification: t.classification,
        origin: t.origin
    };
    
    if (t.id) {
        const { error } = await supabase.from('daily_transactions').update(payload).eq('id', t.id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('daily_transactions').insert([payload]);
        if (error) throw new Error(error.message);
    }
};

export const deleteDailyTransaction = async (id: string) => {
    const { error } = await supabase.from('daily_transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

// --- ESTOQUE DE CARNES ---

export const getMeatConsumptionLogs = async (): Promise<MeatInventoryLog[]> => {
    const { data, error } = await supabase.from('meat_inventory_logs').select('*');
    if (error) return [];
    return data.map((item: any) => ({
        id: item.id,
        date: item.date,
        store: item.store,
        product: item.product,
        quantity_consumed: item.quantity_consumed,
        created_at: item.created_at
    }));
};

export const saveMeatConsumption = async (log: MeatInventoryLog) => {
    const { error } = await supabase.from('meat_inventory_logs').insert([{
        date: log.date,
        store: log.store,
        product: log.product,
        quantity_consumed: log.quantity_consumed
    }]);
    if (error) throw new Error(error.message);
};

export const updateMeatConsumption = async (id: string, quantity: number) => {
    const { error } = await supabase
        .from('meat_inventory_logs')
        .update({ quantity_consumed: quantity })
        .eq('id', id);
    if (error) throw new Error(error.message);
};

export const deleteMeatConsumption = async (id: string) => {
    const { error } = await supabase
        .from('meat_inventory_logs')
        .delete()
        .eq('id', id);
    if (error) throw new Error(error.message);
};

export const getMeatAdjustments = async (): Promise<MeatStockAdjustment[]> => {
    const { data, error } = await supabase.from('meat_stock_adjustments').select('*');
    if (error) return [];
    return data.map((item: any) => ({
        id: item.id,
        date: item.date,
        store: item.store,
        product: item.product,
        quantity: item.quantity,
        reason: item.reason,
        created_at: item.created_at
    }));
};

export const saveMeatAdjustment = async (adj: MeatStockAdjustment) => {
    const { error } = await supabase.from('meat_stock_adjustments').insert([{
        date: adj.date,
        store: adj.store,
        product: adj.product,
        quantity: adj.quantity,
        reason: adj.reason
    }]);
    if (error) throw new Error(error.message);
};

// --- USERS & AUTH (SIMPLIFIED) ---

export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('system_users').select('*');
    if (error) return [];
    return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        password: u.password, // Needed for edit/auth check (usually hidden)
        permissions: u.permissions || { modules: [], stores: [] }
    }));
};

export const saveUser = async (user: User) => {
    const payload = {
        name: user.name,
        username: user.username,
        password: user.password,
        permissions: user.permissions
    };
    if (user.id) {
        const { error } = await supabase.from('system_users').update(payload).eq('id', user.id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('system_users').insert([payload]);
        if (error) throw new Error(error.message);
    }
};

export const deleteUser = async (id: string) => {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const loginUser = async (username: string, password: string): Promise<{ success: boolean, user?: User, message?: string }> => {
    // Master Admin Hardcoded
    if (username === 'admin' && password === 'admin123') {
        return { 
            success: true, 
            user: { 
                id: 'master-admin', 
                name: 'Administrador Master', 
                username: 'admin', 
                permissions: { modules: [], stores: [] }, 
                isMaster: true 
            } 
        };
    }

    const users = await getUsers();
    const found = users.find(u => u.username === username && u.password === password);
    
    if (found) {
        return { success: true, user: found };
    }
    
    return { success: false, message: 'Usuário ou senha incorretos.' };
};

export const changeUserPassword = async (userId: string, oldPass: string, newPass: string) => {
    if (userId === 'master-admin') throw new Error('Não é possível alterar senha do Admin Master aqui.');
    
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) throw new Error('Usuário não encontrado.');
    if (user.password !== oldPass) throw new Error('Senha atual incorreta.');
    
    await saveUser({ ...user, password: newPass });
};

// --- UTILS ---

export const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDateBr = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

export const getTodayLocalISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

// --- BACKUP / EXPORT ---

export const createBackup = async () => {
    const [
        config, 
        orders, 
        trans043, 
        balances, 
        finRecords, 
        users, 
        finAccounts, 
        dailyTrans,
        meatLogs,
        meatAdj
    ] = await Promise.all([
        getAppData(),
        getOrders(),
        getTransactions043(),
        getAccountBalances(),
        getFinancialRecords(),
        getUsers(),
        getFinancialAccounts(),
        getDailyTransactions(),
        getMeatConsumptionLogs(),
        getMeatAdjustments()
    ]);

    const backupData = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        data: {
            app_configurations: config,
            orders,
            transactions_043: trans043,
            account_balances: balances,
            financial_records: finRecords,
            system_users: users,
            financial_accounts: finAccounts,
            daily_transactions: dailyTrans,
            meat_inventory_logs: meatLogs,
            meat_stock_adjustments: meatAdj
        }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_herogrill_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const restoreBackup = async (file: File): Promise<{ success: boolean, message: string }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const backup = JSON.parse(content);
                
                if (!backup.data) throw new Error('Formato de backup inválido');

                // Restore Configs
                await saveAppData(backup.data.app_configurations || defaultData);

                // Restore Orders - Clear and Insert
                const { error: err1 } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (err1) throw err1;
                if (backup.data.orders?.length) {
                    // Convert camelCase to snake_case for DB
                    const dbOrders = backup.data.orders.map((o: Order) => ({
                        id: o.id,
                        date: o.date,
                        store: o.store,
                        product: o.product,
                        brand: o.brand,
                        supplier: o.supplier,
                        unit_measure: o.unitMeasure,
                        unit_value: o.unitValue,
                        quantity: o.quantity,
                        total_value: o.totalValue,
                        delivery_date: o.deliveryDate,
                        type: o.type,
                        category: o.category,
                        created_at: o.createdAt
                    }));
                    const { error } = await supabase.from('orders').insert(dbOrders);
                    if (error) throw error;
                }

                // Restore Transactions 043
                const { error: err2 } = await supabase.from('transactions_043').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (err2) throw err2;
                if (backup.data.transactions_043?.length) {
                    const dbTrans = backup.data.transactions_043.map((t: Transaction043) => ({
                        id: t.id,
                        date: t.date,
                        store: t.store,
                        type: t.type,
                        value: t.value,
                        description: t.description
                    }));
                    const { error } = await supabase.from('transactions_043').insert(dbTrans);
                    if (error) throw error;
                }

                // Restore Account Balances
                const { error: err3 } = await supabase.from('account_balances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (err3) throw err3;
                if (backup.data.account_balances?.length) {
                    const dbBal = backup.data.account_balances.map((b: AccountBalance) => ({
                        id: b.id,
                        store: b.store,
                        year: b.year,
                        month: b.month,
                        caixa_economica: b.caixaEconomica,
                        cofre: b.cofre,
                        loteria: b.loteria,
                        pagbank_h: b.pagbankH,
                        pagbank_d: b.pagbankD,
                        investimentos: b.investimentos,
                        total_balance: b.totalBalance
                    }));
                    const { error } = await supabase.from('account_balances').insert(dbBal);
                    if (error) throw error;
                }

                // Restore Financial Records
                const { error: err4 } = await supabase.from('financial_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (err4) throw err4;
                if (backup.data.financial_records?.length) {
                    const dbFin = backup.data.financial_records.map((r: FinancialRecord) => ({
                        id: r.id,
                        store: r.store,
                        year: r.year,
                        month: r.month,
                        credit_caixa: r.creditCaixa,
                        credit_delta: r.creditDelta,
                        credit_pagbank_h: r.creditPagBankH,
                        credit_pagbank_d: r.creditPagBankD,
                        credit_ifood: r.creditIfood,
                        total_revenues: r.totalRevenues,
                        debit_caixa: r.debitCaixa,
                        debit_pagbank_h: r.debitPagBankH,
                        debit_pagbank_d: r.debitPagBankD,
                        debit_loteria: r.debitLoteria,
                        total_expenses: r.totalExpenses,
                        net_result: r.netResult
                    }));
                    const { error } = await supabase.from('financial_records').insert(dbFin);
                    if (error) throw error;
                }

                // Restore Users (Optional, usually handled separately but included for full restore)
                if (backup.data.system_users?.length) {
                    // Avoid deleting master admin or current user session issues ideally, but for full restore:
                    const { error: err5 } = await supabase.from('system_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    if (err5) throw err5;
                    
                    const dbUsers = backup.data.system_users.map((u: User) => ({
                        id: u.id,
                        name: u.name,
                        username: u.username,
                        password: u.password,
                        permissions: u.permissions
                    }));
                    const { error } = await supabase.from('system_users').insert(dbUsers);
                    if (error) throw error;
                }

                // Restore New Financeiro (Accounts & Daily Trans)
                if (backup.data.financial_accounts?.length) {
                    const { error: err6 } = await supabase.from('financial_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    if (err6) throw err6;
                    
                    const dbAcc = backup.data.financial_accounts.map((a: FinancialAccount) => ({
                        id: a.id,
                        name: a.name,
                        store: a.store,
                        initial_balance: a.initialBalance
                    }));
                    const { error } = await supabase.from('financial_accounts').insert(dbAcc);
                    if (error) throw error;
                }

                if (backup.data.daily_transactions?.length) {
                    const { error: err7 } = await supabase.from('daily_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    if (err7) throw err7;
                    
                    const dbDaily = backup.data.daily_transactions.map((t: DailyTransaction) => ({
                        id: t.id,
                        date: t.date,
                        payment_date: t.paymentDate,
                        store: t.store,
                        type: t.type,
                        account_id: t.accountId,
                        destination_store: t.destinationStore,
                        destination_account_id: t.destinationAccountId,
                        payment_method: t.paymentMethod,
                        product: t.product,
                        category: t.category,
                        supplier: t.supplier,
                        value: t.value,
                        status: t.status,
                        description: t.description,
                        classification: t.classification,
                        origin: t.origin
                    }));
                    const { error } = await supabase.from('daily_transactions').insert(dbDaily);
                    if (error) throw error;
                }

                // Restore Meat Stock Logs
                if (backup.data.meat_inventory_logs?.length) {
                    const { error: err8 } = await supabase.from('meat_inventory_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    if (!err8) {
                        const dbLogs = backup.data.meat_inventory_logs.map((l: MeatInventoryLog) => ({
                            id: l.id,
                            date: l.date,
                            store: l.store,
                            product: l.product,
                            quantity_consumed: l.quantity_consumed,
                            created_at: l.created_at
                        }));
                        await supabase.from('meat_inventory_logs').insert(dbLogs);
                    }
                }

                if (backup.data.meat_stock_adjustments?.length) {
                    const { error: err9 } = await supabase.from('meat_stock_adjustments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    if (!err9) {
                        const dbAdj = backup.data.meat_stock_adjustments.map((a: MeatStockAdjustment) => ({
                            id: a.id,
                            date: a.date,
                            store: a.store,
                            product: a.product,
                            quantity: a.quantity,
                            reason: a.reason,
                            created_at: a.created_at
                        }));
                        await supabase.from('meat_stock_adjustments').insert(dbAdj);
                    }
                }

                resolve({ success: true, message: 'Backup restaurado com sucesso!' });
            } catch (err: any) {
                console.error(err);
                resolve({ success: false, message: `Erro na restauração: ${err.message}` });
            }
        };
        reader.readAsText(file);
    });
};

export const exportToXML = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    let xmlContent = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Sheet1"><Table>';
    
    // Headers
    xmlContent += '<Row>';
    headers.forEach(header => {
        xmlContent += `<Cell><Data ss:Type="String">${header.toUpperCase()}</Data></Cell>`;
    });
    xmlContent += '</Row>';

    // Data
    data.forEach(row => {
        xmlContent += '<Row>';
        headers.forEach(header => {
            const value = row[header];
            const type = typeof value === 'number' ? 'Number' : 'String';
            xmlContent += `<Cell><Data ss:Type="${type}">${value ?? ''}</Data></Cell>`;
        });
        xmlContent += '</Row>';
    });

    xmlContent += '</Table></Worksheet></Workbook>';
    
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

export const exportTransactionsToXML = (data: Transaction043[], filename: string) => {
    const formatted = data.map(t => ({
        DATA: formatDateBr(t.date),
        LOJA: t.store,
        TIPO: t.type === 'DEBIT' ? 'DÉBITO' : 'CRÉDITO',
        VALOR: t.value,
        DESCRICAO: t.description
    }));
    exportToXML(formatted, filename);
};

export const exportBalancesToXML = (data: any[], filename: string) => {
    const formatted = data.map(b => ({
        PERIODO: `${b.month}/${b.year}`,
        LOJA: b.store,
        CX_ECONOMICA: b.caixaEconomica,
        COFRE: b.cofre,
        LOTERIA: b.loteria,
        PAGBANK_H: b.pagbankH,
        PAGBANK_D: b.pagbankD,
        INVESTIMENTOS: b.investimentos,
        TOTAL: b.totalBalance,
        VARIACAO: b.variation
    }));
    exportToXML(formatted, filename);
};

export const exportFinancialToXML = (data: any[], filename: string) => {
    const formatted = data.map(r => ({
        PERIODO: `${r.month}/${r.year}`,
        LOJA: r.store,
        TOTAL_RECEITAS: r.totalRevenues,
        TOTAL_DESPESAS: r.totalExpenses,
        RESULTADO: r.netResult
    }));
    exportToXML(formatted, filename);
};

export const generateMockData = async () => {
    // Função auxiliar para desenvolvimento
    const mockOrders: Order[] = [
        { id: '', date: '2024-01-15', store: 'Hero Centro', product: 'Alcatra', brand: 'Friboi', supplier: 'JBS', unitMeasure: 'Kg', unitValue: 35.90, quantity: 50, totalValue: 1795, deliveryDate: '2024-01-15', type: 'Variável', category: 'Açougue' },
        { id: '', date: '2024-01-20', store: 'Hero Shopping', product: 'Carvão', brand: 'Bom Fogo', supplier: 'Distribuidora X', unitMeasure: 'Un', unitValue: 15.00, quantity: 100, totalValue: 1500, deliveryDate: '2024-01-20', type: 'Variável', category: 'Insumos' },
    ];
    for (const o of mockOrders) await saveOrder(o);
    alert('Dados de teste inseridos!');
    window.location.reload();
};
