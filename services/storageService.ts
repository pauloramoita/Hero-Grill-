
import { createClient } from '@supabase/supabase-js';
import { AppData, Order, Transaction043, AccountBalance, FinancialRecord, User } from '../types';

// === CONFIGURAÇÃO SUPABASE ===

let supabaseUrl = '';
let supabaseKey = '';

// Leitura segura das variáveis de ambiente
try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        // @ts-ignore
        supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
} catch (e) {
    console.warn("Ambiente não suporta import.meta.env ou acesso falhou.");
}

// Fallback para process.env
if (!supabaseUrl && typeof process !== 'undefined' && process.env) {
    try {
        // @ts-ignore
        supabaseUrl = process.env.VITE_SUPABASE_URL;
        // @ts-ignore
        supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    } catch (e) {}
}

const isConfigured = !!supabaseUrl && !!supabaseKey && !supabaseUrl.includes('missing');

if (!isConfigured) {
    console.error("⚠️ AVISO: Credenciais do Supabase não encontradas. O sistema usará URL placeholder e falhará nas requisições.");
}

// Inicializa cliente
export const supabase = createClient(
    supabaseUrl || 'https://missing-url.supabase.co', 
    supabaseKey || 'missing-key'
);

// === SQL DE SETUP (CONSTANTE) ===
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

-- Tabela de Pedidos (Atualizada com Tipo e Categoria)
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
  type text, -- Novo campo: Variável ou Fixa
  category text, -- Novo campo
  created_at timestamptz DEFAULT now()
);

-- MIGRATION: Adicionar colunas caso não existam (Para bancos já criados)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='type') THEN
        ALTER TABLE orders ADD COLUMN type text DEFAULT 'Variável';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='category') THEN
        ALTER TABLE orders ADD COLUMN category text;
    END IF;
END $$;

-- Tabela de Configurações (Lojas, Produtos, etc)
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

-- Tabela de Saldos de Contas
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

