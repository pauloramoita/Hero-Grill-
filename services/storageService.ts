
import { createClient } from '@supabase/supabase-js';
import { AppData, Order, Transaction043, AccountBalance, FinancialRecord } from '../types';

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


// === APP DATA (CONFIGURAÇÕES) ===

const defaultData: AppData = {
    stores: [],
    products: [],
    brands: [],
    suppliers: [],
    units: []
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
    });

    const sortList = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return {
        stores: sortList(appData.stores),
        products: sortList(appData.products),
        brands: sortList(appData.brands),
        suppliers: sortList(appData.suppliers),
        units: sortList(appData.units)
    };
};

export const saveAppData = async (data: AppData) => {
    const categories = [
        { category: 'stores', items: data.stores },
        { category: 'products', items: data.products },
        { category: 'brands', items: data.brands },
        { category: 'suppliers', items: data.suppliers },
        { category: 'units', items: data.units },
    ];

    for (const cat of categories) {
        const { error } = await supabase
            .from('app_configurations')
            .upsert({ category: cat.category, items: cat.items }, { onConflict: 'category' });
            
        if (error) console.error(`Erro ao salvar ${cat.category}:`, error);
    }
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
        deliveryDate: o.delivery_date
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
        deliveryDate: o.delivery_date
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
        delivery_date: order.deliveryDate
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
        delivery_date: order.deliveryDate
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
    const escapeXml = (unsafe: string) => unsafe.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c] || c));
    let xmlContent = getExcelHeader();
    xmlContent += ' <Worksheet ss:Name="Relatorio Pedidos">\n';
    xmlContent += '  <Table x:FullColumns="1" x:FullRows="1">\n';
    
    xmlContent += '   <Row>\n';
    const headers = ['Data', 'Loja', 'Produto', 'Marca', 'Fornecedor', 'Valor Unit.', 'Un.', 'Qtd', 'Total', 'Entrega'];
    headers.forEach(h => { xmlContent += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${h}</Data></Cell>\n`; });
    xmlContent += '   </Row>\n';

    orders.forEach(o => {
        xmlContent += '   <Row>\n';
        xmlContent += `    <Cell ss:StyleID="CenterStyle"><Data ss:Type="String">${formatDateBr(o.date)}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(o.store)}</Data></Cell>\n`;
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

        const backupObj = {
            version: 6, // Version bump for robustness
            timestamp: new Date().toISOString(),
            source: 'supabase_cloud',
            appData,
            orders,
            transactions043,
            saldoContas,
            financeiro
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
                    const dbOrders = parsed.orders.map((o: any) => ({
                        id: o.id, // Importante: Preservar ID para fazer UPSERT e não duplicar
                        date: o.date,
                        store: o.store,
                        product: o.product,
                        brand: o.brand,
                        supplier: o.supplier,
                        unit_measure: o.unitMeasure,
                        unit_value: o.unitValue,
                        quantity: o.quantity,
                        total_value: o.totalValue,
                        delivery_date: o.deliveryDate
                    }));

                    // Processar em chunks de 100 para não estourar payload
                    const CHUNK_SIZE = 100;
                    for (let i = 0; i < dbOrders.length; i += CHUNK_SIZE) {
                        const chunk = dbOrders.slice(i, i + CHUNK_SIZE);
                        const { error } = await supabase.from('orders').upsert(chunk);
                        if (error) console.warn("Erro ao restaurar bloco de pedidos:", error.message);
                    }
                }

                // 3. Restaurando 043
                if (parsed.transactions043 && Array.isArray(parsed.transactions043)) {
                    for (const t of parsed.transactions043) {
                        // Usa Upsert se tiver ID
                        if(t.id) {
                             await supabase.from('transactions_043').upsert({
                                id: t.id, date: t.date, store: t.store, type: t.type, value: t.value, description: t.description
                            });
                        } else {
                            await saveTransaction043(t);
                        }
                    }
                }

                // 4. Restaurando Saldos (Upsert)
                if (parsed.saldoContas && Array.isArray(parsed.saldoContas)) {
                     for (const b of parsed.saldoContas) {
                        const balanceData = {
                            id: b.id, // Use ID if available
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
                            id: f.id,
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
