
import { createClient } from '@supabase/supabase-js';
import { 
    AppData, Order, Transaction043, AccountBalance, FinancialRecord, 
    DailyTransaction, FinancialAccount, MeatInventoryLog, MeatStockAdjustment, User 
} from '../types';

// --- SAFE INITIALIZATION ---
const getEnv = (key: string) => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            return (import.meta as any).env[key] || '';
        }
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

const supabaseUrl = rawSupabaseUrl && rawSupabaseUrl.startsWith('http') 
    ? rawSupabaseUrl 
    : 'https://placeholder.supabase.co';

const supabaseKey = rawSupabaseKey || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPERS ---

const safeNumber = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (val === null || val === undefined) return 0;
    
    if (typeof val === 'string') {
        let clean = val.trim();
        if (!clean || clean === 'NaN' || clean === 'null') return 0;

        clean = clean.replace(/[R$\s]/g, '');

        // Handle PT-BR "1.000,00" vs US "1,000.00"
        if (clean.includes(',') && !clean.includes('.')) {
             // Simple decimal: "10,5" -> "10.5"
             clean = clean.replace(',', '.');
        } else if (clean.includes('.') && clean.includes(',')) {
            // Mixed: Guess based on position
            const lastComma = clean.lastIndexOf(',');
            const lastDot = clean.lastIndexOf('.');
            if (lastComma > lastDot) {
                // "1.000,00" -> "1000.00"
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                // "1,000.00" -> "1000.00"
                clean = clean.replace(/,/g, '');
            }
        }
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

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
    const timestamp = rest.createdAt || new Date().toISOString();

    const payloadSnake = {
        date: rest.date,
        store: rest.store,
        product: rest.product,
        brand: rest.brand,
        supplier: rest.supplier,
        unit_value: safeNumber(rest.unitValue),
        unit_measure: rest.unitMeasure,
        quantity: safeNumber(rest.quantity),
        total_value: safeNumber(rest.totalValue),
        delivery_date: rest.deliveryDate,
        type: rest.type,
        category: rest.category,
        created_at: timestamp
    };

    const payloadCamel = {
        ...rest,
        unitValue: safeNumber(rest.unitValue),
        quantity: safeNumber(rest.quantity),
        totalValue: safeNumber(rest.totalValue),
        createdAt: timestamp
    };

    const tryInsert = async (payload: any) => {
        const { error } = await supabase.from('orders').insert([payload]);
        return error;
    };

    let error = await tryInsert(payloadSnake);
    if (error) {
        console.warn("Snake save failed, trying Camel...", error.message);
        error = await tryInsert(payloadCamel);
    }

    if (error) {
        throw new Error(`Erro ao salvar: ${error.message}`);
    }
};

export const updateOrder = async (order: Order) => {
    const { id, ...rest } = order;
    
    const payloadSnake = {
        date: rest.date,
        store: rest.store,
        product: rest.product,
        brand: rest.brand,
        supplier: rest.supplier,
        unit_value: safeNumber(rest.unitValue),
        unit_measure: rest.unitMeasure,
        quantity: safeNumber(rest.quantity),
        total_value: safeNumber(rest.totalValue),
        delivery_date: rest.deliveryDate,
        type: rest.type,
        category: rest.category
    };

    let { error } = await supabase.from('orders').update(payloadSnake).eq('id', id);
    if (error) {
        // Fallback Camel
        await supabase.from('orders').update(rest).eq('id', id);
    }
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
            unitMeasure: safeString(o.unitMeasure ?? o.unitmeasure ?? o.unit_measure),
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
    if (error) console.error("Error fetching meat logs:", error);
    
    return (data || []).map((log: any) => ({
        id: log.id,
        date: log.date ?? log.Date,
        store: safeString(log.store ?? log.Store),
        product: safeString(log.product ?? log.Product),
        quantity_consumed: safeNumber(log.quantity_consumed ?? log.quantityconsumed ?? log.quantityConsumed ?? log.QuantityConsumed),
        created_at: log.created_at ?? log.createdAt
    }));
};

