/**
 * Módulo de Reportes para Camil Candy POS
 * Maneja la generación y visualización de reportes
 */

// Variables del módulo
let currentSalesPage = 1;
const SALES_PER_PAGE = 20;

/**
 * Obtiene la fecha local en formato YYYY-MM-DD
 * Evita problemas de zona horaria que ocurren con toISOString()
 */
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Inicializa el módulo de reportes
 */
function initializeReports() {
    setupReportsEventListeners();
    setDefaultDates();

    // Cargar reportes automáticamente al inicializar
    // Usamos un pequeño delay para asegurar que todos los elementos estén listos
    setTimeout(() => {
        loadReports();
        console.log('📊 Reportes cargados automáticamente con fecha de hoy');
    }, 500);

    console.log('✅ Módulo de reportes inicializado');
}

/**
 * Configura los event listeners de reportes
 */
function setupReportsEventListeners() {
    const generateReportBtn = document.getElementById('generateReportBtn');
    const exportReportBtn = document.getElementById('exportReportBtn');
    const reportRangeSelect = document.getElementById('reportRange');
    const loadMoreSalesBtn = document.getElementById('loadMoreSalesBtn');
    const tabButtons = document.querySelectorAll('.tab-btn');

    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', loadReports);
    }

    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', exportReportToExcel);
    }

    if (reportRangeSelect) {
        reportRangeSelect.addEventListener('change', toggleCustomRange);
    }

    if (loadMoreSalesBtn) {
        loadMoreSalesBtn.addEventListener('click', loadMoreSales);
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchReportTab(tabId);
        });
    });
}

/**
 * Establece las fechas por defecto usando hora local
 */
function setDefaultDates() {
    // Usar getLocalDateString para evitar problemas de zona horaria
    const today = getLocalDateString();
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    if (startDate) startDate.value = today;
    if (endDate) endDate.value = today;

    console.log('📅 Fechas establecidas a:', today);
}

/**
 * Establece un rango rápido de fechas (Hoy, Ayer, Semana, Mes)
 */
function setQuickRange(range) {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    let startDate = todayStr;
    let endDate = todayStr;

    switch (range) {
        case 'hoy':
            startDate = endDate = todayStr;
            break;
        case 'ayer':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = endDate = getLocalDateString(yesterday);
            break;
        case 'semana':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startDate = getLocalDateString(startOfWeek);
            endDate = todayStr;
            break;
        case 'mes':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate = getLocalDateString(startOfMonth);
            endDate = todayStr;
            break;
    }

    if (startDateInput) startDateInput.value = startDate;
    if (endDateInput) endDateInput.value = endDate;

    // Cargar reportes automáticamente al seleccionar rango rápido
    loadReports();

    console.log(`⚡ Rango rápido: ${range} (${startDate} - ${endDate})`);
}

// Exponer setQuickRange globalmente
window.setQuickRange = setQuickRange;

/**
 * Alterna la visibilidad del rango personalizado
 */
function toggleCustomRange() {
    const reportRangeSelect = document.getElementById('reportRange');
    const customRangeRow = document.getElementById('customRangeRow');

    if (customRangeRow) {
        customRangeRow.style.display = reportRangeSelect.value === 'personalizado' ? 'flex' : 'none';
    }
}

/**
 * Cambia entre pestañas de reportes
 */
function switchReportTab(tabId) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const reportContents = document.querySelectorAll('.report-content');

    tabButtons.forEach(btn => btn.classList.remove('active'));
    reportContents.forEach(content => content.classList.remove('active'));

    const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
    const selectedContent = document.getElementById(tabId);

    if (selectedTab) selectedTab.classList.add('active');
    if (selectedContent) selectedContent.classList.add('active');
}

/**
 * Carga todos los reportes
 */
async function loadReports() {
    const products = window.getProducts ? window.getProducts() : [];
    const settings = window.getSettings ? window.getSettings() : {};

    UI.showLoading('Cargando reportes...');

    try {
        const sales = await FirebaseService.getSales();
        const filteredSales = filterSales(sales, products);

        // Calcular estadísticas
        updateSummaryCards(filteredSales, products, settings);

        // Cargar reportes específicos
        loadDailyReport(filteredSales, products, settings);
        loadPendingReport(settings);  // Ventas a crédito pendientes
        loadSalesReport(filteredSales, products, settings);
        loadInventoryReport(products, settings);
        loadProductsReport(filteredSales, products, settings);

        currentSalesPage = 1;
    } catch (error) {
        console.error('Error cargando reportes:', error);
    } finally {
        UI.hideLoading();
    }
}

/**
 * Filtra las ventas según los criterios seleccionados
 */