-- Tabela de Registros Financeiros (Receitas/Despesas)
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
`;

// === DIAGNÓSTICO ===

export const checkConnection = async (): Promise<{ status: 'ok' | 'error' | 'config_missing', message: string, details?: string }> => {
    if (!isConfigured) {
        return { 
            status: 'config_missing', 
            message: 'Variáveis não detectadas no ambiente.',
            details: 'Certifique-se de ter criado o arquivo .env na raiz e reiniciado o servidor.'
        };
    }

    try {
        // Tenta uma query leve (HEAD)
        const { count, error } = await supabase.from('app_configurations').select('*', { count: 'exact', head: true });
        
        if (error) {
            return { status: 'error', message: `Erro Supabase: ${error.message} (Code: ${error.code})` };
        }
        
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

// === APP DATA (CONFIGURAÇÕES) ===

const defaultData: AppData = {
    stores: [],
    products: [],
    brands: [],
    suppliers: [],
    units: [],
    types: ['Variável', 'Fixa'], // Padrão solicitado
    categories: []
};

export const getAppData = async (): Promise<AppData> => {
    const { data, error } = await supabase.from('app_configurations').select('*');
    
    if (error) {
        console.error("Erro ao buscar app_data:", error);
        return defaultData;
    }

    const appData: AppData = { ...defaultData };
    
    data.forEach((row: any) => {
        if (row.category === 'stores') appData.stores = row.items || [];
        if (row.category === 'products') appData.products = row.items || [];
        if (row.category === 'brands') appData.brands = row.items || [];
        if (row.category === 'suppliers') appData.suppliers = row.items || [];
        if (row.category === 'units') appData.units = row.items || [];
        if (row.category === 'types') appData.types = row.items || [];
        if (row.category === 'categories') appData.categories = row.items || [];
    });

    // Garante que "Variável" e "Fixa" estejam presentes se a lista de types vier vazia do banco (primeiro acesso)
    if (appData.types.length === 0) {
        appData.types = ['Variável', 'Fixa'];
    }

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
        const { error } = await supabase
            .from('app_configurations')
            .upsert({ category: cat.category, items: cat.items }, { onConflict: 'category' });
            
        if (error) console.error(`Erro ao salvar ${cat.category}:`, error);
    }
};

// === AUTHENTICATION & USERS ===

const MASTER_USER: User = {
    id: 'master-001',
    name: 'Administrador Mestre',
    username: 'Administrador',
    permissions: {
        modules: ['pedidos', 'controle043', 'saldo', 'financeiro', 'backup', 'admin'],
        stores: [] // Empty implies all for master logic
    },
    isMaster: true
};

export const loginUser = async (username: string, password: string): Promise<{success: boolean, user?: User, message?: string}> => {
    // 1. Check Master User
    if (username === 'Administrador' && password === 'Moita3033') {
        return { success: true, user: MASTER_USER };
    }

    // 2. Check Database Users
    try {
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error) {
            // Se tabela não existe, erro específico
            if(error.message?.includes("does not exist")) {
                return { success: false, message: 'Erro de Configuração: Tabela de usuários não existe. Entre como Administrador para corrigir.' };
            }
            return { success: false, message: 'Usuário ou senha incorretos.' };
        }
        
        if (!data) {
            return { success: false, message: 'Usuário ou senha incorretos.' };
        }

        const user: User = {
            id: data.id,
            name: data.name,
            username: data.username,
            permissions: data.permissions || { modules: [], stores: [] }
        };

        return { success: true, user };
    } catch (e) {
        return { success: false, message: 'Erro ao conectar com banco de dados.' };
    }
};

export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('system_users').select('*');
    if (error) return [];
    
    return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        password: u.password,
        permissions: u.permissions
    }));
};

export const saveUser = async (user: User) => {
    // Não permite salvar o admin mestre no banco
    if (user.username === 'Administrador') throw new Error("Nome de usuário reservado.");

    const dbUser = {
        name: user.name,
        username: user.username,
        password: user.password,
        permissions: user.permissions
    };

    if (user.id) {
        // Update
        const { error } = await supabase.from('system_users').update(dbUser).eq('id', user.id);
        if (error) throw new Error(error.message);
    } else {
        // Insert
        // Check if exists
        const { data: existing } = await supabase.from('system_users').select('id').eq('username', user.username);
        if (existing && existing.length > 0) throw new Error("Usuário já existe.");

        const { error } = await supabase.from('system_users').insert(dbUser);
        if (error) throw new Error(error.message);
    }
};

export const deleteUser = async (id: string) => {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) throw new Error(error.message);
};


// === ORDERS ===

export const getOrders = async (): Promise<Order[]> => {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) {
        console.error("Erro ao buscar pedidos:", error);
        return [];
    }
    
    return data.map((o: any) => ({
        id: o.id,
        date: o.date,
        store: o.store,
        product: o.product,
        brand: o.brand,
        supplier: o.supplier,
        unitMeasure: o.unit_measure,
        unitValue: o.unit_value,
        quantity: o.quantity,
        totalValue: o.total_value,
        deliveryDate: o.delivery_date,
        type: o.type || 'Variável',
        category: o.category
    }));
};

export const getLastOrderForProduct = async (productName: string): Promise<Order | undefined> => {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('product', productName)
        .order('date', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) return undefined;

    const o = data[0];
    return {
        id: o.id,
        date: o.date,
        store: o.store,
        product: o.product,
        brand: o.brand,
        supplier: o.supplier,
        unitMeasure: o.unit_measure,
        unitValue: o.unit_value,
        quantity: o.quantity,
        totalValue: o.total_value,
        deliveryDate: o.delivery_date,
        type: o.type,
        category: o.category
    };
};

export const saveOrder = async (order: Order) => {
    const dbOrder = {
        // id: order.id, // DB Generate UUID on insert
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
    
    const { error } = await supabase.from('orders').insert(dbOrder);
    if (error) throw new Error("Erro ao salvar pedido: " + error.message);
};

export const updateOrder = async (order: Order) => {
    const dbOrder = {
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

    const { error } = await supabase.from('orders').update(dbOrder).eq('id', order.id);
    if (error) throw new Error("Erro ao atualizar pedido: " + error.message);
};

export const deleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw new Error("Erro ao excluir pedido: " + error.message);
};

// === CONTROLE 043 ===

export const getTransactions043 = async (): Promise<Transaction043[]> => {
    const { data, error } = await supabase.from('transactions_043').select('*');
    if (error) {
        console.error("Erro 043:", error);
        return [];
    }
    return data.map((t: any) => ({
        id: t.id,
        date: t.date,
        store: t.store,
        type: t.type,
        value: t.value,
        description: t.description
    }));
};

export const saveTransaction043 = async (transaction: Transaction043) => {
    const { error } = await supabase.from('transactions_043').insert({
        date: transaction.date,
        store: transaction.store,
        type: transaction.type,
        value: transaction.value,
        description: transaction.description
    });
    if (error) throw new Error(error.message);
};

export const updateTransaction043 = async (transaction: Transaction043) => {
    const { error } = await supabase.from('transactions_043').update({
        date: transaction.date,
        store: transaction.store,
        type: transaction.type,
        value: transaction.value,
        description: transaction.description
    }).eq('id', transaction.id);
    if (error) throw new Error(error.message);
};

export const deleteTransaction043 = async (id: string) => {
    const { error } = await supabase.from('transactions_043').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

// === SALDO CONTAS ===

export const getAccountBalances = async (): Promise<AccountBalance[]> => {
    const { data, error } = await supabase.from('account_balances').select('*');
    if (error) {
        console.error("Erro Saldo:", error);
        return [];
    }
    return data.map((b: any) => ({
        id: b.id,
        store: b.store,
        year: b.year,
        month: b.month,
        caixaEconomica: b.caixa_economica,
        cofre: b.cofre,
        loteria: b.loteria,
        pagbankH: b.pagbank_h,
        pagbankD: b.pagbank_d,
        investimentos: b.investimentos,
        totalBalance: b.total_balance
    }));
};

export const saveAccountBalance = async (balance: AccountBalance) => {
    const { data: existing } = await supabase
        .from('account_balances')
        .select('id')
        .eq('store', balance.store)
        .eq('year', balance.year)
        .eq('month', balance.month);

    if (existing && existing.length > 0) {
        throw new Error("Já existe um lançamento para esta Loja neste Mês/Ano.");
    }

    const { error } = await supabase.from('account_balances').insert({
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
    });
    if (error) throw new Error(error.message);
};

export const updateAccountBalance = async (balance: AccountBalance) => {
    const { error } = await supabase.from('account_balances').update({
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
    }).eq('id', balance.id);
    if (error) throw new Error(error.message);
};

export const deleteAccountBalance = async (id: string) => {
    const { error } = await supabase.from('account_balances').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getPreviousMonthBalance = async (store: string, currentYear: number, currentMonth: string): Promise<AccountBalance | undefined> => {
    let prevYear = currentYear;
    let prevMonthInt = parseInt(currentMonth, 10) - 1;
    
    if (prevMonthInt === 0) {
        prevMonthInt = 12;
        prevYear = currentYear - 1;
    }
    
    const prevMonthStr = prevMonthInt.toString().padStart(2, '0');
    
    const { data } = await supabase
        .from('account_balances')
        .select('*')
        .eq('store', store)
        .eq('year', prevYear)
        .eq('month', prevMonthStr)
        .single();

    if (!data) return undefined;

    return {
        id: data.id,
        store: data.store,
        year: data.year,
        month: data.month,
        caixaEconomica: data.caixa_economica,
        cofre: data.cofre,
        loteria: data.loteria,
        pagbankH: data.pagbank_h,
        pagbankD: data.pagbank_d,
        investimentos: data.investimentos,
        totalBalance: data.total_balance
    };
};

// === FINANCEIRO ===

export const getFinancialRecords = async (): Promise<FinancialRecord[]> => {
    const { data, error } = await supabase.from('financial_records').select('*');
    if (error) {
        console.error(error);
        return [];
    }
    return data.map((r: any) => ({
        id: r.id,
        store: r.store,
        year: r.year,
        month: r.month,
        creditCaixa: r.credit_caixa,
        creditDelta: r.credit_delta,
        creditPagBankH: r.credit_pagbank_h,
        creditPagBankD: r.credit_pagbank_d,
        creditIfood: r.credit_ifood,
        totalRevenues: r.total_revenues,
        debitCaixa: r.debit_caixa,
        debitPagBankH: r.debit_pagbank_h,
        debitPagBankD: r.debit_pagbank_d,
        debitLoteria: r.debit_loteria,
        totalExpenses: r.total_expenses,
        netResult: r.net_result
    }));
};

export const saveFinancialRecord = async (record: FinancialRecord) => {
    const { data: existing } = await supabase
        .from('financial_records')
        .select('id')
        .eq('store', record.store)
        .eq('year', record.year)
        .eq('month', record.month);

    if (existing && existing.length > 0) {
        throw new Error("Já existe um registro financeiro para esta Loja neste Mês/Ano.");
    }

    const { error } = await supabase.from('financial_records').insert({
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
    });
    if (error) throw new Error(error.message);
};

export const updateFinancialRecord = async (record: FinancialRecord) => {
    const { error } = await supabase.from('financial_records').update({
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
    }).eq('id', record.id);
    if (error) throw new Error(error.message);
};

export const deleteFinancialRecord = async (id: string) => {
    const { error } = await supabase.from('financial_records').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

// === HELPERS ===

export const formatCurrency = (value: number): string => {
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    return safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const getTodayLocalISO = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getMonthLocalISO = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

export const formatDateBr = (isoDate: string | null | undefined): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
};

// === EXPORT FUNCTIONS ===
const getExcelHeader = () => {
    let xml = '<?xml version="1.0"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
    xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
    xml += ' <Styles>\n';
    xml += '  <Style ss:ID="HeaderStyle">\n';
    xml += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
    xml += '   <Font ss:FontName="Calibri" ss:Size="12" ss:Color="#FFFFFF" ss:Bold="1"/>\n';
    xml += '   <Interior ss:Color="#D32F2F" ss:Pattern="Solid"/>\n';
    xml += '  </Style>\n';
    xml += '  <Style ss:ID="CurrencyStyle">\n';
    xml += '   <NumberFormat ss:Format="Currency"/>\n';
    xml += '  </Style>\n';
    xml += '  <Style ss:ID="CenterStyle">\n';
    xml += '   <Alignment ss:Horizontal="Center"/>\n';
    xml += '  </Style>\n';
    xml += ' </Styles>\n';
    return xml;
};

const downloadXml = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const exportToXML = (orders: Order[], filename: string) => {
    const escapeXml = (unsafe: string) => unsafe ? unsafe.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c] || c)) : '';
    let xmlContent = getExcelHeader();
    xmlContent += ' <Worksheet ss:Name="Relatorio Cadastro">\n';
    xmlContent += '  <Table x:FullColumns="1" x:FullRows="1">\n';
    
    xmlContent += '   <Row>\n';
    const headers = ['Data', 'Loja', 'Tipo', 'Categoria', 'Produto', 'Marca', 'Fornecedor', 'Valor Unit.', 'Un.', 'Qtd', 'Total', 'Vencimento'];
    headers.forEach(h => { xmlContent += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${h}</Data></Cell>\n`; });
    xmlContent += '   </Row>\n';

    orders.forEach(o => {
        xmlContent += '   <Row>\n';
        xmlContent += `    <Cell ss:StyleID="CenterStyle"><Data ss:Type="String">${formatDateBr(o.date)}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(o.store)}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(o.type || 'Variável')}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(o.category || '')}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(o.product)}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(o.brand)}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(o.supplier)}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${o.unitValue}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CenterStyle"><Data ss:Type="String">${escapeXml(o.unitMeasure)}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CenterStyle"><Data ss:Type="Number">${o.quantity}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${o.totalValue}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CenterStyle"><Data ss:Type="String">${o.deliveryDate ? formatDateBr(o.deliveryDate) : 'Pendente'}</Data></Cell>\n`;
        xmlContent += '   </Row>\n';
    });
    xmlContent += '  </Table>\n </Worksheet>\n</Workbook>\n';
    downloadXml(xmlContent, filename);
};