export const saveMeatConsumption = async (log: MeatInventoryLog) => {
    const { id, ...rest } = log;
    const timestamp = rest.created_at || new Date().toISOString();

    const payloadSnake = {
        date: rest.date,
        store: rest.store,
        product: rest.product,
        quantity_consumed: rest.quantity_consumed,
        created_at: timestamp
    };

    const payloadCamel = {
        date: rest.date,
        store: rest.store,
        product: rest.product,
        quantityConsumed: rest.quantity_consumed, 
        createdAt: timestamp
    };

    let { error } = await supabase.from('meat_inventory_logs').insert([payloadSnake]);
    if (error) {
        await supabase.from('meat_inventory_logs').insert([payloadCamel]);
    }
};

export const updateMeatConsumption = async (id: string, quantity: number) => {
    let { error } = await supabase.from('meat_inventory_logs').update({ quantity_consumed: quantity }).eq('id', id);
    if (error) {
        await supabase.from('meat_inventory_logs').update({ quantityConsumed: quantity }).eq('id', id);
    }
};

export const deleteMeatConsumption = async (id: string) => {
    const { error } = await supabase.from('meat_inventory_logs').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getMeatAdjustments = async (): Promise<MeatStockAdjustment[]> => {
    const { data, error } = await supabase.from('meat_stock_adjustments').select('*');
    if (error) console.error("Error fetching meat adjustments:", error);
    
    return (data || []).map((adj: any) => ({
        id: adj.id,
        date: adj.date ?? adj.Date,
        store: safeString(adj.store ?? adj.Store),
        product: safeString(adj.product ?? adj.Product),
        quantity: safeNumber(adj.quantity ?? adj.Quantity),
        reason: safeString(adj.reason ?? adj.Reason),
        created_at: adj.created_at ?? adj.createdAt
    }));
};

export const saveMeatAdjustment = async (adj: MeatStockAdjustment) => {
    const { id, ...rest } = adj;
    const timestamp = rest.created_at || new Date().toISOString();

    const payloadSnake = {
        date: rest.date,
        store: rest.store,
        product: rest.product,
        quantity: rest.quantity,
        reason: rest.reason,
        created_at: timestamp
    };

    const payloadCamel = {
        date: rest.date,
        store: rest.store,
        product: rest.product,
        quantity: rest.quantity,
        reason: rest.reason,
        createdAt: timestamp
    };

    let { error } = await supabase.from('meat_stock_adjustments').insert([payloadSnake]);
    if (error) {
        await supabase.from('meat_stock_adjustments').insert([payloadCamel]);
    }
};

export const deleteMeatAdjustment = async (id: string) => {
    const { error } = await supabase.from('meat_stock_adjustments').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

// --- OTHERS ---

export const getTransactions043 = async (): Promise<Transaction043[]> => {
    const { data } = await supabase.from('transactions_043').select('*');
    return (data || []).map((t: any) => ({ ...t, value: safeNumber(t.value) }));
};
export const saveTransaction043 = async (t: Transaction043) => {
    const { id, ...rest } = t;
    await supabase.from('transactions_043').insert([rest]);
};
export const updateTransaction043 = async (t: Transaction043) => {
    const { id, ...rest } = t;
    await supabase.from('transactions_043').update(rest).eq('id', id);
};
export const deleteTransaction043 = async (id: string) => {
    await supabase.from('transactions_043').delete().eq('id', id);
};
export const exportTransactionsToXML = (data: Transaction043[], filename: string) => { 
    let csvContent = "data:text/csv;charset=utf-8,Data,Loja,Tipo,Valor,Descricao\n";
    data.forEach(row => {
        csvContent += `${row.date},${row.store},${row.type},${safeNumber(row.value)},${row.description}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const getAccountBalances = async (): Promise<AccountBalance[]> => {
    const { data, error } = await supabase.from('account_balances').select('*');
    if (error) {
        console.error("Error fetching balances:", error);
        return [];
    }
    return (data || []).map((b: any) => {
        const caixaEconomica = safeNumber(b.caixaEconomica ?? b.caixaeconomica ?? b.CaixaEconomica ?? b.caixa_economica);
        const cofre = safeNumber(b.cofre ?? b.Cofre);
        const loteria = safeNumber(b.loteria ?? b.Loteria);
        const pagbankH = safeNumber(b.pagbankH ?? b.pagbankh ?? b.PagbankH ?? b.PagBankH ?? b.pagbank_h);
        const pagbankD = safeNumber(b.pagbankD ?? b.pagbankd ?? b.PagbankD ?? b.PagBankD ?? b.pagbank_d);
        const investimentos = safeNumber(b.investimentos ?? b.Investimentos);
        
        let totalBalance = safeNumber(b.totalBalance ?? b.totalbalance ?? b.TotalBalance ?? b.total_balance);
        
        if (totalBalance === 0 && (caixaEconomica || cofre || loteria || pagbankH || pagbankD || investimentos)) {
            totalBalance = caixaEconomica + cofre + loteria + pagbankH + pagbankD + investimentos;
        }

        return {
            id: b.id,
            store: b.store,
            year: b.year,
            month: b.month,
            caixaEconomica,
            cofre,
            loteria,
            pagbankH,
            pagbankD,
            investimentos,
            totalBalance
        };
    });
};
export const saveAccountBalance = async (b: AccountBalance) => {
    const { id, ...rest } = b;
    
    const payloadSnake = {
        store: rest.store,
        year: rest.year,
        month: rest.month,
        caixa_economica: rest.caixaEconomica,
        cofre: rest.cofre,
        loteria: rest.loteria,
        pagbank_h: rest.pagbankH,
        pagbank_d: rest.pagbankD,
        investimentos: rest.investimentos,
        total_balance: rest.totalBalance
    };

    const { error } = await supabase.from('account_balances').insert([payloadSnake]);
    if (error) {
        await supabase.from('account_balances').insert([rest]);
    }
};
export const updateAccountBalance = async (b: AccountBalance) => {
    const { id, ...rest } = b;
    
    const payloadSnake = {
        store: rest.store,
        year: rest.year,
        month: rest.month,
        caixa_economica: rest.caixaEconomica,
        cofre: rest.cofre,
        loteria: rest.loteria,
        pagbank_h: rest.pagbankH,
        pagbank_d: rest.pagbankD,
        investimentos: rest.investimentos,
        total_balance: rest.totalBalance
    };

    let { error } = await supabase.from('account_balances').update(payloadSnake).eq('id', id);
    if (error) {
        await supabase.from('account_balances').update(rest).eq('id', id);
    }
};
export const deleteAccountBalance = async (id: string) => {
    await supabase.from('account_balances').delete().eq('id', id);
};
export const getPreviousMonthBalance = async (store: string, year: number, month: string) => {
    let prevYear = year;
    let prevMonthVal = parseInt(month) - 1;
    if (prevMonthVal === 0) {
        prevMonthVal = 12;
        prevYear -= 1;
    }
    const prevMonth = String(prevMonthVal).padStart(2, '0');
    
    const { data } = await supabase.from('account_balances')
        .select('*')
        .eq('store', store)
        .eq('year', prevYear)
        .eq('month', prevMonth)
        .single();
        
    if (!data) return null;

    return { 
        ...data, 
        totalBalance: safeNumber(data.totalBalance ?? data.totalbalance ?? data.TotalBalance ?? data.total_balance) 
    };
};
export const exportBalancesToXML = (data: AccountBalance[], filename: string) => { 
    let csvContent = "data:text/csv;charset=utf-8,Ano,Mes,Loja,Caixa,Cofre,Loteria,PagBank H,PagBank D,Invest,Total\n";
    data.forEach(row => {
        csvContent += `${row.year},${row.month},${row.store},${row.caixaEconomica},${row.cofre},${row.loteria},${row.pagbankH},${row.pagbankD},${row.investimentos},${row.totalBalance}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const getFinancialRecords = async (): Promise<FinancialRecord[]> => {
    const { data } = await supabase.from('financial_records').select('*');
    return (data || []).map((r: any) => {
        const creditCaixa = safeNumber(r.creditCaixa ?? r.creditcaixa ?? r.CreditCaixa ?? r.credit_caixa ?? r.Credit_Caixa);
        const creditDelta = safeNumber(r.creditDelta ?? r.creditdelta ?? r.CreditDelta ?? r.credit_delta);
        const creditPagBankH = safeNumber(r.creditPagBankH ?? r.creditpagbankh ?? r.CreditPagBankH ?? r.credit_pagbank_h ?? r.credit_pag_bank_h);
        const creditPagBankD = safeNumber(r.creditPagBankD ?? r.creditpagbankd ?? r.CreditPagBankD ?? r.credit_pagbank_d ?? r.credit_pag_bank_d);
        const creditIfood = safeNumber(r.creditIfood ?? r.creditifood ?? r.CreditIfood ?? r.credit_ifood);
        
        const debitCaixa = safeNumber(r.debitCaixa ?? r.debitcaixa ?? r.DebitCaixa ?? r.debit_caixa);
        const debitPagBankH = safeNumber(r.debitPagBankH ?? r.debitpagbankh ?? r.DebitPagBankH ?? r.debit_pagbank_h ?? r.debit_pag_bank_h);
        const debitPagBankD = safeNumber(r.debitPagBankD ?? r.debitpagbankd ?? r.DebitPagBankD ?? r.debit_pagbank_d ?? r.debit_pag_bank_d);
        const debitLoteria = safeNumber(r.debitLoteria ?? r.debitloteria ?? r.DebitLoteria ?? r.debit_loteria);

        let totalRevenues = safeNumber(r.totalRevenues ?? r.totalrevenues ?? r.TotalRevenues ?? r.total_revenues);
        let totalExpenses = safeNumber(r.totalExpenses ?? r.totalexpenses ?? r.TotalExpenses ?? r.total_expenses);
        let netResult = safeNumber(r.netResult ?? r.netresult ?? r.NetResult ?? r.net_result);

        if (totalRevenues === 0 && (creditCaixa || creditDelta || creditPagBankH || creditPagBankD || creditIfood)) {
            totalRevenues = creditCaixa + creditDelta + creditPagBankH + creditPagBankD + creditIfood;
        }
        if (totalExpenses === 0 && (debitCaixa || debitPagBankH || debitPagBankD || debitLoteria)) {
            totalExpenses = debitCaixa + debitPagBankH + debitPagBankD + debitLoteria;
        }
        if (netResult === 0 && (totalRevenues !== 0 || totalExpenses !== 0)) {
            netResult = totalRevenues - totalExpenses;
        }

        return {
            id: r.id,
            store: r.store,
            year: r.year,
            month: r.month,
            creditCaixa, creditDelta, creditPagBankH, creditPagBankD, creditIfood,
            debitCaixa, debitPagBankH, debitPagBankD, debitLoteria,
            totalRevenues, totalExpenses, netResult
        };
    });
};
export const saveFinancialRecord = async (r: FinancialRecord) => {
    const { id, ...rest } = r;
    
    const payloadSnake = {
        store: rest.store,
        year: rest.year,
        month: rest.month,
        credit_caixa: rest.creditCaixa,
        credit_delta: rest.creditDelta,
        credit_pagbank_h: rest.creditPagBankH,
        credit_pagbank_d: rest.creditPagBankD,
        credit_ifood: rest.creditIfood,
        total_revenues: rest.totalRevenues,
        debit_caixa: rest.debitCaixa,
        debit_pagbank_h: rest.debitPagBankH,
        debit_pagbank_d: rest.debitPagBankD,
        debit_loteria: rest.debitLoteria,
        total_expenses: rest.totalExpenses,
        net_result: rest.netResult
    };

    const { error } = await supabase.from('financial_records').insert([payloadSnake]);
    if (error) {
        await supabase.from('financial_records').insert([rest]);
    }
};
export const updateFinancialRecord = async (r: FinancialRecord) => {
    const { id, ...rest } = r;
    
    const payloadSnake = {
        store: rest.store,
        year: rest.year,
        month: rest.month,
        credit_caixa: rest.creditCaixa,
        credit_delta: rest.creditDelta,
        credit_pagbank_h: rest.creditPagBankH,
        credit_pagbank_d: rest.creditPagBankD,
        credit_ifood: rest.creditIfood,
        total_revenues: rest.totalRevenues,
        debit_caixa: rest.debitCaixa,
        debit_pagbank_h: rest.debitPagBankH,
        debit_pagbank_d: rest.debitPagBankD,
        debit_loteria: rest.debitLoteria,
        total_expenses: rest.totalExpenses,
        net_result: rest.netResult
    };

    let { error } = await supabase.from('financial_records').update(payloadSnake).eq('id', id);
    if (error) {
        await supabase.from('financial_records').update(rest).eq('id', id);
    }
};
export const deleteFinancialRecord = async (id: string) => {
    await supabase.from('financial_records').delete().eq('id', id);
};
export const exportFinancialToXML = (data: FinancialRecord[], filename: string) => { 
    let csvContent = "data:text/csv;charset=utf-8,Ano,Mes,Loja,Receitas,Despesas,Resultado\n";
    data.forEach(row => {
        csvContent += `${row.year},${row.month},${row.store},${row.totalRevenues},${row.totalExpenses},${row.netResult}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const getFinancialAccounts = async (): Promise<FinancialAccount[]> => {
    const { data } = await supabase.from('financial_accounts').select('*');
    return (data || []).map((a: any) => ({ 
        ...a, 
        initialBalance: safeNumber(a.initialBalance ?? a.initialbalance ?? a.InitialBalance ?? a.initial_balance) 
    }));
};
export const saveFinancialAccount = async (acc: FinancialAccount) => {
    const { id, ...rest } = acc;
    const { error } = await supabase.from('financial_accounts').insert([{
        name: rest.name,
        store: rest.store,
        "initialBalance": rest.initialBalance
    }]);
    
    if (error) {
        await supabase.from('financial_accounts').insert([{
            name: rest.name,
            store: rest.store,
            initialbalance: rest.initialBalance
        }]);
    }
};
export const updateFinancialAccount = async (acc: FinancialAccount) => {
    const { id, ...rest } = acc;
    
    // Try quote-preserved first
    const { error } = await supabase.from('financial_accounts').update({
        name: rest.name,
        store: rest.store,
        "initialBalance": rest.initialBalance
    }).eq('id', id);

    if (error) {
        // Fallback for lowercase
        const { error: err2 } = await supabase.from('financial_accounts').update({
            name: rest.name,
            store: rest.store,
            initialbalance: rest.initialBalance
        }).eq('id', id);

        if (err2) {
            // Last resort fallback for snake_case
            await supabase.from('financial_accounts').update({
                name: rest.name,
                store: rest.store,
                initial_balance: rest.initialBalance
            }).eq('id', id);
        }
    }
};
export const deleteFinancialAccount = async (id: string) => {
    await supabase.from('financial_accounts').delete().eq('id', id);
};

export const getDailyTransactions = async (): Promise<DailyTransaction[]> => {
    const { data } = await supabase.from('daily_transactions').select('*');
    return (data || []).map((t: any) => ({
        ...t,
        paymentDate: t.payment_date ?? t.paymentDate,
        accountId: t.account_id ?? t.accountId,
        destinationStore: t.destination_store ?? t.destinationStore,
        destinationAccountId: t.destination_account_id ?? t.destinationAccountId,
        paymentMethod: t.payment_method ?? t.paymentMethod,
        createdAt: t.created_at ?? t.createdAt,
        value: safeNumber(t.value)
    }));
};
export const saveDailyTransaction = async (t: DailyTransaction) => {
    const { id, ...rest } = t;
    const snakeCasePayload = {
        date: rest.date,
        store: rest.store,
        type: rest.type,
        account_id: rest.accountId,
        destination_store: rest.destinationStore,
        destination_account_id: rest.destinationAccountId,
        payment_method: rest.paymentMethod,
        payment_date: rest.paymentDate,
        product: rest.product,
        category: rest.category,
        supplier: rest.supplier,
        value: rest.value,
        status: rest.status,
        description: rest.description,
        classification: rest.classification,
        origin: rest.origin,
        created_at: rest.createdAt
    };
    if (id) {
        // Use upsert to update existing record or insert if not exists (but PK must match)
        await supabase.from('daily_transactions').upsert({ id, ...snakeCasePayload });
    } else {
        await supabase.from('daily_transactions').insert([snakeCasePayload]);
    }
};
export const deleteDailyTransaction = async (id: string) => {
    await supabase.from('daily_transactions').delete().eq('id', id);
};

export const getUsers = async (): Promise<User[]> => {
    const { data } = await supabase.from('system_users').select('*');
    return data || [];
};
export const saveUser = async (user: User) => {
    const { id, ...rest } = user;
    if (id) await supabase.from('system_users').update(rest).eq('id', id);
    else await supabase.from('system_users').insert([rest]);
};
export const deleteUser = async (id: string) => {
    await supabase.from('system_users').delete().eq('id', id);
};
export const loginUser = async (username: string, password: string): Promise<{ success: boolean, user?: User, message?: string }> => {
    if (username === 'Paulo' && password === 'Moita3033') return { success: true, user: { id: 'master', name: 'Paulo (Mestre)', username: 'Paulo', permissions: { modules: [], stores: [] }, isMaster: true } };
    const { data } = await supabase.from('system_users').select('*').eq('username', username).single();
    if (!data) return { success: false, message: 'Usuário não encontrado.' };
    if (data.password !== password) return { success: false, message: 'Senha incorreta.' };
    return { success: true, user: data };
};
export const changeUserPassword = async (userId: string, current: string, newPass: string) => {
    if (userId === 'master') throw new Error("Não permitido.");
    await supabase.from('system_users').update({ password: newPass }).eq('id', userId);
};

export const createBackup = async () => {
    const [appData, orders, users, logs, adjustments, trans043, balances, finRecords, finAccounts, dailyTrans] = await Promise.all([
        getAppData(),
        getOrders(),
        getUsers(),
        getMeatConsumptionLogs(),
        getMeatAdjustments(),
        getTransactions043(),
        getAccountBalances(),
        getFinancialRecords(),
        getFinancialAccounts(),
        getDailyTransactions()
    ]);

    const backup = {
        timestamp: new Date().toISOString(),
        appData,
        orders,
        users,
        logs,
        adjustments,
        trans043,
        balances,
        finRecords,
        finAccounts,
        dailyTrans
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_hero_grill_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const restoreBackup = async (file: File): Promise<{ success: boolean, message: string }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                
                if (json.appData) await supabase.from('app_config').upsert({ id: 1, data: json.appData });
                if (json.users && json.users.length) {
                    await supabase.from('system_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    await supabase.from('system_users').insert(json.users);
                }
                if (json.orders && json.orders.length) {
                    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    const batchSize = 100;
                    for (let i = 0; i < json.orders.length; i += batchSize) {
                        const batch = json.orders.slice(i, i + batchSize).map((o: any) => ({
                            date: o.date, store: o.store, product: o.product, brand: o.brand, supplier: o.supplier,
                            unit_value: safeNumber(o.unitValue), unit_measure: o.unitMeasure, quantity: safeNumber(o.quantity),
                            total_value: safeNumber(o.totalValue), delivery_date: o.deliveryDate, type: o.type, category: o.category, created_at: o.createdAt
                        }));
                        await supabase.from('orders').insert(batch);
                    }
                }
                if (json.logs && json.logs.length) {
                    await supabase.from('meat_inventory_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    await supabase.from('meat_inventory_logs').insert(json.logs.map((l: any) => ({
                        date: l.date, store: l.store, product: l.product, quantity_consumed: safeNumber(l.quantity_consumed), created_at: l.created_at
                    })));
                }
                
                resolve({ success: true, message: 'Backup restaurado com sucesso!' });
            } catch (err: any) {
                resolve({ success: false, message: 'Erro ao processar arquivo: ' + err.message });
            }
        };
        reader.readAsText(file);
    });
};

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('app_config').select('id').limit(1);
        if (error) return { status: 'error', message: 'Erro de conexão: ' + error.message, details: 'Verifique a Chave API.' };
        return { status: 'ok', message: 'Conectado ao Supabase.' };
    } catch (e: any) {
        return { status: 'error', message: 'Erro crítico.', details: e.message };
    }
};

export const getConfigStatus = () => {
    return { 
        urlConfigured: !!rawSupabaseUrl, 
        urlPreview: rawSupabaseUrl ? rawSupabaseUrl.substring(0, 15) + '...' : 'Não configurada' 
    };
};

export const generateMockData = async () => {
    console.log("Mock data generation disabled in production.");
};

export const SETUP_SQL = `
-- Copie e cole no SQL Editor do Supabase

create table if not exists app_config (
  id bigint primary key generated always as identity,
  data jsonb
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  date date,
  store text,
  product text,
  brand text,
  supplier text,
  unit_value numeric,
  unit_measure text,
  quantity numeric,
  total_value numeric,
  delivery_date date,
  type text,
  category text,
  created_at timestamptz default now()
);

create table if not exists system_users (
  id uuid primary key default gen_random_uuid(),
  name text,
  username text unique,
  password text,
  permissions jsonb,
  is_master boolean default false
);

create table if not exists meat_inventory_logs (
  id uuid primary key default gen_random_uuid(),
  date date,
  store text,
  product text,
  quantity_consumed numeric,
  created_at timestamptz default now()
);

create table if not exists meat_stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  date date,
  store text,
  product text,
  quantity numeric,
  reason text,
  created_at timestamptz default now()
);

create table if not exists transactions_043 (
  id uuid primary key default gen_random_uuid(),
  date date,
  store text,
  type text,
  value numeric,
  description text
);

create table if not exists account_balances (
  id uuid primary key default gen_random_uuid(),
  store text,
  year integer,
  month text,
  "caixaEconomica" numeric,
  cofre numeric,
  loteria numeric,
  "pagbankH" numeric,
  "pagbankD" numeric,
  investimentos numeric,
  "totalBalance" numeric
);

create table if not exists financial_records (
  id uuid primary key default gen_random_uuid(),
  store text,
  year integer,
  month text,
  "creditCaixa" numeric,
  "creditDelta" numeric,
  "creditPagBankH" numeric,
  "creditPagBankD" numeric,
  "creditIfood" numeric,
  "totalRevenues" numeric,
  "debitCaixa" numeric,
  "debitPagBankH" numeric,
  "debitPagBankD" numeric,
  "debitLoteria" numeric,
  "totalExpenses" numeric,
  "netResult" numeric
);

create table if not exists financial_accounts (
  id uuid primary key default gen_random_uuid(),
  name text,
  store text,
  "initialBalance" numeric
);

create table if not exists daily_transactions (
  id uuid primary key default gen_random_uuid(),
  date date,
  store text,
  type text,
  account_id text,
  destination_store text,
  destination_account_id text,
  payment_method text,
  payment_date date,
  product text,
  category text,
  supplier text,
  value numeric,
  status text,
  description text,
  classification text,
  origin text,
  created_at timestamptz default now()
);
`;