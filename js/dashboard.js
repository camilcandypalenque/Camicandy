/**
 * Módulo de Dashboard para Camil Candy POS
 * Muestra estadísticas generales y resumen del negocio
 */

/**
 * Inicializa el módulo de Dashboard
 */
function initializeDashboard() {
    console.log('✅ Módulo de dashboard inicializado');
}

/**
 * Carga y muestra el dashboard
 */
async function loadDashboard() {
    const products = window.getProducts ? window.getProducts() : [];
    const settings = window.getSettings ? window.getSettings() : {};

    UI.showLoading('Cargando dashboard...');

    try {
        const sales = await FirebaseService.getSales();
        const currencySymbol = settings.currencySymbol || '$';

        // Calcular estadísticas generales
        const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalProductsCount = products.length;
        const concentradosCount = products.filter(p => p.type === 'concentrado').length;
        const embolsadosCount = products.filter(p => p.type === 'embolsado').length;
        const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

        // Ventas del mes actual
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const monthlySales = sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= startOfMonth && saleDate <= endOfMonth;
        }).reduce((sum, sale) => sum + sale.total, 0);

        // Actualizar tarjetas del dashboard
        updateDashboardCard('dashboardTotalSales', `${currencySymbol}${totalSales.toFixed(2)}`);
        updateDashboardCard('dashboardTotalProducts', totalProductsCount);
        updateDashboardCard('dashboardProductTypes', `${concentradosCount} concentrados, ${embolsadosCount} embolsados`);
        updateDashboardCard('dashboardMonthlySales', `${currencySymbol}${monthlySales.toFixed(2)}`);
        updateDashboardCard('dashboardLowStock', lowStockCount);

        // Cargar secciones del dashboard
        loadRecentSales(sales, settings);
        loadLowStockProducts(products);
        loadMonthlyTopProducts(sales, products, settings);

    } catch (error) {
        console.error('Error cargando dashboard:', error);
    } finally {
        UI.hideLoading();
    }
}

/**
 * Actualiza una tarjeta del dashboard
 */
function updateDashboardCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Carga las ventas recientes
 */
function loadRecentSales(sales, settings) {
    const recentSalesList = document.getElementById('recentSalesList');
    if (!recentSalesList) return;

    const currencySymbol = settings.currencySymbol || '$';
    const recentSales = [...sales]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recentSales.length === 0) {
        recentSalesList.innerHTML = `
            <p style="text-align: center; color: #666; padding: 20px;">
                No hay ventas recientes.
            </p>
        `;
        return;
    }

    let html = '';
    recentSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const formattedDate = saleDate.toLocaleDateString();
        const formattedTime = saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        html += `
            <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600;">Venta #${sale.id}</div>
                    <div style="font-size: 0.8rem; color: #666;">${formattedDate} ${formattedTime}</div>
                </div>
                <div style="font-weight: 600; color: var(--success-color);">
                    ${currencySymbol}${sale.total.toFixed(2)}
                </div>
            </div>
        `;
    });

    recentSalesList.innerHTML = html;
}

/**
 * Carga los productos con bajo stock
 */
function loadLowStockProducts(products) {
    const lowStockProducts = document.getElementById('lowStockProducts');
    if (!lowStockProducts) return;

    const lowStockItems = products
        .filter(p => p.stock <= p.minStock)
        .slice(0, 5);

    if (lowStockItems.length === 0) {
        lowStockProducts.innerHTML = `
            <p style="text-align: center; color: #666; padding: 20px;">
                Todos los productos tienen inventario suficiente.
            </p>
        `;
        return;
    }

    let html = '';
    lowStockItems.forEach(product => {
        const percentage = (product.stock / product.minStock * 100).toFixed(0);
        const statusClass = product.stock <= product.minStock ? 'inventory-low' : 'inventory-ok';
        const barColor = percentage <= 30 ? 'var(--danger-color)' :
            percentage <= 60 ? 'var(--warning-color)' : 'var(--success-color)';

        html += `
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 600;">${product.name}</div>
                    <div class="${statusClass}" style="font-weight: 600;">${product.stock} / ${product.minStock}</div>
                </div>
                <div style="margin-top: 5px;">
                    <div style="height: 6px; background-color: #e9ecef; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${Math.min(percentage, 100)}%; background-color: ${barColor};"></div>
                    </div>
                </div>
            </div>
        `;
    });

    lowStockProducts.innerHTML = html;
}

/**
 * Carga los productos más vendidos del mes
 */
function loadMonthlyTopProducts(sales, products, settings) {
    const monthlyTopProducts = document.getElementById('monthlyTopProducts');
    if (!monthlyTopProducts) return;

    const currencySymbol = settings.currencySymbol || '$';

    // Filtrar ventas del mes actual
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    let productSales = {};

    sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfMonth && saleDate <= endOfMonth;
    }).forEach(sale => {
        sale.details.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        name: product.name,
                        type: product.type,
                        quantity: 0,
                        total: 0
                    };
                }
                productSales[item.productId].quantity += item.quantity;
                productSales[item.productId].total += item.subtotal;
            }
        });
    });

    const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    if (topProducts.length === 0) {
        monthlyTopProducts.innerHTML = `
            <p style="text-align: center; color: #666; padding: 20px;">
                No hay datos de ventas para este mes.
            </p>
        `;
        return;
    }

    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">';

    topProducts.forEach((product, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const badgeClass = product.type === 'concentrado' ? 'badge-concentrado' : 'badge-embolsado';
        const badgeText = product.type === 'concentrado' ? 'Concentrado' : 'Embolsado';

        html += `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: var(--border-radius);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="font-size: 1.5rem;">${medal}</div>
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                <div style="font-weight: 600; margin-bottom: 5px;">${product.name}</div>
                <div style="font-size: 0.9rem; color: #666;">Vendidos: ${product.quantity}</div>
                <div style="font-weight: 600; color: var(--success-color); margin-top: 5px;">
                    ${currencySymbol}${product.total.toFixed(2)}
                </div>
            </div>
        `;
    });

    html += '</div>';
    monthlyTopProducts.innerHTML = html;
}

// Hacer funciones disponibles globalmente
window.initializeDashboard = initializeDashboard;
window.loadDashboard = loadDashboard;
