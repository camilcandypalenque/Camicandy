/**
 * Módulo de Punto de Venta (POS) para Camil Candy POS
 * Maneja el carrito de compras y procesamiento de ventas
 */

// Variables del módulo
let cart = [];

/**
 * Inicializa el módulo de POS
 */
async function initializePOS() {
    setupPOSEventListeners();
    await loadProductsForSale();
    updateCartDisplay();
    console.log('✅ Módulo de POS inicializado');
}

/**
 * Configura los event listeners del POS
 */
function setupPOSEventListeners() {
    const completeSaleBtn = document.getElementById('completeSaleBtn');
    const cancelSaleBtn = document.getElementById('cancelSaleBtn');

    if (completeSaleBtn) {
        completeSaleBtn.addEventListener('click', completeSale);
    }

    if (cancelSaleBtn) {
        cancelSaleBtn.addEventListener('click', cancelSale);
    }
}

/**
 * Carga los productos disponibles para venta
 */
async function loadProductsForSale() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    const products = window.getProducts ? window.getProducts() : [];
    const settings = window.getSettings ? window.getSettings() : {};

    productsGrid.innerHTML = '';

    if (!products.length) {
        productsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                <p>No hay productos disponibles para la venta.</p>
            </div>
        `;
        return;
    }

    products.forEach(product => {
        if (product.stock > 0) {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.id = product.id;

            const statusClass = product.stock <= product.minStock ? 'inventory-low' : 'inventory-ok';
            const badgeClass = product.type === 'concentrado' ? 'badge-concentrado' : 'badge-embolsado';
            const badgeText = product.type === 'concentrado' ? 'Concentrado' : 'Embolsado';

            card.innerHTML = `
                <h4>${product.name}</h4>
                <div class="price">${settings.currencySymbol || '$'}${parseFloat(product.price).toFixed(2)}</div>
                <div class="inventory ${statusClass}">Disponible: ${product.stock}</div>
                <div style="margin-top: 10px;">
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
            `;

            card.addEventListener('click', () => addToCart(product.id));
            productsGrid.appendChild(card);
        }
    });
}

/**
 * Agrega un producto al carrito
 */
function addToCart(productId) {
    const products = window.getProducts ? window.getProducts() : [];
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert(`No hay suficiente inventario de ${product.name}. Solo quedan ${product.stock} unidades.`);
            return;
        }
    } else {
        if (product.stock > 0) {
            cart.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1
            });
        } else {
            alert(`No hay inventario disponible de ${product.name}.`);
            return;
        }
    }

    updateCartDisplay();
}

/**
 * Actualiza la visualización del carrito
 */
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const settings = window.getSettings ? window.getSettings() : {};

    if (!cartItems || !cartTotal) return;

    cartItems.innerHTML = '';

    if (cart.length === 0) {
        cartItems.innerHTML = '<p id="emptyCartMessage">El carrito está vacío. Selecciona productos para comenzar.</p>';
        cartTotal.textContent = '0.00';
        return;
    }

    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <div><strong>${item.name}</strong></div>
                <div>${settings.currencySymbol || '$'}${parseFloat(item.price).toFixed(2)} c/u</div>
            </div>
            <div class="cart-item-quantity">
                <button onclick="decreaseQuantity(${item.productId})">-</button>
                <span>${item.quantity}</span>
                <button onclick="increaseQuantity(${item.productId})">+</button>
            </div>
            <div style="font-weight: bold; min-width: 80px; text-align: right;">
                ${settings.currencySymbol || '$'}${itemTotal.toFixed(2)}
            </div>
        `;

        cartItems.appendChild(cartItem);
    });

    // Calcular impuestos si están configurados
    let finalTotal = total;
    const taxRate = settings.taxRate || 0;

    if (taxRate > 0) {
        const taxAmount = total * (taxRate / 100);
        finalTotal = total + taxAmount;

        const taxRow = document.createElement('div');
        taxRow.className = 'cart-item';
        taxRow.innerHTML = `
            <div class="cart-item-info">
                <div><strong>Impuesto (${taxRate}%)</strong></div>
            </div>
            <div style="font-weight: bold; min-width: 80px; text-align: right;">
                ${settings.currencySymbol || '$'}${taxAmount.toFixed(2)}
            </div>
        `;
        cartItems.appendChild(taxRow);
    }

    cartTotal.textContent = finalTotal.toFixed(2);
}