export const exportTransactionsToXML = (transactions: Transaction043[], filename: string) => {
     const escapeXml = (unsafe: string) => unsafe.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c] || c));
     let xmlContent = getExcelHeader();
     xmlContent += ' <Worksheet ss:Name="Relatorio 043">\n<Table x:FullColumns="1" x:FullRows="1">\n';
     transactions.forEach(t => {
         xmlContent += `<Row><Cell><Data ss:Type="String">${formatDateBr(t.date)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(t.store)}</Data></Cell><Cell><Data ss:Type="String">${t.type}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(t.description)}</Data></Cell><Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${t.value}</Data></Cell></Row>`;
     });
     xmlContent += '</Table></Worksheet></Workbook>';
     downloadXml(xmlContent, filename);
};

export const exportBalancesToXML = (balances: any[], filename: string) => {
    let xmlContent = getExcelHeader();
    xmlContent += ' <Worksheet ss:Name="Saldos">\n<Table x:FullColumns="1" x:FullRows="1">\n';
    balances.forEach(b => {
         xmlContent += `<Row><Cell><Data ss:Type="String">${b.month}/${b.year}</Data></Cell><Cell><Data ss:Type="String">${b.store}</Data></Cell><Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${b.totalBalance}</Data></Cell></Row>`;
    });
    xmlContent += '</Table></Worksheet></Workbook>';
    downloadXml(xmlContent, filename);
}

