
import { AppData, Order, Transaction043, AccountBalance, FinancialRecord } from '../types';

const DATA_KEY = 'hero_grill_data';
const ORDERS_KEY = 'hero_grill_orders';
const TRANSACTIONS_043_KEY = 'hero_grill_transactions_043';
const SALDO_CONTAS_KEY = 'hero_grill_saldo_contas';
const FINANCEIRO_KEY = 'hero_grill_financeiro';

const defaultData: AppData = {
    stores: [],
    products: [],
    brands: [],
    suppliers: [],
    units: []
};

export const getAppData = (): AppData => {
    const stored = localStorage.getItem(DATA_KEY);
    let data: Partial<AppData> = {};
    try {
        data = stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("Failed to parse app data from localStorage", e);
    }
    
    // Helper to sort alphabetically with Portuguese locale support
    const sortList = (list: any) => {
        if (!Array.isArray(list)) return [];
        return [...list].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    };

    // Merge with defaultData to ensure all keys exist and are arrays
    return {
        stores: sortList(data.stores || defaultData.stores),
        products: sortList(data.products || defaultData.products),
        brands: sortList(data.brands || defaultData.brands),
        suppliers: sortList(data.suppliers || defaultData.suppliers),
        units: sortList(data.units || defaultData.units),
    };
};

export const saveAppData = (data: AppData) => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
};

// === ORDERS ===

export const getOrders = (): Order[] => {
    const stored = localStorage.getItem(ORDERS_KEY);
    if (!stored) return [];
    
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Failed to parse orders from localStorage", e);
        return [];
    }
};

export const getLastOrderForProduct = (productName: string): Order | undefined => {
    const orders = getOrders();
    const productOrders = orders.filter(o => o.product === productName);
    
    if (productOrders.length === 0) return undefined;

    productOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return productOrders[0];
};

export const saveOrder = (order: Order) => {
    const orders = getOrders();
    orders.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
};

export const updateOrder = (updatedOrder: Order) => {
    const orders = getOrders();
    const index = orders.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) {
        orders[index] = updatedOrder;
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }
};

export const deleteOrder = (id: string) => {
    const orders = getOrders();
    const filteredOrders = orders.filter(o => o.id !== id);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(filteredOrders));
};

// === CONTROLE 043 ===

export const getTransactions043 = (): Transaction043[] => {
    const stored = localStorage.getItem(TRANSACTIONS_043_KEY);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Failed to parse transactions 043", e);
        return [];
    }
};

export const saveTransaction043 = (transaction: Transaction043) => {
    const transactions = getTransactions043();
    transactions.push(transaction);
    localStorage.setItem(TRANSACTIONS_043_KEY, JSON.stringify(transactions));
};

export const updateTransaction043 = (updated: Transaction043) => {
    const transactions = getTransactions043();
    const index = transactions.findIndex(t => t.id === updated.id);
    if (index !== -1) {
        transactions[index] = updated;
        localStorage.setItem(TRANSACTIONS_043_KEY, JSON.stringify(transactions));
    }
};

export const deleteTransaction043 = (id: string) => {
    const transactions = getTransactions043();
    const filtered = transactions.filter(t => t.id !== id);
    localStorage.setItem(TRANSACTIONS_043_KEY, JSON.stringify(filtered));
};

// === SALDO CONTAS ===

export const getAccountBalances = (): AccountBalance[] => {
    const stored = localStorage.getItem(SALDO_CONTAS_KEY);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Failed to parse account balances", e);
        return [];
    }
};

export const saveAccountBalance = (balance: AccountBalance) => {
    const balances = getAccountBalances();
    // Check if already exists for this store/month/year
    const exists = balances.some(b => b.store === balance.store && b.year === balance.year && b.month === balance.month);
    if (exists) {
        throw new Error("Já existe um lançamento para esta Loja neste Mês/Ano.");
    }
    balances.push(balance);
    localStorage.setItem(SALDO_CONTAS_KEY, JSON.stringify(balances));
};

export const updateAccountBalance = (updated: AccountBalance) => {
    const balances = getAccountBalances();
    const index = balances.findIndex(b => b.id === updated.id);
    if (index !== -1) {
        balances[index] = updated;
        localStorage.setItem(SALDO_CONTAS_KEY, JSON.stringify(balances));
    }
};