function filterSales(sales, products) {
    const filterType = document.getElementById('reportType')?.value || 'todos';
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    let filteredSales = [...sales];

    // Usar directamente los valores de los campos de fecha
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const startDate = startDateInput?.value || todayStr;
    const endDate = endDateInput?.value || todayStr;

    // Filtrar por fecha usando hora LOCAL
    filteredSales = filteredSales.filter(sale => {
        const saleDate = getLocalDateString(new Date(sale.date));
        return saleDate >= startDate && saleDate <= endDate;
    });

    // Filtrar por tipo de producto
    if (filterType !== 'todos') {
        filteredSales = filteredSales.map(sale => {
            const filteredDetails = sale.details.filter(item => {
                const product = products.find(p => p.id === item.productId);
                return product && product.type === filterType;
            });

            if (filteredDetails.length > 0) {
                const subtotal = filteredDetails.reduce((sum, item) => sum + item.subtotal, 0);
                const taxAmount = (sale.taxRate || 0) > 0 ? subtotal * (sale.taxRate / 100) : 0;

                return {
                    ...sale,
                    details: filteredDetails,
                    subtotal: subtotal,
                    taxAmount: taxAmount,
                    total: subtotal + taxAmount
                };
            }
            return null;
        }).filter(sale => sale !== null);
    }

    return filteredSales;
}

/**
 * Actualiza las tarjetas de resumen
 */
function updateSummaryCards(filteredSales, products, settings) {
    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const salesCount = filteredSales.length;
    const avgSale = salesCount > 0 ? totalSales / salesCount : 0;

    let concentradosCount = 0;
    let embolsadosCount = 0;
    let totalProductsSold = 0;

    filteredSales.forEach(sale => {
        sale.details.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                totalProductsSold += item.quantity;
                if (product.type === 'concentrado') {
                    concentradosCount += item.quantity;
                } else {
                    embolsadosCount += item.quantity;
                }
            }
        });
    });

    const lowInventoryCount = products.filter(p => p.stock <= p.minStock).length;
    const currencySymbol = settings.currencySymbol || '$';

    const salesTodayValue = document.getElementById('salesTodayValue');
    const salesTodayCount = document.getElementById('salesTodayCount');
    const productsSoldValue = document.getElementById('productsSoldValue');
    const productsSoldType = document.getElementById('productsSoldType');
    const avgSaleValue = document.getElementById('avgSaleValue');
    const lowInventoryValue = document.getElementById('lowInventoryValue');

    if (salesTodayValue) salesTodayValue.textContent = `${currencySymbol}${totalSales.toFixed(2)}`;
    if (salesTodayCount) salesTodayCount.textContent = `${salesCount} ventas`;
    if (productsSoldValue) productsSoldValue.textContent = totalProductsSold;
    if (productsSoldType) productsSoldType.textContent = `${concentradosCount} concentrados, ${embolsadosCount} embolsados`;
    if (avgSaleValue) avgSaleValue.textContent = `${currencySymbol}${avgSale.toFixed(2)}`;
    if (lowInventoryValue) lowInventoryValue.textContent = lowInventoryCount;
}

/**
 * Carga el reporte diario
 */