/**
 * Aumenta la cantidad de un producto en el carrito
 */
function increaseQuantity(productId) {
    const products = window.getProducts ? window.getProducts() : [];
    const item = cart.find(item => item.productId === productId);
    const product = products.find(p => p.id === productId);

    if (item && product) {
        if (item.quantity < product.stock) {
            item.quantity++;
            updateCartDisplay();
        } else {
            alert(`No hay suficiente inventario de ${product.name}. Solo quedan ${product.stock} unidades.`);
        }
    }
}

/**
 * Disminuye la cantidad de un producto en el carrito
 */
function decreaseQuantity(productId) {
    const itemIndex = cart.findIndex(item => item.productId === productId);

    if (itemIndex !== -1) {
        if (cart[itemIndex].quantity > 1) {
            cart[itemIndex].quantity--;
        } else {
            cart.splice(itemIndex, 1);
        }

        updateCartDisplay();
    }
}

/**
 * Completa la venta actual
 */
async function completeSale() {
    if (cart.length === 0) {
        alert('El carrito está vacío. Agrega productos para completar la venta.');
        return;
    }

    const products = window.getProducts ? window.getProducts() : [];
    const settings = window.getSettings ? window.getSettings() : {};

    // Verificar inventario suficiente
    for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (product.stock < item.quantity) {
            alert(`No hay suficiente inventario de ${product.name}. Solo quedan ${product.stock} unidades.`);
            return;
        }
    }

    UI.showLoading('Procesando venta...');

    try {
        // Preparar datos de la venta
        let saleTotal = 0;
        const saleDetails = [];
        const stockUpdates = [];
        const movements = [];

        for (const item of cart) {
            const product = products.find(p => p.id === item.productId);
            const subtotal = item.price * item.quantity;
            saleTotal += subtotal;

            saleDetails.push({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                subtotal: subtotal
            });

            stockUpdates.push({
                productId: item.productId,
                newStock: product.stock - item.quantity
            });

            movements.push({
                productId: item.productId,
                productName: item.name,
                type: 'venta',
                quantity: item.quantity,
                previousStock: product.stock,
                newStock: product.stock - item.quantity
            });
        }

        // Calcular impuestos
        const taxRate = settings.taxRate || 0;
        const taxAmount = taxRate > 0 ? saleTotal * (taxRate / 100) : 0;
        const finalTotal = saleTotal + taxAmount;

        const saleData = {
            total: finalTotal,
            subtotal: saleTotal,
            taxAmount: taxAmount,
            taxRate: taxRate,
            details: saleDetails
        };

        const result = await FirebaseService.addSale(saleData, stockUpdates, movements);

        if (result.success) {
            UI.showNotification(`Venta #${result.saleId} completada. Total: ${settings.currencySymbol || '$'}${finalTotal.toFixed(2)}`, 'success');

            // Limpiar carrito y actualizar vistas
            cart = [];
            updateCartDisplay();

            // Recargar datos de productos
            if (typeof loadProductsData === 'function') {
                await loadProductsData();
            }
            await loadProductsForSale();
            if (typeof loadProductsTable === 'function') {
                await loadProductsTable();
            }
        } else {
            alert('Error al procesar la venta.');
        }
    } catch (error) {
        console.error('Error completando venta:', error);
        alert('Error al procesar la venta.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Cancela la venta actual
 */
function cancelSale() {
    if (cart.length === 0) {
        alert('El carrito ya está vacío.');
        return;
    }

    if (confirm('¿Estás seguro de que deseas cancelar esta venta? Se eliminarán todos los productos del carrito.')) {
        cart = [];
        updateCartDisplay();
        UI.showNotification('Venta cancelada.', 'warning');
    }
}

// Hacer funciones disponibles globalmente
window.initializePOS = initializePOS;
window.loadProductsForSale = loadProductsForSale;
window.addToCart = addToCart;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.completeSale = completeSale;
window.cancelSale = cancelSale;
window.getCart = () => cart;