export const deleteAccountBalance = (id: string) => {
    const balances = getAccountBalances();
    const filtered = balances.filter(b => b.id !== id);
    localStorage.setItem(SALDO_CONTAS_KEY, JSON.stringify(filtered));
};

// Helper to get previous month balance
export const getPreviousMonthBalance = (store: string, currentYear: number, currentMonth: string): AccountBalance | undefined => {
    const balances = getAccountBalances();
    
    let prevYear = currentYear;
    let prevMonthInt = parseInt(currentMonth, 10) - 1;
    
    if (prevMonthInt === 0) {
        prevMonthInt = 12;
        prevYear = currentYear - 1;
    }
    
    const prevMonthStr = prevMonthInt.toString().padStart(2, '0');
    
    return balances.find(b => b.store === store && b.year === prevYear && b.month === prevMonthStr);
};

// === FINANCEIRO (NOVO) ===

export const getFinancialRecords = (): FinancialRecord[] => {
    const stored = localStorage.getItem(FINANCEIRO_KEY);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Failed to parse financial records", e);
        return [];
    }
};

export const saveFinancialRecord = (record: FinancialRecord) => {
    const records = getFinancialRecords();
    const exists = records.some(r => r.store === record.store && r.year === record.year && r.month === record.month);
    if (exists) {
        throw new Error("Já existe um registro financeiro para esta Loja neste Mês/Ano.");
    }
    records.push(record);
    localStorage.setItem(FINANCEIRO_KEY, JSON.stringify(records));
};

export const updateFinancialRecord = (updated: FinancialRecord) => {
    const records = getFinancialRecords();
    const index = records.findIndex(r => r.id === updated.id);
    if (index !== -1) {
        records[index] = updated;
        localStorage.setItem(FINANCEIRO_KEY, JSON.stringify(records));
    }
};

export const deleteFinancialRecord = (id: string) => {
    const records = getFinancialRecords();
    const filtered = records.filter(r => r.id !== id);
    localStorage.setItem(FINANCEIRO_KEY, JSON.stringify(filtered));
};


// === HELPERS ===

export const formatCurrency = (value: number): string => {
    // Protection against NaN or undefined
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
    
    // Check if it is YYYY-MM-DD
    if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
};

// ROBUST DATE PARSER
export const ensureIsoDate = (dateStr: any): string => {
    if (!dateStr) return getTodayLocalISO();
    
    const str = String(dateStr).trim();
    if (!str) return getTodayLocalISO();

    // Case 1: Already ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // Case 2: BR Format (DD/MM/YYYY or D/M/YYYY)
    const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (brMatch) {
        const day = brMatch[1].padStart(2, '0');
        const month = brMatch[2].padStart(2, '0');
        const year = brMatch[3];
        return `${year}-${month}-${day}`;
    }

    // Fallback: invalid date returns today to avoid breaking UI
    console.warn(`Data inválida detectada: ${str}, convertendo para hoje.`);
    return getTodayLocalISO();
};

// === EXPORT FUNCTIONS ===

const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

