/**
 * Módulo de Reportes Parte 2 para Camil Candy POS
 * Reporte de inventario, productos más vendidos y exportación
 */

/**
 * Carga el reporte de inventario
 */
function loadInventoryReport(products, settings) {
    const inventoryReportBody = document.getElementById('inventoryReportBody');
    if (!inventoryReportBody) return;

    const currencySymbol = settings.currencySymbol || '$';

    if (products.length === 0) {
        inventoryReportBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                    <p>No hay productos en el inventario.</p>
                </td>
            </tr>
        `;
        return;
    }

    // Ordenar productos por estado
    const sortedProducts = [...products].sort((a, b) => {
        const aStatus = a.stock <= a.minStock ? 0 : 1;
        const bStatus = b.stock <= b.minStock ? 0 : 1;
        return aStatus - bStatus;
    });

    inventoryReportBody.innerHTML = '';

    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    sortedProducts.forEach(product => {
        const statusClass = product.stock <= product.minStock ? 'inventory-low' : 'inventory-ok';
        const statusText = product.stock === 0 ? 'AGOTADO' : (product.stock <= product.minStock ? 'BAJO' : 'OK');
        const badgeClass = product.type === 'concentrado' ? 'badge-concentrado' : 'badge-embolsado';
        const badgeText = product.type === 'concentrado' ? 'Concentrado' : 'Embolsado';
        const productValue = product.cost * product.stock;
        totalValue += productValue;

        if (product.stock <= product.minStock) lowStockCount++;
        if (product.stock === 0) outOfStockCount++;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td class="${statusClass}">${product.stock}</td>
            <td>${product.minStock}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>${currencySymbol}${productValue.toFixed(2)}</td>
            <td>-</td>
        `;

        inventoryReportBody.appendChild(row);
    });

    // Resumen de inventario
    const inventorySummaryDetails = document.getElementById('inventorySummaryDetails');
    if (inventorySummaryDetails) {
        inventorySummaryDetails.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 10px;">
                <div><strong>Valor Total Inventario:</strong> ${currencySymbol}${totalValue.toFixed(2)}</div>
                <div><strong>Productos con Bajo Stock:</strong> ${lowStockCount}</div>
                <div><strong>Productos Agotados:</strong> ${outOfStockCount}</div>
                <div><strong>Productos Totales:</strong> ${products.length}</div>
            </div>
        `;
    }
}

/**
 * Carga el reporte de productos más vendidos
 */
function loadProductsReport(filteredSales, products, settings) {
    const productsReportBody = document.getElementById('productsReportBody');
    if (!productsReportBody) return;

    const currencySymbol = settings.currencySymbol || '$';

    // Calcular ventas por producto
    let productSales = {};

    filteredSales.forEach(sale => {
        sale.details.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        name: product.name,
                        type: product.type,
                        quantity: 0,
                        total: 0,
                        stock: product.stock
                    };
                }
                productSales[item.productId].quantity += item.quantity;
                productSales[item.productId].total += item.subtotal;
            }
        });
    });

    const sortedProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity);

    if (sortedProducts.length === 0) {
        productsReportBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-star" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                    <p>No hay datos de ventas para mostrar productos más vendidos.</p>
                </td>
            </tr>
        `;

        const topProductsChart = document.getElementById('topProductsChart');
        if (topProductsChart) {
            topProductsChart.innerHTML = '<p>No hay datos suficientes para mostrar el ranking.</p>';
        }
        return;
    }

    const totalSalesAll = sortedProducts.reduce((sum, p) => sum + p.total, 0);

    productsReportBody.innerHTML = '';

    sortedProducts.forEach((product, index) => {
        const position = index + 1;
        const badgeClass = product.type === 'concentrado' ? 'badge-concentrado' : 'badge-embolsado';
        const badgeText = product.type === 'concentrado' ? 'Concentrado' : 'Embolsado';
        const percentage = totalSalesAll > 0 ? (product.total / totalSalesAll * 100).toFixed(1) : 0;

        const performance = product.stock > 0 ?
            ((product.quantity / product.stock) * 100).toFixed(1) :
            product.quantity > 0 ? '∞' : '0';

        const performanceClass = product.stock > 0 && (product.quantity / product.stock) > 0.5 ?
            'inventory-ok' : 'inventory-low';

        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : position;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${medal}</td>
            <td>${product.name}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>${product.quantity}</td>
            <td>${currencySymbol}${product.total.toFixed(2)}</td>
            <td>${percentage}%</td>
            <td>${product.stock}</td>
            <td class="${performanceClass}">${performance}%</td>
        `;

        productsReportBody.appendChild(row);
    });

    // Gráfico de top productos
    const top5 = sortedProducts.slice(0, 5);
    let chartHTML = '<div style="margin-top: 10px;">';

    top5.forEach((product, index) => {
        const percentage = totalSalesAll > 0 ? (product.total / totalSalesAll * 100).toFixed(1) : 0;
        const barWidth = Math.min(percentage * 3, 100);
        const colors = ['#ffc107', '#6c757d', '#dc3545', '#17a2b8', '#28a745'];

        chartHTML += `
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${index + 1}. ${product.name}</span>
                    <span>${percentage}% (${currencySymbol}${product.total.toFixed(2)})</span>
                </div>
                <div style="height: 10px; background-color: #e9ecef; border-radius: 5px; overflow: hidden;">
                    <div style="height: 100%; width: ${barWidth}%; background-color: ${colors[index]};"></div>
                </div>
            </div>
        `;
    });

    chartHTML += '</div>';

    const topProductsChart = document.getElementById('topProductsChart');
    if (topProductsChart) {
        topProductsChart.innerHTML = chartHTML;
    }
}

/**
 * Muestra los detalles de una venta
 */
async function viewSaleDetail(saleId) {
    const sales = await FirebaseService.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const products = window.getProducts ? window.getProducts() : [];
    const settings = window.getSettings ? window.getSettings() : {};
    const currencySymbol = settings.currencySymbol || '$';

    const saleDate = new Date(sale.date);
    const formattedDate = saleDate.toLocaleDateString() + ' ' + saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const saleDetailId = document.getElementById('saleDetailId');
    const saleDetailBody = document.getElementById('saleDetailBody');
    const saleDetailModal = document.getElementById('saleDetailModal');

    if (saleDetailId) saleDetailId.textContent = sale.id;

    let detailsHTML = `
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Subtotal:</strong> ${currencySymbol}${sale.subtotal.toFixed(2)}</p>
        ${sale.taxRate > 0 ? `<p><strong>Impuesto (${sale.taxRate}%):</strong> ${currencySymbol}${sale.taxAmount.toFixed(2)}</p>` : ''}
        <p><strong>Total Venta:</strong> ${currencySymbol}${sale.total.toFixed(2)}</p>
        <p><strong>Productos Vendidos:</strong> ${sale.details.length}</p>
        
        <h4 style="margin-top: 20px; margin-bottom: 15px;">Detalles de Productos</h4>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 10px; text-align: left;">Producto</th>
                        <th style="padding: 10px; text-align: center;">Cantidad</th>
                        <th style="padding: 10px; text-align: right;">Precio</th>
                        <th style="padding: 10px; text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let concentradosTotal = 0;
    let embolsadosTotal = 0;

    sale.details.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const productType = product ? product.type : 'desconocido';
        const badgeClass = productType === 'concentrado' ? 'badge-concentrado' : 'badge-embolsado';
        const badgeText = productType === 'concentrado' ? 'Concentrado' : 'Embolsado';

        if (productType === 'concentrado') {
            concentradosTotal += item.subtotal;
        } else {
            embolsadosTotal += item.subtotal;
        }

        detailsHTML += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    ${item.name} <span class="badge ${badgeClass}">${badgeText}</span>
                </td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${currencySymbol}${item.price.toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${currencySymbol}${item.subtotal.toFixed(2)}</td>
            </tr>
        `;
    });

    detailsHTML += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total Concentrados:</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold;">${currencySymbol}${concentradosTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total Embolsados:</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold;">${currencySymbol}${embolsadosTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold; color: var(--secondary-color);">TOTAL VENTA:</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold; color: var(--primary-color);">${currencySymbol}${sale.total.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    if (saleDetailBody) saleDetailBody.innerHTML = detailsHTML;
    if (saleDetailModal) saleDetailModal.classList.add('active');
}

/**
 * Exporta el reporte activo a CSV
 */
function exportReportToExcel() {
    const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');
    let csvContent = "data:text/csv;charset=utf-8,";

    if (activeTab === 'dailyReport') {
        csvContent += "Reporte Diario de Ventas\n";
        csvContent += "Hora,ID Venta,Productos,Cantidad Total,Total Venta\n";

        const rows = document.querySelectorAll('#dailyReportBody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
                const rowData = [
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent.replace(/,/g, ';'),
                    cells[3].textContent,
                    cells[4].textContent
                ];
                csvContent += rowData.join(",") + "\n";
            }
        });
    } else if (activeTab === 'inventoryReport') {
        csvContent += "Reporte de Estado de Inventario\n";
        csvContent += "ID,Producto,Tipo,Stock Actual,Stock Mínimo,Estado,Valor\n";

        const rows = document.querySelectorAll('#inventoryReportBody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 7) {
                const rowData = [
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent,
                    cells[4].textContent,
                    cells[5].textContent,
                    cells[6].textContent
                ];
                csvContent += rowData.join(",") + "\n";
            }
        });
    } else if (activeTab === 'productsReport') {
        csvContent += "Productos Más Vendidos\n";
        csvContent += "Posición,Producto,Tipo,Unidades Vendidas,Total en Ventas,%\n";

        const rows = document.querySelectorAll('#productsReportBody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 6) {
                const rowData = [
                    cells[0].textContent.replace('🥇', '1').replace('🥈', '2').replace('🥉', '3'),
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent,
                    cells[4].textContent,
                    cells[5].textContent.replace('%', '')
                ];
                csvContent += rowData.join(",") + "\n";
            }
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    UI.showNotification('Reporte exportado exitosamente.', 'success');
}
/**
 * Carga el reporte de ventas pendientes (a crédito)
 */
async function loadPendingReport(settings) {
    const pendingReportBody = document.getElementById('pendingReportBody');
    if (!pendingReportBody) return;

    const currencySymbol = settings?.currencySymbol || '$';

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('sales')
            .where('status', '==', 'pending')
            .get();

        const pendingSales = [];
        snapshot.forEach(doc => {
            pendingSales.push({ docId: doc.id, ...doc.data() });
        });

        if (pendingSales.length === 0) {
            pendingReportBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-check-circle" style="font-size: 3rem; color: #28a745; margin-bottom: 15px;"></i>
                        <p style="color: #28a745;">¡No hay ventas pendientes de pago!</p>
                        <p style="color: #666; font-size: 0.9rem;">Todas las ventas a crédito han sido cobradas.</p>
                    </td>
                </tr>
            `;

            updatePendingSummary([], currencySymbol);
            return;
        }

        // Ordenar por fecha de pago (más próximas primero)
        pendingSales.sort((a, b) => {
            if (!a.creditDueDate) return 1;
            if (!b.creditDueDate) return -1;
            return new Date(a.creditDueDate) - new Date(b.creditDueDate);
        });

        pendingReportBody.innerHTML = '';

        pendingSales.forEach(sale => {
            const saleDate = new Date(sale.date);
            const formattedSaleDate = saleDate.toLocaleDateString('es-MX');

            // Fecha de pago
            let dueDateHTML = 'No especificada';
            let isOverdue = false;
            if (sale.creditDueDate) {
                const dueDate = new Date(sale.creditDueDate + 'T00:00:00');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                isOverdue = dueDate < today;
                dueDateHTML = dueDate.toLocaleDateString('es-MX');
            }

            // Productos
            const productsText = sale.details.map(d => `${d.quantity}x ${d.name}`).join(', ');

            const row = document.createElement('tr');
            row.style.backgroundColor = isOverdue ? '#fff5f5' : '';
            row.innerHTML = `
                <td>${formattedSaleDate}</td>
                <td>#${sale.id}</td>
                <td><strong>${sale.customerName || 'Sin nombre'}</strong></td>
                <td style="max-width: 200px; font-size: 0.85rem;">${productsText}</td>
                <td><strong style="color: var(--primary-color);">${currencySymbol}${sale.total.toFixed(2)}</strong></td>
                <td>
                    <span style="color: ${isOverdue ? '#dc3545' : '#856404'}; font-weight: ${isOverdue ? 'bold' : 'normal'};">
                        ${isOverdue ? '⚠️ ' : ''}${dueDateHTML}
                    </span>
                </td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="markAsPaid('${sale.docId}')" style="padding: 6px 12px;">
                        <i class="fas fa-check"></i> Pagado
                    </button>
                </td>
            `;

            pendingReportBody.appendChild(row);
        });

        updatePendingSummary(pendingSales, currencySymbol);

    } catch (error) {
        console.error('Error cargando ventas pendientes:', error);
        pendingReportBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i> Error al cargar ventas pendientes
                </td>
            </tr>
        `;
    }
}

/**
 * Actualiza el resumen de ventas pendientes
 */
function updatePendingSummary(pendingSales, currencySymbol) {
    const summaryDiv = document.getElementById('pendingSummaryDetails');
    if (!summaryDiv) return;

    const totalPending = pendingSales.reduce((sum, s) => sum + s.total, 0);
    const overdueCount = pendingSales.filter(s => {
        if (!s.creditDueDate) return false;
        const dueDate = new Date(s.creditDueDate + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate < today;
    }).length;

    summaryDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 10px;">
            <div><strong>Ventas Pendientes:</strong> ${pendingSales.length}</div>
            <div><strong style="color: #dc3545;">Vencidas:</strong> ${overdueCount}</div>
            <div><strong>Total por Cobrar:</strong> <span style="color: var(--primary-color); font-size: 1.2rem;">${currencySymbol}${totalPending.toFixed(2)}</span></div>
        </div>
    `;
}

/**
 * Marca una venta como pagada
 */
async function markAsPaid(docId) {
    if (!confirm('¿Confirmas que esta venta ya fue pagada?')) return;

    UI.showLoading('Actualizando venta...');

    try {
        const db = firebase.firestore();
        await db.collection('sales').doc(docId).update({
            status: 'completed',
            paidAt: new Date().toISOString(),
            paymentLabel: 'A Crédito (Pagado)'
        });

        UI.hideLoading();
        UI.showNotification('✅ Venta marcada como pagada', 'success');

        // Recargar la tabla de ventas pendientes
        const settings = window.getSettings ? window.getSettings() : {};
        loadPendingReport(settings);

    } catch (error) {
        console.error('Error actualizando venta:', error);
        UI.hideLoading();
        alert('Error al actualizar la venta. Intenta de nuevo.');
    }
}

// Hacer funciones disponibles globalmente
window.loadInventoryReport = loadInventoryReport;
window.loadProductsReport = loadProductsReport;
window.viewSaleDetail = viewSaleDetail;
window.exportReportToExcel = exportReportToExcel;
window.loadMoreSales = loadMoreSales;
window.loadPendingReport = loadPendingReport;
window.markAsPaid = markAsPaid;
