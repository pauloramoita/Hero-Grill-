import { createClient } from '@supabase/supabase-js';
import { AppData, Order, Transaction043, AccountBalance, FinancialRecord } from '../types';

// Helper seguro para acessar variáveis de ambiente (Vite ou Process)
const getEnv = (key: string): string => {
    try {
        // @ts-ignore - Vite env
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) { }

    try {
        // @ts-ignore - Node/Process fallback
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            // @ts-ignore
            return process.env[key];
        }
    } catch (e) { }

    return '';
};

// Inicialização do Supabase
const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error("ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas. Verifique se o arquivo .env existe na raiz e contém VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
}

// Inicializa com valores placeholder se falhar, para evitar crash imediato da aplicação
export const supabase = createClient(
    supabaseUrl || 'https://missing-url.supabase.co', 
    supabaseKey || 'missing-key'
);

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

    // Sort function
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
    // Upsert each category
    const categories = [
        { category: 'stores', items: data.stores },
        { category: 'products', items: data.products },
        { category: 'brands', items: data.brands },
        { category: 'suppliers', items: data.suppliers },
        { category: 'units', items: data.units },
    ];

    for (const cat of categories) {
        // Check if exists to update or insert (Supabase upsert works if we have unique constraint on category)
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
        // id: order.id, // Let DB generate UUID
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
    // Check existence
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


// === HELPERS (Mantidos iguais pois são puros) ===

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
    xml += '  <Style ss:ID="Default" ss:Name="Normal">\n';
    xml += '   <Alignment ss:Vertical="Bottom"/>\n';
    xml += '   <Borders/>\n';
    xml += '   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>\n';
    xml += '   <Interior/>\n';
    xml += '   <NumberFormat/>\n';
    xml += '   <Protection/>\n';
    xml += '  </Style>\n';
    
    xml += '  <Style ss:ID="HeaderStyle">\n';
    xml += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
    xml += '   <Borders>\n';
    xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
    xml += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
    xml += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
    xml += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
    xml += '   </Borders>\n';
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
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

export const exportToXML = (orders: Order[], filename: string) => {
    const escapeXml = (unsafe: string) => unsafe.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c] || c));
    let xmlContent = getExcelHeader();
    xmlContent += ' <Worksheet ss:Name="Relatorio Pedidos">\n';
    xmlContent += '  <Table x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">\n';
    
    xmlContent += '   <Column ss:Width="80"/>\n';
    xmlContent += '   <Column ss:Width="120"/>\n';
    xmlContent += '   <Column ss:Width="150"/>\n';
    xmlContent += '   <Column ss:Width="100"/>\n';
    xmlContent += '   <Column ss:Width="100"/>\n';
    xmlContent += '   <Column ss:Width="80"/>\n';
    xmlContent += '   <Column ss:Width="50" ss:StyleID="CenterStyle"/>\n';
    xmlContent += '   <Column ss:Width="60" ss:StyleID="CenterStyle"/>\n';
    xmlContent += '   <Column ss:Width="90"/>\n';
    xmlContent += '   <Column ss:Width="90" ss:StyleID="CenterStyle"/>\n';

    xmlContent += '   <Row ss:Height="25">\n';
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
    const appData = await getAppData();
    const orders = await getOrders();
    const transactions043 = await getTransactions043();
    const saldoContas = await getAccountBalances();
    const financeiro = await getFinancialRecords();

    const backupObj = {
        version: 5,
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
};

export const restoreBackup = async (file: File): Promise<{success: boolean, message: string}> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const parsed = JSON.parse(content);
                
                // Restaurando Configurações
                if (parsed.appData) await saveAppData(parsed.appData);

                // Restaurando Pedidos (Iterando um a um para evitar payload muito grande)
                if (parsed.orders && Array.isArray(parsed.orders)) {
                    for (const o of parsed.orders) {
                         await supabase.from('orders').insert({
                            date: o.date, store: o.store, product: o.product, brand: o.brand,
                            supplier: o.supplier, unit_measure: o.unitMeasure, unit_value: o.unitValue,
                            quantity: o.quantity, total_value: o.totalValue, delivery_date: o.deliveryDate
                        });
                    }
                }

                // Restaurando 043
                 if (parsed.transactions043 && Array.isArray(parsed.transactions043)) {
                    for (const t of parsed.transactions043) {
                        await saveTransaction043(t);
                    }
                }
                
                resolve({ success: true, message: "Backup restaurado para a nuvem com sucesso! Recarregue a página." });
            } catch (err: any) {
                resolve({ success: false, message: err.message });
            }
        };
        reader.readAsText(file);
    });
};

export const generateMockData = async () => {
   alert("Geração de dados Mock desativada em Produção (Supabase).");
};