// SHARED HEADER FOR XML EXCEL
const getExcelHeader = () => {
    let xml = '<?xml version="1.0"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
    xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
    
    // Styles
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
    let xmlContent = getExcelHeader();
    xmlContent += ' <Worksheet ss:Name="Relatorio Pedidos">\n';
    xmlContent += '  <Table x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">\n';
    
    // Columns
    xmlContent += '   <Column ss:Width="80"/>\n'; // Date
    xmlContent += '   <Column ss:Width="120"/>\n'; // Store
    xmlContent += '   <Column ss:Width="150"/>\n'; // Product
    xmlContent += '   <Column ss:Width="100"/>\n'; // Brand
    xmlContent += '   <Column ss:Width="100"/>\n'; // Supplier
    xmlContent += '   <Column ss:Width="80"/>\n'; // Unit Value
    xmlContent += '   <Column ss:Width="50" ss:StyleID="CenterStyle"/>\n'; // Unit
    xmlContent += '   <Column ss:Width="60" ss:StyleID="CenterStyle"/>\n'; // Qty
    xmlContent += '   <Column ss:Width="90"/>\n'; // Total
    xmlContent += '   <Column ss:Width="90" ss:StyleID="CenterStyle"/>\n'; // Delivery

    // Header
    xmlContent += '   <Row ss:Height="25">\n';
    const headers = ['Data', 'Loja', 'Produto', 'Marca', 'Fornecedor', 'Valor Unit.', 'Un.', 'Qtd', 'Total', 'Entrega'];
    headers.forEach(h => {
        xmlContent += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${h}</Data></Cell>\n`;
    });
    xmlContent += '   </Row>\n';

    // Rows
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

    xmlContent += '  </Table>\n';
    xmlContent += ' </Worksheet>\n';
    xmlContent += '</Workbook>\n';

    downloadXml(xmlContent, filename);
};

export const exportTransactionsToXML = (transactions: Transaction043[], filename: string) => {
    let xmlContent = getExcelHeader();
    xmlContent += ' <Worksheet ss:Name="Relatorio 043">\n';
    xmlContent += '  <Table x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">\n';
    
    // Columns
    xmlContent += '   <Column ss:Width="80" ss:StyleID="CenterStyle"/>\n'; // Data
    xmlContent += '   <Column ss:Width="150"/>\n'; // Loja
    xmlContent += '   <Column ss:Width="80" ss:StyleID="CenterStyle"/>\n'; // Tipo
    xmlContent += '   <Column ss:Width="200"/>\n'; // Descricao
    xmlContent += '   <Column ss:Width="100"/>\n'; // Valor

    // Header
    xmlContent += '   <Row ss:Height="25">\n';
    const headers = ['Data', 'Loja', 'Tipo', 'Descrição', 'Valor'];
    headers.forEach(h => {
        xmlContent += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${h}</Data></Cell>\n`;
    });
    xmlContent += '   </Row>\n';

    // Rows
    transactions.forEach(t => {
        xmlContent += '   <Row>\n';
        xmlContent += `    <Cell><Data ss:Type="String">${formatDateBr(t.date)}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(t.store)}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${t.type === 'DEBIT' ? 'DÉBITO' : 'CRÉDITO'}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(t.description || '')}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${t.value}</Data></Cell>\n`;
        xmlContent += '   </Row>\n';
    });

    xmlContent += '  </Table>\n';
    xmlContent += ' </Worksheet>\n';
    xmlContent += '</Workbook>\n';

    downloadXml(xmlContent, filename);
};

