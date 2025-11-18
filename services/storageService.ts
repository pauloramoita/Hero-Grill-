import { AppData, Order } from '../types';

const DATA_KEY = 'hero_grill_data';
const ORDERS_KEY = 'hero_grill_orders';

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

export const exportToCSV = (orders: Order[], filename: string) => {
    const headers = ['ID', 'Data Pedido', 'Loja', 'Produto', 'Marca', 'Fornecedor', 'Valor UN', 'Unidade', 'Qtd', 'Total', 'Data Entrega'];
    const csvContent = [
        headers.join(','),
        ...orders.map(o => [
            o.id,
            formatDateBr(o.date),
            `"${o.store}"`,
            `"${o.product}"`,
            `"${o.brand}"`,
            `"${o.supplier}"`,
            o.unitValue.toFixed(2).replace('.', ','),
            o.unitMeasure,
            o.quantity.toFixed(3).replace('.', ','),
            o.totalValue.toFixed(2).replace('.', ','),
            o.deliveryDate ? formatDateBr(o.deliveryDate) : 'Pendente'
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

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

export const exportToXML = (orders: Order[], filename: string) => {
    let xmlContent = '<?xml version="1.0"?>\n';
    xmlContent += '<?mso-application progid="Excel.Sheet"?>\n';
    xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xmlContent += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
    xmlContent += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
    xmlContent += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xmlContent += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
    
    // Styles
    xmlContent += ' <Styles>\n';
    xmlContent += '  <Style ss:ID="Default" ss:Name="Normal">\n';
    xmlContent += '   <Alignment ss:Vertical="Bottom"/>\n';
    xmlContent += '   <Borders/>\n';
    xmlContent += '   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>\n';
    xmlContent += '   <Interior/>\n';
    xmlContent += '   <NumberFormat/>\n';
    xmlContent += '   <Protection/>\n';
    xmlContent += '  </Style>\n';
    
    xmlContent += '  <Style ss:ID="HeaderStyle">\n';
    xmlContent += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
    xmlContent += '   <Borders>\n';
    xmlContent += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
    xmlContent += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
    xmlContent += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
    xmlContent += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
    xmlContent += '   </Borders>\n';
    xmlContent += '   <Font ss:FontName="Calibri" ss:Size="12" ss:Color="#FFFFFF" ss:Bold="1"/>\n';
    xmlContent += '   <Interior ss:Color="#D32F2F" ss:Pattern="Solid"/>\n';
    xmlContent += '  </Style>\n';

    xmlContent += '  <Style ss:ID="CurrencyStyle">\n';
    xmlContent += '   <NumberFormat ss:Format="Currency"/>\n';
    xmlContent += '  </Style>\n';
    
    xmlContent += '  <Style ss:ID="CenterStyle">\n';
    xmlContent += '   <Alignment ss:Horizontal="Center"/>\n';
    xmlContent += '  </Style>\n';
    xmlContent += ' </Styles>\n';

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

    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
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

// === BACKUP FUNCTIONS ===

export const createBackup = () => {
    const appDataStr = localStorage.getItem(DATA_KEY);
    const ordersStr = localStorage.getItem(ORDERS_KEY);
    
    const orders = ordersStr ? JSON.parse(ordersStr) : [];
    
    // Keep exporting dates in BR format for user readability in JSON
    const ordersExport = orders.map((o: any) => ({
        ...o,
        date: formatDateBr(o.date),
        deliveryDate: o.deliveryDate ? formatDateBr(o.deliveryDate) : null
    }));

    const backupObj = {
        version: 1,
        timestamp: new Date().toISOString(),
        appData: appDataStr ? JSON.parse(appDataStr) : defaultData,
        orders: ordersExport
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

                // 1. Try to parse JSON
                let parsed: any;
                try {
                    parsed = JSON.parse(content);
                } catch (jsonErr) {
                    // Retry sanitizing BOM or weird chars
                    const clean = content.replace(/^\uFEFF/, '').trim();
                    try {
                        parsed = JSON.parse(clean);
                    } catch (finalErr) {
                        throw new Error("O arquivo não é um JSON válido.");
                    }
                }
                
                if (!parsed || typeof parsed !== 'object') {
                    throw new Error("Estrutura do arquivo inválida. Certifique-se que é um arquivo .json exportado pelo sistema.");
                }

                // Check if critical keys exist
                if (!parsed.appData && !parsed.orders) {
                    throw new Error("O arquivo não contém dados de backup válidos (chaves 'appData' ou 'orders' ausentes).");
                }

                // 2. Normalize AppData (Create arrays if missing)
                const newAppData: AppData = {
                    stores: Array.isArray(parsed.appData?.stores) ? parsed.appData.stores : [],
                    products: Array.isArray(parsed.appData?.products) ? parsed.appData.products : [],
                    brands: Array.isArray(parsed.appData?.brands) ? parsed.appData.brands : [],
                    suppliers: Array.isArray(parsed.appData?.suppliers) ? parsed.appData.suppliers : [],
                    units: Array.isArray(parsed.appData?.units) ? parsed.appData.units : [],
                };

                // 3. Normalize Orders (Sanitize every field)
                const rawOrders = Array.isArray(parsed.orders) ? parsed.orders : [];
                
                // Robust Number Parser for BR vs US formats
                const safeNum = (val: any): number => {
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string') {
                        const v = val.trim();
                        if (!v) return 0;
                        
                        // If it has a comma, it's almost certainly BR format (1.200,50 or 12,50)
                        if (v.includes(',')) {
                            // Remove all dots (thousands separators)
                            const cleanDots = v.replace(/\./g, '');
                            // Replace comma with dot
                            const standard = cleanDots.replace(',', '.');
                            return parseFloat(standard) || 0;
                        }
                        
                        // If no comma, assume standard float (1200.50) or integer (1200)
                        return parseFloat(v) || 0;
                    }
                    return 0;
                };

                const newOrders: Order[] = rawOrders.map((o: any, idx: number) => {
                    return {
                        id: o.id || `restored-${Date.now()}-${idx}`,
                        // Ensure date is ISO (YYYY-MM-DD) regardless of input format
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

                // 4. Save to LocalStorage
                try {
                    localStorage.removeItem(DATA_KEY);
                    localStorage.removeItem(ORDERS_KEY);

                    localStorage.setItem(DATA_KEY, JSON.stringify(newAppData));
                    localStorage.setItem(ORDERS_KEY, JSON.stringify(newOrders));
                } catch (storageError) {
                    throw new Error("Erro ao salvar no navegador. Armazenamento cheio ou bloqueado.");
                }
                
                // Calculate totals for feedback
                const totalStores = newAppData.stores.length;
                const totalProducts = newAppData.products.length;
                
                resolve({ 
                    success: true, 
                    message: `Sucesso!\n\nForam recuperados:\n- ${newOrders.length} pedidos\n- ${totalProducts} produtos cadastrados\n- ${totalStores} lojas cadastradas.` 
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

// === MOCK DATA GENERATOR (FOR DEV/TESTING) ===
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
    const today = new Date();
    
    // Generate 30 random orders for the last 30 days
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

    localStorage.setItem(DATA_KEY, JSON.stringify(mockAppData));
    localStorage.setItem(ORDERS_KEY, JSON.stringify(mockOrders));
};