export const exportFinancialToXML = (records: any[], filename: string) => {
    let xmlContent = getExcelHeader();
    xmlContent += ' <Worksheet ss:Name="Financeiro">\n<Table x:FullColumns="1" x:FullRows="1">\n';
    records.forEach(r => {
         xmlContent += `<Row><Cell><Data ss:Type="String">${r.month}/${r.year}</Data></Cell><Cell><Data ss:Type="String">${r.store}</Data></Cell><Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${r.netResult}</Data></Cell></Row>`;
    });
    xmlContent += '</Table></Worksheet></Workbook>';
    downloadXml(xmlContent, filename);
}

// === BACKUP ===

export const createBackup = async () => {
    try {
        const appData = await getAppData();
        const orders = await getOrders();
        const transactions043 = await getTransactions043();
        const saldoContas = await getAccountBalances();
        const financeiro = await getFinancialRecords();
        const users = await getUsers();

        const backupObj = {
            version: 8, // Updated version
            timestamp: new Date().toISOString(),
            source: 'supabase_cloud',
            appData,
            orders,
            transactions043,
            saldoContas,
            financeiro,
            users
        };

        const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `HERO_GRILL_BACKUP_${getTodayLocalISO().replace(/-/g, '')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e: any) {
        console.error("Backup creation failed", e);
        throw new Error("Falha ao gerar backup: " + e.message);
    }
};

export const restoreBackup = async (file: File): Promise<{success: boolean, message: string}> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const parsed = JSON.parse(content);
                
                // 1. Restaurando Configurações
                if (parsed.appData) await saveAppData(parsed.appData);

                // 2. Restaurando Pedidos (Upsert em Lotes para performance e anti-duplicidade)
                if (parsed.orders && Array.isArray(parsed.orders)) {
                    const dbOrders = parsed.orders.map((o: any) => {
                        // Clean invalid UUIDs if they exist from old localstorage data
                        const validId = o.id && isValidUUID(o.id) ? o.id : undefined;
                        
                        return {
                            id: validId, 
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
                            type: o.type || 'Variável',
                            category: o.category
                        };
                    });

                    // Processar em chunks de 100 para não estourar payload
                    const CHUNK_SIZE = 100;
                    let errorCount = 0;
                    for (let i = 0; i < dbOrders.length; i += CHUNK_SIZE) {
                        const chunk = dbOrders.slice(i, i + CHUNK_SIZE);
                        // Se tem ID, upsert. Se não, insert.
                        const { error } = await supabase.from('orders').upsert(chunk, { ignoreDuplicates: false });
                        if (error) {
                            console.warn("Erro ao restaurar bloco de pedidos:", error.message);
                            errorCount++;
                        }
                    }
                }

                // 3. Restaurando 043
                if (parsed.transactions043 && Array.isArray(parsed.transactions043)) {
                    for (const t of parsed.transactions043) {
                        const tData = {
                             id: t.id && isValidUUID(t.id) ? t.id : undefined, 
                             date: t.date, store: t.store, type: t.type, value: t.value, description: t.description
                        };
                        await supabase.from('transactions_043').upsert(tData);
                    }
                }

                // 4. Restaurando Saldos (Upsert)
                if (parsed.saldoContas && Array.isArray(parsed.saldoContas)) {
                     for (const b of parsed.saldoContas) {
                        const balanceData = {
                            id: b.id && isValidUUID(b.id) ? b.id : undefined, 
                            store: b.store, year: b.year, month: b.month,
                            caixa_economica: b.caixaEconomica, cofre: b.cofre, loteria: b.loteria,
                            pagbank_h: b.pagbankH, pagbank_d: b.pagbankD, investimentos: b.investimentos,
                            total_balance: b.totalBalance
                        };
                        await supabase.from('account_balances').upsert(balanceData);
                     }
                }

                 // 5. Restaurando Financeiro (Upsert)
                 if (parsed.financeiro && Array.isArray(parsed.financeiro)) {
                     for (const f of parsed.financeiro) {
                         const finData = {
                            id: f.id && isValidUUID(f.id) ? f.id : undefined, 
                            store: f.store, year: f.year, month: f.month,
                            credit_caixa: f.creditCaixa, credit_delta: f.creditDelta, credit_pagbank_h: f.creditPagBankH, credit_pagbank_d: f.creditPagBankD, credit_ifood: f.creditIfood,
                            total_revenues: f.totalRevenues,
                            debit_caixa: f.debitCaixa, debit_pagbank_h: f.debitPagBankH, debit_pagbank_d: f.debitPagBankD, debit_loteria: f.debitLoteria,
                            total_expenses: f.totalExpenses,
                            net_result: f.netResult
                         };
                         await supabase.from('financial_records').upsert(finData);
                     }
                }

                // 6. Restaurando Usuários
                if (parsed.users && Array.isArray(parsed.users)) {
                    for (const u of parsed.users) {
                        const userData = {
                            id: u.id && isValidUUID(u.id) ? u.id : undefined,
                            name: u.name,
                            username: u.username,
                            password: u.password,
                            permissions: u.permissions
                        };
                        await supabase.from('system_users').upsert(userData);
                    }
                }
                
                resolve({ success: true, message: "Backup restaurado com sucesso! Dados atualizados." });
            } catch (err: any) {
                resolve({ success: false, message: `Erro no processamento: ${err.message}` });
            }
        };
        reader.readAsText(file);
    });
};

export const generateMockData = async () => {
    if (!isConfigured) {
        alert("Erro: Supabase não configurado.");
        return;
    }
    const confirm = window.confirm("Isso irá INSERIR dados de teste. Continuar?");
    if(!confirm) return;

    try {
        const { error } = await supabase.from('app_configurations').upsert({
            category: 'stores',
            items: ['Loja Teste A', 'Loja Teste B']
        }, { onConflict: 'category' });
        
        if(error) throw error;

        alert("Sucesso! Dados de teste inseridos.");
        window.location.reload();
    } catch (err: any) {
        alert("Erro ao escrever no banco: " + err.message);
    }
};