export const exportBalancesToXML = (balances: any[], filename: string) => {
    let xmlContent = getExcelHeader();
    xmlContent += ' <Worksheet ss:Name="Relatorio Saldos">\n';
    xmlContent += '  <Table x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">\n';
    
    // Columns
    xmlContent += '   <Column ss:Width="100" ss:StyleID="CenterStyle"/>\n'; // Data (Mês/Ano)
    xmlContent += '   <Column ss:Width="150"/>\n'; // Loja
    xmlContent += '   <Column ss:Width="100"/>\n'; // CX
    xmlContent += '   <Column ss:Width="100"/>\n'; // Cofre
    xmlContent += '   <Column ss:Width="100"/>\n'; // Loteria
    xmlContent += '   <Column ss:Width="100"/>\n'; // PagH
    xmlContent += '   <Column ss:Width="100"/>\n'; // PagD
    xmlContent += '   <Column ss:Width="100"/>\n'; // Inv
    xmlContent += '   <Column ss:Width="110"/>\n'; // Total
    xmlContent += '   <Column ss:Width="110"/>\n'; // Variação

    // Header
    xmlContent += '   <Row ss:Height="25">\n';
    const headers = ['Período', 'Loja', 'Caixa', 'Cofre', 'Loteria', 'PagBank H', 'PagBank D', 'Invest.', 'Saldo Total', 'Variação'];
    headers.forEach(h => {
        xmlContent += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${h}</Data></Cell>\n`;
    });
    xmlContent += '   </Row>\n';

    const monthNames: Record<string, string> = {
        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
        '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
        '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };

    // Rows
    balances.forEach(b => {
        const monthName = monthNames[b.month] || b.month;
        const period = `${monthName}/${b.year}`;
        
        xmlContent += '   <Row>\n';
        xmlContent += `    <Cell><Data ss:Type="String">${period}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(b.store)}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${b.caixaEconomica}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${b.cofre}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${b.loteria}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${b.pagbankH}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${b.pagbankD}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${b.investimentos}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${b.totalBalance}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${b.variation}</Data></Cell>\n`;
        xmlContent += '   </Row>\n';
    });

    xmlContent += '  </Table>\n';
    xmlContent += ' </Worksheet>\n';
    xmlContent += '</Workbook>\n';

    downloadXml(xmlContent, filename);
};

export const exportFinancialToXML = (records: FinancialRecord[], filename: string) => {
    let xmlContent = getExcelHeader();
    xmlContent += ' <Worksheet ss:Name="Financeiro">\n';
    xmlContent += '  <Table x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">\n';
    
    // Columns
    xmlContent += '   <Column ss:Width="100" ss:StyleID="CenterStyle"/>\n'; // Período
    xmlContent += '   <Column ss:Width="150"/>\n'; // Loja
    xmlContent += '   <Column ss:Width="110"/>\n'; // Receitas
    xmlContent += '   <Column ss:Width="110"/>\n'; // Despesas
    xmlContent += '   <Column ss:Width="110"/>\n'; // Resultado

    // Header
    xmlContent += '   <Row ss:Height="25">\n';
    const headers = ['Período', 'Loja', 'Total Receitas', 'Total Despesas', 'Resultado (Saldo)'];
    headers.forEach(h => {
        xmlContent += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${h}</Data></Cell>\n`;
    });
    xmlContent += '   </Row>\n';

    const monthNames: Record<string, string> = {
        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
        '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
        '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };

    // Rows
    records.forEach(r => {
        const monthName = monthNames[r.month] || r.month;
        const period = `${monthName}/${r.year}`;
        
        xmlContent += '   <Row>\n';
        xmlContent += `    <Cell><Data ss:Type="String">${period}</Data></Cell>\n`;
        xmlContent += `    <Cell><Data ss:Type="String">${escapeXml(r.store)}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${r.totalRevenues}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${r.totalExpenses}</Data></Cell>\n`;
        xmlContent += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${r.netResult}</Data></Cell>\n`;
        xmlContent += '   </Row>\n';
    });

    xmlContent += '  </Table>\n';
    xmlContent += ' </Worksheet>\n';
    xmlContent += '</Workbook>\n';

    downloadXml(xmlContent, filename);
};

// === BACKUP FUNCTIONS ===

export const createBackup = () => {
    const appDataStr = localStorage.getItem(DATA_KEY);
    const ordersStr = localStorage.getItem(ORDERS_KEY);
    const trans043Str = localStorage.getItem(TRANSACTIONS_043_KEY);
    const saldoContasStr = localStorage.getItem(SALDO_CONTAS_KEY);
    const financeiroStr = localStorage.getItem(FINANCEIRO_KEY);
    
    const orders = ordersStr ? JSON.parse(ordersStr) : [];
    const trans043 = trans043Str ? JSON.parse(trans043Str) : [];
    const saldoContas = saldoContasStr ? JSON.parse(saldoContasStr) : [];
    const financeiro = financeiroStr ? JSON.parse(financeiroStr) : [];
    
    const ordersExport = orders.map((o: any) => ({
        ...o,
        date: formatDateBr(o.date),
        deliveryDate: o.deliveryDate ? formatDateBr(o.deliveryDate) : null
    }));
    
    // Export 043 with BR date
    const trans043Export = trans043.map((t: any) => ({
        ...t,
        date: formatDateBr(t.date)
    }));

    const backupObj = {
        version: 4, // Incremented version for Financeiro
        timestamp: new Date().toISOString(),
        appData: appDataStr ? JSON.parse(appDataStr) : defaultData,
        orders: ordersExport,
        transactions043: trans043Export,
        saldoContas: saldoContas,
        financeiro: financeiro
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = getTodayLocalISO().replace(/-/g, '');
    link.download = `HERO_GRILL_BACKUP_${dateStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const restoreBackup = async (file: File): Promise<{success: boolean, message: string}> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                if (!content) throw new Error("Arquivo vazio ou ilegível.");

                let parsed: any;
                try {
                    parsed = JSON.parse(content);
                } catch (jsonErr) {
                    const clean = content.replace(/^\uFEFF/, '').trim();
                    try {
                        parsed = JSON.parse(clean);
                    } catch (finalErr) {
                        throw new Error("O arquivo não é um JSON válido.");
                    }
                }
                
                if (!parsed || typeof parsed !== 'object') {
                    throw new Error("Estrutura do arquivo inválida.");
                }

                // Basic structure check
                if (!parsed.appData && !parsed.orders && !parsed.saldoContas && !parsed.financeiro) {
                    throw new Error("O arquivo não contém dados de backup válidos.");
                }

                // 1. App Data
                const newAppData: AppData = {
                    stores: Array.isArray(parsed.appData?.stores) ? parsed.appData.stores : [],
                    products: Array.isArray(parsed.appData?.products) ? parsed.appData.products : [],
                    brands: Array.isArray(parsed.appData?.brands) ? parsed.appData.brands : [],
                    suppliers: Array.isArray(parsed.appData?.suppliers) ? parsed.appData.suppliers : [],
                    units: Array.isArray(parsed.appData?.units) ? parsed.appData.units : [],
                };

                const safeNum = (val: any): number => {
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string') {
                        const v = val.trim();
                        if (!v) return 0;
                        if (v.includes(',')) {
                            const cleanDots = v.replace(/\./g, '');
                            const standard = cleanDots.replace(',', '.');
                            return parseFloat(standard) || 0;
                        }
                        return parseFloat(v) || 0;
                    }
                    return 0;
                };

                // 2. Orders
                const rawOrders = Array.isArray(parsed.orders) ? parsed.orders : [];
                const newOrders: Order[] = rawOrders.map((o: any, idx: number) => {
                    return {
                        id: o.id || `restored-${Date.now()}-${idx}`,
                        date: ensureIsoDate(o.date),
                        store: String(o.store || ''),
                        product: String(o.product || ''),
                        brand: String(o.brand || ''),
                        supplier: String(o.supplier || ''),
                        unitValue: safeNum(o.unitValue),
                        unitMeasure: String(o.unitMeasure || ''),
                        quantity: safeNum(o.quantity),
                        totalValue: safeNum(o.totalValue),
                        deliveryDate: o.deliveryDate ? ensureIsoDate(o.deliveryDate) : null
                    };
                });
                
                // 3. Transactions 043
                const rawTrans043 = Array.isArray(parsed.transactions043) ? parsed.transactions043 : [];
                const newTrans043: Transaction043[] = rawTrans043.map((t: any, idx: number) => {
                    return {
                        id: t.id || `restored-043-${Date.now()}-${idx}`,
                        date: ensureIsoDate(t.date),
                        store: String(t.store || ''),
                        type: t.type === 'DEBIT' || t.type === 'CREDIT' ? t.type : 'DEBIT',
                        value: safeNum(t.value),
                        description: String(t.description || '').substring(0, 50)
                    }
                });

                // 4. Saldo Contas (New)
                const rawSaldo = Array.isArray(parsed.saldoContas) ? parsed.saldoContas : [];
                const newSaldo: AccountBalance[] = rawSaldo.map((s: any, idx: number) => {
                    return {
                        id: s.id || `restored-saldo-${Date.now()}-${idx}`,
                        store: String(s.store || ''),
                        year: parseInt(s.year) || new Date().getFullYear(),
                        month: String(s.month || '01').padStart(2, '0'),
                        caixaEconomica: safeNum(s.caixaEconomica),
                        cofre: safeNum(s.cofre),
                        loteria: safeNum(s.loteria),
                        pagbankH: safeNum(s.pagbankH),
                        pagbankD: safeNum(s.pagbankD),
                        investimentos: safeNum(s.investimentos),
                        totalBalance: safeNum(s.totalBalance)
                    };
                });

                // 5. Financeiro (New)
                const rawFin = Array.isArray(parsed.financeiro) ? parsed.financeiro : [];
                const newFinanceiro: FinancialRecord[] = rawFin.map((f: any, idx: number) => {
                     return {
                         id: f.id || `restored-fin-${Date.now()}-${idx}`,
                         store: String(f.store || ''),
                         year: parseInt(f.year) || new Date().getFullYear(),
                         month: String(f.month || '01').padStart(2, '0'),
                         creditCaixa: safeNum(f.creditCaixa),
                         creditDelta: safeNum(f.creditDelta),
                         creditPagBankH: safeNum(f.creditPagBankH),
                         creditPagBankD: safeNum(f.creditPagBankD),
                         creditIfood: safeNum(f.creditIfood),
                         totalRevenues: safeNum(f.totalRevenues),
                         debitCaixa: safeNum(f.debitCaixa),
                         debitPagBankH: safeNum(f.debitPagBankH),
                         debitPagBankD: safeNum(f.debitPagBankD),
                         debitLoteria: safeNum(f.debitLoteria),
                         totalExpenses: safeNum(f.totalExpenses),
                         netResult: safeNum(f.netResult)
                     }
                });

                try {
                    localStorage.removeItem(DATA_KEY);
                    localStorage.removeItem(ORDERS_KEY);
                    localStorage.removeItem(TRANSACTIONS_043_KEY);
                    localStorage.removeItem(SALDO_CONTAS_KEY);
                    localStorage.removeItem(FINANCEIRO_KEY);

                    localStorage.setItem(DATA_KEY, JSON.stringify(newAppData));
                    localStorage.setItem(ORDERS_KEY, JSON.stringify(newOrders));
                    localStorage.setItem(TRANSACTIONS_043_KEY, JSON.stringify(newTrans043));
                    localStorage.setItem(SALDO_CONTAS_KEY, JSON.stringify(newSaldo));
                    localStorage.setItem(FINANCEIRO_KEY, JSON.stringify(newFinanceiro));
                } catch (storageError) {
                    throw new Error("Erro ao salvar no navegador. Armazenamento cheio.");
                }
                
                resolve({ 
                    success: true, 
                    message: `Sucesso!\n\nRecuperados:\n- ${newOrders.length} pedidos\n- ${newTrans043.length} lançamentos (043)\n- ${newSaldo.length} saldos de contas\n- ${newFinanceiro.length} registros financeiros\n- Lojas e cadastros.` 
                });
            } catch (error: any) {
                console.error("Backup error:", error);
                resolve({ success: false, message: error.message || "Erro desconhecido." });
            }
        };

        reader.onerror = () => {
            resolve({ success: false, message: 'Erro de leitura do arquivo físico.' });
        };

        reader.readAsText(file);
    });
};

