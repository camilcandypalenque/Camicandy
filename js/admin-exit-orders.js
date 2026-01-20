/**
 * Módulo de Órdenes de Salida para Admin - Camil Candy POS
 * UI para gestionar la asignación de inventario a vendedores/rutas
 */

// Variables del módulo
let currentExitOrders = [];
let selectedOrderItems = [];
let availableProducts = [];

/**
 * Inicializa el módulo de órdenes de salida
 */
async function initializeExitOrders() {
    console.log('📦 Inicializando módulo de Órdenes de Salida...');
    await loadExitOrders();
    setupExitOrderEventListeners();
}

/**
 * Carga las órdenes de salida desde Firebase
 */
async function loadExitOrders() {
    try {
        currentExitOrders = await ExitOrdersService.getAll();
        renderExitOrdersTable();
        updateExitOrdersStats();
    } catch (error) {
        console.error('❌ Error cargando órdenes:', error);
    }
}

/**
 * Renderiza la tabla de órdenes de salida
 */
function renderExitOrdersTable() {
    const tbody = document.getElementById('exit-orders-tbody');
    if (!tbody) return;

    if (currentExitOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">
                    <i class="fas fa-box-open"></i>
                    <p>No hay órdenes de salida registradas</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = currentExitOrders.map(order => {
        const statusClass = getStatusClass(order.status);
        const statusLabel = getStatusLabel(order.status);
        const progress = order.totalItems > 0
            ? Math.round((order.soldItems / order.totalItems) * 100)
            : 0;

        return `
            <tr data-order-id="${order.id}">
                <td><strong>${order.id}</strong></td>
                <td>
                    <i class="fas fa-route"></i> ${order.routeName || order.routeId}
                    ${order.vendorName ? `<br><small class="text-muted">${order.vendorName}</small>` : ''}
                </td>
                <td>${formatDate(order.date)}</td>
                <td>
                    <span class="badge ${statusClass}">${statusLabel}</span>
                </td>
                <td>
                    <div class="progress-info">
                        <span>${order.soldItems || 0} / ${order.totalItems}</span>
                        <div class="progress-bar-mini">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <strong>$${(order.soldValue || 0).toFixed(2)}</strong>
                    <small class="text-muted">/ $${order.totalValue.toFixed(2)}</small>
                </td>
                <td class="actions-cell">
                    <button onclick="viewExitOrderDetail('${order.id}')" class="btn-icon" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.status === 'active' ? `
                        <button onclick="completeExitOrderAction('${order.id}')" class="btn-icon btn-success" title="Completar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="cancelExitOrderAction('${order.id}')" class="btn-icon btn-danger" title="Cancelar">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Actualiza las estadísticas de órdenes
 */
function updateExitOrdersStats() {
    const activeOrders = currentExitOrders.filter(o => o.status === 'active');
    const todayOrders = currentExitOrders.filter(o => o.date === new Date().toISOString().slice(0, 10));

    const totalSold = currentExitOrders.reduce((sum, o) => sum + (o.soldValue || 0), 0);
    const totalAssigned = currentExitOrders.reduce((sum, o) => sum + o.totalValue, 0);

    // Actualizar contadores en dashboard si existen
    const activeCountEl = document.getElementById('exit-orders-active-count');
    const todayCountEl = document.getElementById('exit-orders-today-count');
    const soldValueEl = document.getElementById('exit-orders-sold-value');

    if (activeCountEl) activeCountEl.textContent = activeOrders.length;
    if (todayCountEl) todayCountEl.textContent = todayOrders.length;
    if (soldValueEl) soldValueEl.textContent = `$${totalSold.toFixed(2)}`;
}

/**
 * Abre el modal para crear nueva orden de salida
 */
async function openNewExitOrderModal() {
    selectedOrderItems = [];

    // Cargar productos disponibles
    availableProducts = await FirebaseService.getProducts();

    // Cargar rutas
    const routes = await RoutesService.getAll();

    // Renderizar select de rutas
    const routeSelect = document.getElementById('exit-order-route');
    if (routeSelect) {
        routeSelect.innerHTML = `
            <option value="">-- Seleccionar Ruta --</option>
            ${routes.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
        `;
    }

    // Limpiar formulario
    document.getElementById('exit-order-vendor').value = '';
    document.getElementById('exit-order-route').value = '';

    // Renderizar productos disponibles
    renderAvailableProducts();
    updateSelectedItemsSummary();

    // Mostrar modal
    const modal = document.getElementById('new-exit-order-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Cierra el modal de nueva orden
 */
function closeNewExitOrderModal() {
    const modal = document.getElementById('new-exit-order-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Renderiza los productos disponibles para agregar a la orden
 */
function renderAvailableProducts() {
    const container = document.getElementById('available-products-list');
    if (!container) return;

    const productsWithStock = availableProducts.filter(p => p.stock > 0);

    if (productsWithStock.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-box-open"></i>
                <p>No hay productos con stock disponible</p>
            </div>
        `;
        return;
    }

    container.innerHTML = productsWithStock.map(product => {
        const isSelected = selectedOrderItems.some(i => i.productId === product.id);
        const selectedItem = selectedOrderItems.find(i => i.productId === product.id);
        const qty = selectedItem ? selectedItem.quantity : 0;

        return `
            <div class="product-item ${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
                <div class="product-info">
                    <strong>${product.name}</strong>
                    <div class="product-meta">
                        <span class="stock-badge">Stock: ${product.stock}</span>
                        <span class="price-badge">$${product.price.toFixed(2)}</span>
                    </div>
                </div>
                <div class="product-quantity-controls">
                    <button class="btn-qty" onclick="decreaseItemQty(${product.id})" ${qty === 0 ? 'disabled' : ''}>
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" 
                           class="qty-input" 
                           value="${qty}" 
                           min="0" 
                           max="${product.stock}"
                           onchange="setItemQty(${product.id}, this.value, ${product.stock})"
                           data-product-id="${product.id}">
                    <button class="btn-qty" onclick="increaseItemQty(${product.id}, ${product.stock})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Aumenta la cantidad de un producto en la orden
 */
function increaseItemQty(productId, maxStock) {
    const existing = selectedOrderItems.find(i => i.productId === productId);
    const product = availableProducts.find(p => p.id === productId);

    if (!product) return;

    if (existing) {
        if (existing.quantity < maxStock) {
            existing.quantity++;
        }
    } else {
        selectedOrderItems.push({
            productId: product.id,
            productName: product.name,
            quantity: 1,
            price: product.price,
            cost: product.cost || 0
        });
    }

    renderAvailableProducts();
    updateSelectedItemsSummary();
}

/**
 * Disminuye la cantidad de un producto en la orden
 */
function decreaseItemQty(productId) {
    const existing = selectedOrderItems.find(i => i.productId === productId);

    if (existing) {
        existing.quantity--;
        if (existing.quantity <= 0) {
            selectedOrderItems = selectedOrderItems.filter(i => i.productId !== productId);
        }
    }

    renderAvailableProducts();
    updateSelectedItemsSummary();
}

/**
 * Establece la cantidad de un producto directamente
 */
function setItemQty(productId, value, maxStock) {
    const qty = Math.min(Math.max(0, parseInt(value) || 0), maxStock);
    const product = availableProducts.find(p => p.id === productId);

    if (!product) return;

    if (qty === 0) {
        selectedOrderItems = selectedOrderItems.filter(i => i.productId !== productId);
    } else {
        const existing = selectedOrderItems.find(i => i.productId === productId);
        if (existing) {
            existing.quantity = qty;
        } else {
            selectedOrderItems.push({
                productId: product.id,
                productName: product.name,
                quantity: qty,
                price: product.price,
                cost: product.cost || 0
            });
        }
    }

    renderAvailableProducts();
    updateSelectedItemsSummary();
}

/**
 * Actualiza el resumen de items seleccionados
 */
function updateSelectedItemsSummary() {
    const summaryContainer = document.getElementById('selected-items-summary');
    if (!summaryContainer) return;

    if (selectedOrderItems.length === 0) {
        summaryContainer.innerHTML = `
            <div class="empty-summary">
                <i class="fas fa-shopping-cart"></i>
                <p>Selecciona productos para agregar a la orden</p>
            </div>
        `;
        return;
    }

    const totalItems = selectedOrderItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = selectedOrderItems.reduce((sum, i) => sum + (i.quantity * i.price), 0);

    summaryContainer.innerHTML = `
        <div class="summary-header">
            <h4><i class="fas fa-clipboard-list"></i> Resumen de la Orden</h4>
        </div>
        <div class="summary-items">
            ${selectedOrderItems.map(item => `
                <div class="summary-item">
                    <span class="item-name">${item.productName}</span>
                    <span class="item-qty">x${item.quantity}</span>
                    <span class="item-subtotal">$${(item.quantity * item.price).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="summary-totals">
            <div class="total-row">
                <span>Total Productos:</span>
                <strong>${totalItems}</strong>
            </div>
            <div class="total-row total-value">
                <span>Valor Total:</span>
                <strong>$${totalValue.toFixed(2)}</strong>
            </div>
        </div>
    `;
}

/**
 * Guarda la nueva orden de salida
 */
async function saveExitOrder() {
    const routeId = document.getElementById('exit-order-route').value;
    const vendorName = document.getElementById('exit-order-vendor').value.trim();

    if (!routeId) {
        alert('Por favor selecciona una ruta');
        return;
    }

    if (selectedOrderItems.length === 0) {
        alert('No has seleccionado ningún producto');
        return;
    }

    // Obtener nombre de ruta
    const route = await RoutesService.getById(routeId);

    const orderData = {
        routeId: routeId,
        routeName: route ? route.name : routeId,
        vendorName: vendorName,
        items: selectedOrderItems
    };

    // Confirmar
    const totalItems = selectedOrderItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = selectedOrderItems.reduce((sum, i) => sum + (i.quantity * i.price), 0);

    const confirm = window.confirm(
        `¿Crear orden de salida?\n\n` +
        `Ruta: ${orderData.routeName}\n` +
        `Vendedor: ${vendorName || 'No especificado'}\n` +
        `Productos: ${totalItems}\n` +
        `Valor: $${totalValue.toFixed(2)}\n\n` +
        `Esto descontará los productos del inventario de bodega.`
    );

    if (!confirm) return;

    // Crear orden
    const result = await ExitOrdersService.create(orderData);

    if (result.success) {
        alert(`✅ Orden creada exitosamente: ${result.orderId}`);
        closeNewExitOrderModal();
        await loadExitOrders();
        // Recargar inventario si está visible
        if (typeof loadProductsTable === 'function') {
            loadProductsTable();
        }
    } else {
        alert(`❌ Error: ${result.error}`);
    }
}

/**
 * Ver detalle de una orden
 */
async function viewExitOrderDetail(orderId) {
    const order = await ExitOrdersService.getById(orderId);

    if (!order) {
        alert('Orden no encontrada');
        return;
    }

    const statusLabel = getStatusLabel(order.status);
    const progress = order.totalItems > 0
        ? Math.round((order.soldItems / order.totalItems) * 100)
        : 0;

    // Construir HTML del detalle
    const detailHTML = `
        <div class="order-detail-header">
            <h3><i class="fas fa-file-invoice"></i> Orden ${order.id}</h3>
            <span class="badge ${getStatusClass(order.status)}">${statusLabel}</span>
        </div>
        
        <div class="order-detail-info">
            <div class="info-row">
                <span class="label"><i class="fas fa-route"></i> Ruta:</span>
                <span class="value">${order.routeName || order.routeId}</span>
            </div>
            <div class="info-row">
                <span class="label"><i class="fas fa-user"></i> Vendedor:</span>
                <span class="value">${order.vendorName || 'No especificado'}</span>
            </div>
            <div class="info-row">
                <span class="label"><i class="fas fa-calendar"></i> Fecha:</span>
                <span class="value">${formatDate(order.date)}</span>
            </div>
        </div>
        
        <div class="order-progress-section">
            <h4>Progreso de Ventas</h4>
            <div class="progress-bar-large">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-stats">
                <span>Vendidos: ${order.soldItems || 0} de ${order.totalItems}</span>
                <span>Valor: $${(order.soldValue || 0).toFixed(2)} de $${order.totalValue.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="order-items-section">
            <h4>Productos</h4>
            <table class="mini-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Asignados</th>
                        <th>Vendidos</th>
                        <th>Restantes</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td>${item.productName}</td>
                            <td>${item.quantity}</td>
                            <td>${item.sold || 0}</td>
                            <td><strong>${item.remaining || (item.quantity - (item.sold || 0))}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Mostrar en modal de detalle
    const detailContainer = document.getElementById('exit-order-detail-content');
    if (detailContainer) {
        detailContainer.innerHTML = detailHTML;
    }

    const modal = document.getElementById('exit-order-detail-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Cierra el modal de detalle
 */
function closeExitOrderDetailModal() {
    const modal = document.getElementById('exit-order-detail-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Completar una orden de salida
 */
async function completeExitOrderAction(orderId) {
    const confirm = window.confirm(
        '¿Completar esta orden?\n\n' +
        'Los productos no vendidos serán devueltos al inventario de bodega.'
    );

    if (!confirm) return;

    const result = await ExitOrdersService.complete(orderId);

    if (result.success) {
        alert('✅ Orden completada exitosamente');
        await loadExitOrders();
        if (typeof loadProductsTable === 'function') {
            loadProductsTable();
        }
    } else {
        alert(`❌ Error: ${result.error}`);
    }
}

/**
 * Cancelar una orden de salida
 */
async function cancelExitOrderAction(orderId) {
    const confirm = window.confirm(
        '¿Cancelar esta orden?\n\n' +
        'Todos los productos serán devueltos al inventario de bodega.\n' +
        'Esta acción no se puede deshacer.'
    );

    if (!confirm) return;

    const result = await ExitOrdersService.cancel(orderId);

    if (result.success) {
        alert('✅ Orden cancelada');
        await loadExitOrders();
        if (typeof loadProductsTable === 'function') {
            loadProductsTable();
        }
    } else {
        alert(`❌ Error: ${result.error}`);
    }
}

/**
 * Configura los event listeners
 */
function setupExitOrderEventListeners() {
    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                e.target.classList.remove('active');
            }
        });
    });
}

// Funciones auxiliares
function getStatusClass(status) {
    switch (status) {
        case 'active': return 'badge-primary';
        case 'completed': return 'badge-success';
        case 'cancelled': return 'badge-danger';
        default: return 'badge-secondary';
    }
}

function getStatusLabel(status) {
    switch (status) {
        case 'active': return 'Activa';
        case 'completed': return 'Completada';
        case 'cancelled': return 'Cancelada';
        default: return status;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Exportar funciones globalmente
window.initializeExitOrders = initializeExitOrders;
window.loadExitOrders = loadExitOrders;
window.openNewExitOrderModal = openNewExitOrderModal;
window.closeNewExitOrderModal = closeNewExitOrderModal;
window.saveExitOrder = saveExitOrder;
window.viewExitOrderDetail = viewExitOrderDetail;
window.closeExitOrderDetailModal = closeExitOrderDetailModal;
window.completeExitOrderAction = completeExitOrderAction;
window.cancelExitOrderAction = cancelExitOrderAction;
window.increaseItemQty = increaseItemQty;
window.decreaseItemQty = decreaseItemQty;
window.setItemQty = setItemQty;