function loadDailyReport(filteredSales, products, settings) {
    const dailyReportBody = document.getElementById('dailyReportBody');
    if (!dailyReportBody) return;

    const currencySymbol = settings.currencySymbol || '$';

    if (filteredSales.length === 0) {
        dailyReportBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                    <p>No hay ventas para el período seleccionado.</p>
                </td>
            </tr>
        `;

        const dailySummaryDetails = document.getElementById('dailySummaryDetails');
        if (dailySummaryDetails) {
            dailySummaryDetails.innerHTML = '<p>No hay datos de ventas para mostrar.</p>';
        }
        return;
    }

    const sortedSales = [...filteredSales].sort((a, b) => new Date(b.date) - new Date(a.date));

    dailyReportBody.innerHTML = '';

    sortedSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const formattedTime = saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let totalItems = 0;
        let concentrados = 0;
        let embolsados = 0;
        let productsList = [];

        sale.details.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                totalItems += item.quantity;
                productsList.push(`${item.quantity}x ${item.name || product.name}`);
                if (product.type === 'concentrado') {
                    concentrados += item.quantity;
                } else {
                    embolsados += item.quantity;
                }
            } else {
                // Si no encontramos el producto, usar el nombre del item
                totalItems += item.quantity;
                productsList.push(`${item.quantity}x ${item.name || 'Producto'}`);
            }
        });

        // Mostrar lista de productos con descripción
        const productsDescription = productsList.join(', ');
        const productsSummary = `<strong>${productsDescription}</strong><br><small style="color: #888;">(${concentrados} conc., ${embolsados} emb.)</small>`;

        // Info del cliente y pago si está disponible
        const isPending = sale.status === 'pending';
        const paymentStyle = isPending ? 'color: #dc3545; font-weight: bold;' : 'color: #6a11cb;';
        const customerInfo = sale.customerName ?
            `<br><small style="${paymentStyle}"><i class="fas fa-user"></i> ${sale.customerName} - ${sale.paymentLabel || 'N/A'}</small>` : '';

        // Botón de cobrar para ventas pendientes
        const collectBtn = isPending ?
            `<button class="btn btn-success btn-sm" onclick="markAsPaid('${sale.id}')" style="padding: 5px 10px; font-size: 0.8rem; margin-left: 5px;">
                <i class="fas fa-check"></i> Cobrar
            </button>` : '';

        const row = document.createElement('tr');
        row.style.backgroundColor = isPending ? '#fff5f5' : '';
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td>#${sale.id}</td>
            <td style="max-width: 300px;">${productsSummary}${customerInfo}</td>
            <td>${totalItems}</td>
            <td>${currencySymbol}${sale.total.toFixed(2)}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewSaleDetail(${sale.id})" style="padding: 5px 10px; font-size: 0.9rem;">
                    <i class="fas fa-eye"></i> Ver
                </button>
                ${collectBtn}
            </td>
        `;

        dailyReportBody.appendChild(row);
    });

    // Resumen del día
    const totalSales = sortedSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItemsSold = sortedSales.reduce((sum, sale) =>
        sum + sale.details.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

    const dailySummaryDetails = document.getElementById('dailySummaryDetails');
    if (dailySummaryDetails) {
        dailySummaryDetails.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 10px;">
                <div><strong>Total Ventas:</strong> ${currencySymbol}${totalSales.toFixed(2)}</div>
                <div><strong>Productos Vendidos:</strong> ${totalItemsSold}</div>
                <div><strong>Promedio por Venta:</strong> ${currencySymbol}${(totalSales / sortedSales.length).toFixed(2)}</div>
                <div><strong>Venta Más Alta:</strong> ${currencySymbol}${Math.max(...sortedSales.map(s => s.total)).toFixed(2)}</div>
            </div>
        `;
    }
}

/**
 * Carga el reporte histórico de ventas
 */
function loadSalesReport(filteredSales, products, settings) {
    const salesReportBody = document.getElementById('salesReportBody');
    const loadMoreSalesBtn = document.getElementById('loadMoreSalesBtn');
    if (!salesReportBody) return;

    const currencySymbol = settings.currencySymbol || '$';
    const totalSales = filteredSales.length;
    const startIndex = (currentSalesPage - 1) * SALES_PER_PAGE;
    const endIndex = Math.min(startIndex + SALES_PER_PAGE, totalSales);
    const salesToShow = filteredSales.slice(startIndex, endIndex);

    if (currentSalesPage === 1) {
        salesReportBody.innerHTML = '';
    }

    if (salesToShow.length === 0 && currentSalesPage === 1) {
        salesReportBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-shopping-cart" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                    <p>No hay ventas para el período seleccionado.</p>
                </td>
            </tr>
        `;
        if (loadMoreSalesBtn) loadMoreSalesBtn.style.display = 'none';
        return;
    }

    salesToShow.forEach(sale => {
        const saleDate = new Date(sale.date);
        const formattedDate = saleDate.toLocaleDateString();

        let concentrados = 0;
        let embolsados = 0;
        let totalItems = 0;

        sale.details.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                totalItems += item.quantity;
                if (product.type === 'concentrado') {
                    concentrados += item.quantity;
                } else {
                    embolsados += item.quantity;
                }
            }
        });

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>#${sale.id}</td>
            <td>${concentrados}</td>
            <td>${embolsados}</td>
            <td>${totalItems}</td>
            <td>${currencySymbol}${sale.total.toFixed(2)}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewSaleDetail(${sale.id})" style="padding: 5px 10px; font-size: 0.9rem;">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        `;

        salesReportBody.appendChild(row);
    });

    if (loadMoreSalesBtn) {
        if (endIndex < totalSales) {
            loadMoreSalesBtn.style.display = 'block';
            loadMoreSalesBtn.textContent = `Cargar Más (${endIndex} de ${totalSales})`;
        } else {
            loadMoreSalesBtn.style.display = 'none';
        }
    }
}

/**
 * Carga más ventas en el reporte
 */
async function loadMoreSales() {
    currentSalesPage++;
    const products = window.getProducts ? window.getProducts() : [];
    const settings = window.getSettings ? window.getSettings() : {};
    const sales = await FirebaseService.getSales();
    const filteredSales = filterSales(sales, products);
    loadSalesReport(filteredSales, products, settings);
}

// Continúa en reports-part2.js...
window.initializeReports = initializeReports;
window.loadReports = loadReports;
window.switchReportTab = switchReportTab;