export const generateMockData = () => {
    const mockStores = ['Matriz Londrina', 'Shopping Catuaí', 'Filial Centro', 'Loja Maringá', 'Quiosque Aeroporto'];
    const mockProducts = ['Picanha Grill', 'Filé Mignon', 'Alcatra Completa', 'Refrigerante Lata', 'Suco Natural', 'Cerveja Artesanal'];
    const mockBrands = ['Friboi', 'Seara', 'Coca-Cola', 'Ambev', 'Natural One', 'Swift'];
    const mockSuppliers = ['Distribuidora Paraná', 'Mercadão de Carnes', 'Bebidas Express', 'Hortifruti Central'];
    const mockUnits = ['Kg', 'Un', 'Lt', 'Cx'];

    const mockAppData: AppData = {
        stores: mockStores,
        products: mockProducts,
        brands: mockBrands,
        suppliers: mockSuppliers,
        units: mockUnits
    };

    const mockOrders: Order[] = [];
    const mockTrans043: Transaction043[] = [];
    const mockSaldoContas: AccountBalance[] = [];
    const mockFinanceiro: FinancialRecord[] = [];

    const today = new Date();
    
    // Orders Mock
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - Math.floor(Math.random() * 30));
        const dateStr = date.toISOString().split('T')[0];
        
        const isDelivered = Math.random() > 0.3;
        const unitValue = Math.floor(Math.random() * 50) + 5;
        const qty = Math.floor(Math.random() * 10) + 1;

        mockOrders.push({
            id: `mock-${i}`,
            date: dateStr,
            store: mockStores[Math.floor(Math.random() * mockStores.length)],
            product: mockProducts[Math.floor(Math.random() * mockProducts.length)],
            brand: mockBrands[Math.floor(Math.random() * mockBrands.length)],
            supplier: mockSuppliers[Math.floor(Math.random() * mockSuppliers.length)],
            unitMeasure: mockUnits[Math.floor(Math.random() * mockUnits.length)],
            unitValue: unitValue,
            quantity: qty,
            totalValue: unitValue * qty,
            deliveryDate: isDelivered ? dateStr : null
        });
    }

    // 043 Mock
    for (let i = 0; i < 15; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - Math.floor(Math.random() * 30));
        const dateStr = date.toISOString().split('T')[0];
        const isDebit = Math.random() > 0.5;
        
        mockTrans043.push({
            id: `mock043-${i}`,
            date: dateStr,
            store: mockStores[Math.floor(Math.random() * mockStores.length)],
            type: isDebit ? 'DEBIT' : 'CREDIT',
            value: Math.floor(Math.random() * 5000) + 100,
            description: isDebit ? 'Empréstimo bancário' : 'Devolução parcial'
        });
    }

    // Saldo Contas Mock (Generating for last 3 months for each store)
    const currentYear = today.getFullYear();
    const months = ['09', '10', '11'];
    
    let idCounter = 0;
    mockStores.forEach(store => {
        let previousBalance = 10000 + Math.random() * 5000;
        
        months.forEach(month => {
            // Fluctuation
            const cx = previousBalance * 0.2 + Math.random() * 1000;
            const cf = previousBalance * 0.1 + Math.random() * 500;
            const lt = Math.random() * 200;
            const ph = previousBalance * 0.3 + Math.random() * 2000;
            const pd = previousBalance * 0.1 + Math.random() * 1000;
            const inv = previousBalance * 0.3 + Math.random() * 3000;
            
            const total = cx + cf + lt + ph + pd + inv;

            mockSaldoContas.push({
                id: `mock-saldo-${idCounter++}`,
                store: store,
                year: currentYear,
                month: month,
                caixaEconomica: cx,
                cofre: cf,
                loteria: lt,
                pagbankH: ph,
                pagbankD: pd,
                investimentos: inv,
                totalBalance: total
            });
            
            // Financeiro Mock
            const revCaixa = Math.random() * 5000;
            const revDelta = Math.random() * 3000;
            const revPh = Math.random() * 8000;
            const revPd = Math.random() * 2000;
            const revIfood = Math.random() * 6000;
            const totalRev = revCaixa + revDelta + revPh + revPd + revIfood;

            const debCaixa = Math.random() * 2000;
            const debPh = Math.random() * 4000;
            const debPd = Math.random() * 1000;
            const debLot = Math.random() * 500;
            const totalExp = debCaixa + debPh + debPd + debLot;

            mockFinanceiro.push({
                id: `mock-fin-${idCounter}`,
                store: store,
                year: currentYear,
                month: month,
                creditCaixa: revCaixa,
                creditDelta: revDelta,
                creditPagBankH: revPh,
                creditPagBankD: revPd,
                creditIfood: revIfood,
                totalRevenues: totalRev,
                debitCaixa: debCaixa,
                debitPagBankH: debPh,
                debitPagBankD: debPd,
                debitLoteria: debLot,
                totalExpenses: totalExp,
                netResult: totalRev - totalExp
            });

            previousBalance = total; // simulate growth
        });
    });


    localStorage.setItem(DATA_KEY, JSON.stringify(mockAppData));
    localStorage.setItem(ORDERS_KEY, JSON.stringify(mockOrders));
    localStorage.setItem(TRANSACTIONS_043_KEY, JSON.stringify(mockTrans043));
    localStorage.setItem(SALDO_CONTAS_KEY, JSON.stringify(mockSaldoContas));
    localStorage.setItem(FINANCEIRO_KEY, JSON.stringify(mockFinanceiro));
};