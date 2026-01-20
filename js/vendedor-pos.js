/**
 * Módulo POS para Vendedor - Camil Candy
 * Vista simplificada para dispositivos móviles
 * Incluye: carrito, tipos de pago, generación de recibo y WhatsApp
 */

// Variables del módulo
let products = [];
let cart = [];
let settings = {};
let currentSale = null;
let selectedRouteId = null;
let selectedClientId = null;
let vendorClients = [];
let vendorRoutes = [];
let productCategories = [];
let selectedCategory = 'all'; // Filtro de categoría activo
let currentExitOrder = null; // Orden de salida activa para la ruta seleccionada

/**
 * Inicializa la aplicación del vendedor
 */
async function initializeVendorPOS() {
    console.log('🍬 Iniciando Cami Candy POS - Modo Vendedor...');
    showLoading('Conectando...');

    try {
        // Inicializar Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(window.FIREBASE_CONFIG);
        }

        const db = firebase.firestore();

        // Habilitar persistencia offline
        try {
            await db.enablePersistence();
        } catch (err) {
            console.warn('Persistencia offline no disponible');
        }

        // Cargar datos
        await loadProducts();
        await loadSettings();
        await loadVendorCategories();

        // Renderizar pestañas de categorías y productos
        renderCategoryTabs();
        renderProducts();
        updateCartDisplay();

        // Configurar eventos
        setupEventListeners();
        setupVendorTabs();
        setupClientListeners();

        // Cargar datos de rutas y clientes
        await initializeRoutesAndClients();

        // Cargar conteo de pagos pendientes
        loadVendorPendingCount();

        hideLoading();
        console.log('✅ POS Vendedor listo');

    } catch (error) {
        console.error('Error inicializando:', error);
        hideLoading();
        alert('Error al conectar. Verifica tu conexión a internet.');
    }
}

/**
 * Carga los productos desde Firebase o desde la orden de salida asignada
 */
async function loadProducts() {
    const db = firebase.firestore();

    // Si hay una ruta seleccionada, intentar cargar desde orden de salida
    if (selectedRouteId) {
        try {
            // Buscar orden de salida activa para esta ruta
            const exitOrdersSnapshot = await db.collection('exit_orders')
                .where('routeId', '==', selectedRouteId)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (!exitOrdersSnapshot.empty) {
                const orderDoc = exitOrdersSnapshot.docs[0];
                currentExitOrder = {
                    ...orderDoc.data(),
                    docId: orderDoc.id
                };

                console.log(`📦 Orden de salida encontrada: ${currentExitOrder.id}`);

                // Convertir items de la orden a formato de productos
                products = currentExitOrder.items
                    .filter(item => item.remaining > 0 || (item.quantity - (item.sold || 0)) > 0)
                    .map(item => ({
                        id: item.productId,
                        name: item.productName,
                        price: item.price,
                        cost: item.cost || 0,
                        stock: item.remaining || (item.quantity - (item.sold || 0)),
                        type: item.type || 'general',
                        fromExitOrder: true,
                        exitOrderId: currentExitOrder.id
                    }));

                console.log(`✅ ${products.length} productos cargados desde orden de salida`);
                return;
            } else {
                currentExitOrder = null;
                console.log('⚠️ No hay orden de salida activa para esta ruta');
            }
        } catch (error) {
            console.error('Error buscando orden de salida:', error);
            currentExitOrder = null;
        }
    } else {
        currentExitOrder = null;
    }

    // Fallback: cargar todos los productos del inventario
    const snapshot = await db.collection('products').orderBy('name').get();
    products = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
}

/**
 * Carga la configuración desde Firebase
 */
async function loadSettings() {
    const db = firebase.firestore();
    const doc = await db.collection('settings').doc('main').get();
    settings = doc.exists ? doc.data() : {
        businessName: 'Cami Candy',
        currencySymbol: '$',
        taxRate: 16,
        receiptFooter: '¡Gracias por su compra!'
    };
}

/**
 * Carga las categorías desde Firebase
 */
async function loadVendorCategories() {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('settings').doc('categories').get();

        if (doc.exists && doc.data().list) {
            productCategories = doc.data().list;
        } else {
            // Categorías por defecto
            productCategories = [
                { id: 'concentrado', name: 'Concentrado' },
                { id: 'embolsado', name: 'Embolsado' }
            ];
        }
        console.log(`📂 ${productCategories.length} categorías cargadas`);
    } catch (error) {
        console.error('Error cargando categorías:', error);
        productCategories = [
            { id: 'concentrado', name: 'Concentrado' },
            { id: 'embolsado', name: 'Embolsado' }
        ];
    }
}

/**
 * Renderiza las pestañas de categorías con contadores
 */
function renderCategoryTabs() {
    const container = document.getElementById('categoryTabsContainer');
    if (!container) return;

    // Contar productos disponibles (stock > 0) por categoría
    const availableProducts = products.filter(p => p.stock > 0);
    const allCount = availableProducts.length;

    let tabsHTML = `
        <button class="category-tab ${selectedCategory === 'all' ? 'active' : ''}" 
                onclick="filterByCategory('all')">
            <i class="fas fa-th"></i>
            <span>Todos</span>
            <span class="category-count">${allCount}</span>
        </button>
    `;

    productCategories.forEach(cat => {
        const count = availableProducts.filter(p => p.type === cat.id).length;
        const isActive = selectedCategory === cat.id;

        // Determinar icono según el tipo
        let icon = 'fa-box';
        if (cat.id === 'concentrado') icon = 'fa-wine-bottle';
        else if (cat.id === 'embolsado') icon = 'fa-shopping-bag';

        tabsHTML += `
            <button class="category-tab ${isActive ? 'active' : ''}" 
                    onclick="filterByCategory('${cat.id}')">
                <i class="fas ${icon}"></i>
                <span>${cat.name}</span>
                <span class="category-count">${count}</span>
            </button>
        `;
    });

    container.innerHTML = tabsHTML;
}

/**
 * Filtra los productos por categoría
 */
function filterByCategory(categoryId) {
    selectedCategory = categoryId;
    renderCategoryTabs();
    renderProducts();
}

/**
 * Renderiza los productos en el grid (con soporte para filtro de categoría)
 */
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const countBadge = document.getElementById('productCount');

    // Filtrar por categoría seleccionada
    let filteredProducts = products;
    if (selectedCategory !== 'all') {
        filteredProducts = products.filter(p => p.type === selectedCategory);
    }

    const availableFiltered = filteredProducts.filter(p => p.stock > 0);
    countBadge.textContent = `${availableFiltered.length} disponibles`;

    grid.innerHTML = '';

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = `product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`;

        // Buscar la categoría del producto para mostrar nombre correcto
        const category = productCategories.find(c => c.id === product.type);
        let categoryName;
        if (category && category.name) {
            categoryName = category.name;
        } else {
            // Convertir ID técnico a nombre legible (ej: "escarchado_para_micheladas" -> "Escarchado Para Micheladas")
            categoryName = (product.type || 'General')
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        // Iconos y colores según el tipo de producto
        const isConcentrado = product.type === 'concentrado' || (product.type && product.type.includes('concentrado'));
        const productIcon = isConcentrado ? 'fa-wine-bottle' : 'fa-shopping-bag';
        const iconColor = isConcentrado ? '#17a2b8' : '#28a745';
        const badgeClass = isConcentrado ? 'badge-concentrado' : 'badge-embolsado';

        card.innerHTML = `
            <div class="product-icon" style="text-align: center; margin-bottom: 8px;">
                <i class="fas ${productIcon}" style="font-size: 2rem; color: ${iconColor};"></i>
            </div>
            <span class="product-badge ${badgeClass}">${categoryName.toUpperCase()}</span>
            <div class="product-name">${product.name}</div>
            <div class="product-price">${settings.currencySymbol}${parseFloat(product.price).toFixed(2)}</div>
            <div class="product-stock">${product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}</div>
        `;

        if (product.stock > 0) {
            card.addEventListener('click', () => addToCart(product.id));
        }

        grid.appendChild(card);
    });
}

/**
 * Agrega un producto al carrito
 */
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
            vibrate();
        } else {
            showToast('No hay más stock disponible');
            return;
        }
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
        vibrate();
    }

    updateCartDisplay();
}

/**
 * Vibración táctil para feedback
 */
function vibrate() {
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

/**
 * Muestra un toast/notificación
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        z-index: 3000;
        font-size: 0.9rem;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2000);
}

/**
 * Actualiza la visualización del carrito
 */
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total');
    const completeSaleBtn = document.getElementById('completeSaleBtn');

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Carrito vacío</p>
                <p style="font-size: 0.85rem;">Toca un producto para agregar</p>
            </div>
        `;
        subtotalEl.textContent = `${settings.currencySymbol}0.00`;
        taxEl.textContent = `${settings.currencySymbol}0.00`;
        totalEl.textContent = `${settings.currencySymbol}0.00`;
        completeSaleBtn.disabled = true;
        return;
    }

    completeSaleBtn.disabled = false;
    cartItems.innerHTML = '';

    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price" onclick="editItemPrice(${item.productId})" style="cursor: pointer; color: var(--primary-color);">
                    ${settings.currencySymbol}${item.price.toFixed(2)} 
                    <i class="fas fa-pencil-alt" style="font-size: 0.8rem; margin-left: 4px;"></i>
                </div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn remove" onclick="decreaseQuantity(${item.productId})">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="cart-item-qty">${item.quantity}</span>
                <button class="qty-btn" onclick="increaseQuantity(${item.productId})">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="cart-item-subtotal">${settings.currencySymbol}${itemTotal.toFixed(2)}</div>
        `;

        cartItems.appendChild(itemEl);
    });

    const taxRate = settings.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    subtotalEl.textContent = `${settings.currencySymbol}${subtotal.toFixed(2)}`;
    taxEl.textContent = `${settings.currencySymbol}${taxAmount.toFixed(2)} (${taxRate}%)`;
    totalEl.textContent = `${settings.currencySymbol}${total.toFixed(2)}`;
}

/**
 * Aumenta cantidad de un producto
 */
function increaseQuantity(productId) {
    const product = products.find(p => p.id === productId);
    const item = cart.find(i => i.productId === productId);

    if (item && product && item.quantity < product.stock) {
        item.quantity++;
        vibrate();
        updateCartDisplay();
    } else {
        showToast('No hay más stock disponible');
    }
}

/**
 * Disminuye cantidad de un producto
 */
function decreaseQuantity(productId) {
    const itemIndex = cart.findIndex(i => i.productId === productId);

    if (itemIndex !== -1) {
        if (cart[itemIndex].quantity > 1) {
            cart[itemIndex].quantity--;
        } else {
            cart.splice(itemIndex, 1);
        }
        vibrate();
        updateCartDisplay();
    }
}

/**
 * Edita el precio de un producto en el carrito
 */
function editItemPrice(productId) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;

    // Usar prompt nativo por simplicidad y compatibilidad móvil
    // En un futuro se podría hacer un modal numérico más bonito
    const newPriceStr = prompt(`Editar precio de "${item.name}"\nPrecio actual: $${item.price.toFixed(2)}`, item.price);

    if (newPriceStr !== null) {
        const newPrice = parseFloat(newPriceStr);

        if (!isNaN(newPrice) && newPrice >= 0) {
            item.price = newPrice;
            updateCartDisplay();
            showToast('✅ Precio actualizado');
            vibrate();
        } else {
            showToast('❌ Precio inválido');
        }
    }
}

/**
 * Cancela la venta actual (limpia el carrito)
 */
function cancelSale() {
    if (cart.length === 0) {
        showToast('El carrito ya está vacío');
        return;
    }

    if (confirm('¿Limpiar el carrito? Se eliminarán todos los productos.')) {
        cart = [];
        updateCartDisplay();
        showToast('🗑️ Carrito limpiado');
    }
}

/**
 * Abre el modal de completar venta
 */
function openPaymentModal() {
    if (cart.length === 0) return;

    const modal = document.getElementById('paymentModal');
    const totalDisplay = document.getElementById('paymentTotal');

    // Calcular total
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = subtotal * ((settings.taxRate || 0) / 100);
    const total = subtotal + taxAmount;

    totalDisplay.textContent = `${settings.currencySymbol}${total.toFixed(2)}`;

    // Limpiar selección anterior
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
    document.getElementById('customerName').value = '';

    modal.classList.add('active');
}

/**
 * Cierra el modal de pago
 */
function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

/**
 * Selecciona un método de pago
 */
function selectPaymentMethod(method) {
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector(`[data-method="${method}"]`).classList.add('selected');

    // Mostrar/ocultar campo de fecha para crédito
    const creditDateGroup = document.getElementById('creditDateGroup');
    if (creditDateGroup) {
        if (method === 'credito') {
            creditDateGroup.style.display = 'block';
            // Establecer fecha mínima como mañana
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('creditDueDate').min = tomorrow.toISOString().split('T')[0];
            // Sugerir 1 semana después por defecto
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            document.getElementById('creditDueDate').value = nextWeek.toISOString().split('T')[0];
        } else {
            creditDateGroup.style.display = 'none';
        }
    }
}

/**
 * Procesa y completa la venta
 */
async function processSale() {
    const selectedPayment = document.querySelector('.payment-option.selected');
    const customerName = document.getElementById('customerName').value.trim();

    if (!selectedPayment) {
        showToast('Selecciona un método de pago');
        return;
    }

    if (!customerName) {
        showToast('Ingresa el nombre del cliente');
        return;
    }

    const paymentMethod = selectedPayment.dataset.method;

    // Validar fecha si es venta a crédito
    let creditDueDate = null;
    if (paymentMethod === 'credito') {
        const dueDateInput = document.getElementById('creditDueDate');
        if (!dueDateInput || !dueDateInput.value) {
            showToast('Selecciona la fecha de próximo pago');
            return;
        }
        creditDueDate = dueDateInput.value;
    }

    const paymentLabels = {
        'efectivo': 'Efectivo',
        'transferencia': 'Transferencia',
        'deposito': 'Depósito',
        'credito': 'A Crédito (Pendiente)'
    };

    showLoading('Procesando venta...');

    try {
        const db = firebase.firestore();

        // Calcular totales
        let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxAmount = subtotal * ((settings.taxRate || 0) / 100);
        const total = subtotal + taxAmount;

        // Obtener siguiente ID de venta
        const countersRef = db.collection('counters').doc('main');
        const countersDoc = await countersRef.get();
        const saleId = countersDoc.exists ? countersDoc.data().nextSaleId : 1;

        // Preparar datos de la venta
        const saleData = {
            id: saleId,
            date: new Date().toISOString(),
            customerName: customerName,
            paymentMethod: paymentMethod,
            paymentLabel: paymentLabels[paymentMethod],
            subtotal: subtotal,
            taxRate: settings.taxRate || 0,
            taxAmount: taxAmount,
            total: total,
            details: cart.map(item => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity
            })),
            // Campos para ventas a crédito
            status: paymentMethod === 'credito' ? 'pending' : 'completed',
            creditDueDate: creditDueDate,
            paidAt: paymentMethod === 'credito' ? null : new Date().toISOString(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Batch para venta + actualización de stock
        const batch = db.batch();

        // Guardar venta
        const saleRef = db.collection('sales').doc(saleId.toString());
        batch.set(saleRef, saleData);

        // Actualizar stock de productos
        for (const item of cart) {
            const productRef = db.collection('products').doc(item.productId.toString());
            const product = products.find(p => p.id === item.productId);
            if (product) {
                batch.update(productRef, {
                    stock: product.stock - item.quantity,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        // Actualizar contador
        batch.update(countersRef, {
            nextSaleId: saleId + 1
        });

        await batch.commit();

        // Guardar venta actual para recibo
        currentSale = {
            ...saleData,
            formattedDate: new Date().toLocaleString('es-MX')
        };

        // Actualizar productos locales
        cart.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                product.stock -= item.quantity;
            }
        });

        // Si la venta fue desde una orden de salida, actualizar la orden
        if (currentExitOrder) {
            try {
                const orderRef = db.collection('exit_orders').doc(currentExitOrder.id);
                const orderDoc = await orderRef.get();

                if (orderDoc.exists) {
                    const orderData = orderDoc.data();
                    let updatedItems = [...orderData.items];
                    let soldItemsCount = orderData.soldItems || 0;
                    let soldValue = orderData.soldValue || 0;

                    // Actualizar items vendidos
                    for (const cartItem of cart) {
                        const itemIndex = updatedItems.findIndex(i =>
                            i.productId.toString() === cartItem.productId.toString()
                        );

                        if (itemIndex !== -1) {
                            updatedItems[itemIndex].sold = (updatedItems[itemIndex].sold || 0) + cartItem.quantity;
                            updatedItems[itemIndex].remaining = updatedItems[itemIndex].quantity - updatedItems[itemIndex].sold;

                            soldItemsCount += cartItem.quantity;
                            soldValue += cartItem.quantity * cartItem.price;
                        }
                    }

                    await orderRef.update({
                        items: updatedItems,
                        soldItems: soldItemsCount,
                        soldValue: soldValue,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Actualizar orden local
                    currentExitOrder.items = updatedItems;
                    currentExitOrder.soldItems = soldItemsCount;
                    currentExitOrder.soldValue = soldValue;

                    console.log('✅ Orden de salida actualizada con ventas');
                }
            } catch (error) {
                console.error('Error actualizando orden de salida:', error);
                // No interrumpir la venta si falla la actualización de la orden
            }
        }

        // Limpiar carrito
        cart = [];

        hideLoading();
        closePaymentModal();

        // Mostrar recibo
        showReceipt();

        // Actualizar vista
        renderProducts();
        updateCartDisplay();

    } catch (error) {
        console.error('Error procesando venta:', error);
        hideLoading();
        alert('Error al procesar la venta. Intenta de nuevo.');
    }
}

/**
 * Muestra el recibo de la venta
 */
function showReceipt() {
    if (!currentSale) return;

    const modal = document.getElementById('receiptModal');
    const receiptContent = document.getElementById('receiptContent');

    let itemsHTML = currentSale.details.map(item => `
        <div class="receipt-item">
            <div style="flex: 1;">
                <span>${item.quantity}x ${item.name}</span>
                <div style="font-size: 0.8rem; color: #888;">@ ${settings.currencySymbol}${item.price.toFixed(2)} c/u</div>
            </div>
            <span style="font-weight: 600;">${settings.currencySymbol}${item.subtotal.toFixed(2)}</span>
        </div>
    `).join('');

    // Agregar información de crédito si aplica
    let creditInfoHTML = '';
    if (currentSale.status === 'pending' && currentSale.creditDueDate) {
        const dueDate = new Date(currentSale.creditDueDate + 'T00:00:00');
        const formattedDueDate = dueDate.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        creditInfoHTML = `
            <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 12px; margin: 15px 0; text-align: center;">
                <p style="margin: 0; color: #856404; font-weight: bold;">
                    <i class="fas fa-clock"></i> PAGO PENDIENTE
                </p>
                <p style="margin: 5px 0 0 0; color: #856404; font-size: 0.9rem;">
                    Fecha de pago: <strong>${formattedDueDate}</strong>
                </p>
            </div>
        `;
    }

    receiptContent.innerHTML = `
        <div class="receipt-header">
            <h2><i class="fas fa-candy-cane"></i> ${settings.businessName || 'Cami Candy'}</h2>
            <p>${settings.businessAddress || ''}</p>
            <p>${settings.businessPhone || ''}</p>
        </div>
        
        ${creditInfoHTML}
        
        <div class="receipt-info">
            <p><strong>Recibo #${currentSale.id}</strong></p>
            <p><strong>Fecha:</strong> ${currentSale.formattedDate}</p>
            <p><strong>Cliente:</strong> ${currentSale.customerName}</p>
            <p><strong>Pago:</strong> ${currentSale.paymentLabel}</p>
        </div>
        
        <div class="receipt-items">
            ${itemsHTML}
        </div>
        
        <div class="receipt-totals">
            <div class="receipt-total-row">
                <span>Subtotal:</span>
                <span>${settings.currencySymbol}${currentSale.subtotal.toFixed(2)}</span>
            </div>
            <div class="receipt-total-row">
                <span>Impuesto (${currentSale.taxRate}%):</span>
                <span>${settings.currencySymbol}${currentSale.taxAmount.toFixed(2)}</span>
            </div>
            <div class="receipt-total-row final">
                <span>TOTAL:</span>
                <span>${settings.currencySymbol}${currentSale.total.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="receipt-footer">
            <p>${settings.receiptFooter || '¡Gracias por su compra!'}</p>
            <p style="margin-top: 10px; font-size: 0.75rem;">Cami Candy - Venta #${currentSale.id}</p>
        </div>
    `;

    modal.classList.add('active');
}

/**
 * Cierra el modal de recibo
 */
function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('active');
    currentSale = null;
}

/**
 * Descarga el recibo como imagen PNG
 */
async function downloadReceipt() {
    if (!currentSale) return;

    showToast('Generando imagen...');

    const receiptEl = document.getElementById('receiptContent');

    try {
        // Usar html2canvas para crear imagen del recibo
        if (typeof html2canvas !== 'undefined') {
            const canvas = await html2canvas(receiptEl, {
                backgroundColor: '#ffffff',
                scale: 2, // Alta resolución
                useCORS: true,
                logging: false
            });

            // Convertir a imagen y descargar
            const link = document.createElement('a');
            link.download = `recibo_cami_candy_${currentSale.id}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            showToast('✅ Imagen descargada');
        } else {
            // Fallback: descargar como texto
            const receiptText = generateReceiptText();
            const blob = new Blob([receiptText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `recibo_${currentSale.id}.txt`;
            link.click();

            URL.revokeObjectURL(url);
            showToast('Recibo descargado');
        }
    } catch (error) {
        console.error('Error descargando recibo:', error);
        showToast('Error al descargar');
    }
}

/**
 * Imprime/Guarda el recibo como PDF
 */
function printReceipt() {
    if (!currentSale) return;

    // Crear una ventana nueva con el recibo para imprimir
    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recibo #${currentSale.id} - Cami Candy</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Courier New', monospace; 
                    font-size: 12px;
                    padding: 10px;
                    max-width: 280px;
                    margin: 0 auto;
                }
                .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                .receipt-header h2 { font-size: 18px; margin-bottom: 5px; }
                .receipt-info { margin-bottom: 10px; }
                .receipt-info p { margin: 3px 0; }
                .receipt-items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
                .receipt-item { display: flex; justify-content: space-between; margin: 5px 0; }
                .receipt-totals { margin: 10px 0; }
                .receipt-total-row { display: flex; justify-content: space-between; margin: 3px 0; }
                .receipt-total-row.final { font-weight: bold; font-size: 16px; border-top: 1px solid #000; padding-top: 5px; margin-top: 10px; }
                .receipt-footer { text-align: center; margin-top: 15px; font-size: 10px; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <h2>🍬 ${settings.businessName || 'Cami Candy'}</h2>
                <p>${settings.businessAddress || ''}</p>
                <p>${settings.businessPhone || ''}</p>
            </div>
            
            <div class="receipt-info">
                <p><strong>Recibo #${currentSale.id}</strong></p>
                <p>Fecha: ${currentSale.formattedDate}</p>
                <p>Cliente: ${currentSale.customerName}</p>
                <p>Pago: ${currentSale.paymentLabel}</p>
            </div>
            
            <div class="receipt-items">
                ${currentSale.details.map(item => `
                    <div class="receipt-item">
                        <div>
                            <span>${item.quantity}x ${item.name}</span>
                            <div style="font-size: 10px; color: #666;">@ ${settings.currencySymbol}${item.price.toFixed(2)} c/u</div>
                        </div>
                        <span>${settings.currencySymbol}${item.subtotal.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="receipt-totals">
                <div class="receipt-total-row">
                    <span>Subtotal:</span>
                    <span>${settings.currencySymbol}${currentSale.subtotal.toFixed(2)}</span>
                </div>
                <div class="receipt-total-row">
                    <span>Impuesto (${currentSale.taxRate}%):</span>
                    <span>${settings.currencySymbol}${currentSale.taxAmount.toFixed(2)}</span>
                </div>
                <div class="receipt-total-row final">
                    <span>TOTAL:</span>
                    <span>${settings.currencySymbol}${currentSale.total.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="receipt-footer">
                <p>${settings.receiptFooter || '¡Gracias por su compra!'}</p>
                <p style="margin-top: 10px;">Cami Candy - ${new Date().toLocaleDateString()}</p>
            </div>
        </body>
        </html>
    `;

    // Abrir ventana de impresión
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Esperar a que cargue y luego imprimir
    printWindow.onload = function () {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    showToast('📄 Ventana de impresión abierta');
}

/**
 * Genera el texto del recibo para compartir
 */
function generateReceiptText() {
    if (!currentSale) return '';

    let text = `🍬 *${settings.businessName || 'Cami Candy'}*\n`;
    text += `${'─'.repeat(28)}\n`;
    text += `📋 *Recibo #${currentSale.id}*\n`;
    text += `📅 ${currentSale.formattedDate}\n`;
    text += `👤 ${currentSale.customerName}\n`;
    text += `💳 ${currentSale.paymentLabel}\n`;
    text += `${'─'.repeat(28)}\n`;

    currentSale.details.forEach(item => {
        text += `• ${item.quantity}x ${item.name}\n`;
        text += `   @ ${settings.currencySymbol}${item.price.toFixed(2)} c/u = ${settings.currencySymbol}${item.subtotal.toFixed(2)}\n`;
    });

    text += `${'─'.repeat(28)}\n`;
    text += `Subtotal: ${settings.currencySymbol}${currentSale.subtotal.toFixed(2)}\n`;
    text += `Impuesto: ${settings.currencySymbol}${currentSale.taxAmount.toFixed(2)}\n`;
    text += `*💰 TOTAL: ${settings.currencySymbol}${currentSale.total.toFixed(2)}*\n`;
    text += `${'─'.repeat(28)}\n`;
    text += `${settings.receiptFooter || '¡Gracias por tu compra! 🍬'}`;

    return text;
}

/**
 * Comparte el recibo por WhatsApp
 */
function shareWhatsApp() {
    if (!currentSale) return;

    const text = generateReceiptText();
    const encodedText = encodeURIComponent(text);

    // Abrir WhatsApp con el texto del recibo
    const whatsappURL = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappURL, '_blank');

    showToast('📱 Abriendo WhatsApp...');
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Botones principales
    document.getElementById('completeSaleBtn').addEventListener('click', openPaymentModal);
    document.getElementById('cancelSaleBtn').addEventListener('click', cancelSale);

    // Modal de pago
    document.getElementById('closePaymentModal').addEventListener('click', closePaymentModal);
    document.getElementById('confirmSaleBtn').addEventListener('click', processSale);

    // Opciones de pago
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', () => {
            selectPaymentMethod(option.dataset.method);
        });
    });

    // Modal de recibo
    document.getElementById('closeReceiptModal').addEventListener('click', closeReceiptModal);
    document.getElementById('printReceiptBtn').addEventListener('click', printReceipt);
    document.getElementById('downloadReceiptBtn').addEventListener('click', downloadReceipt);
    document.getElementById('whatsappReceiptBtn').addEventListener('click', shareWhatsApp);
    document.getElementById('newSaleBtn').addEventListener('click', closeReceiptModal);

    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

/**
 * Muestra el loading
 */
function showLoading(message = 'Cargando...') {
    let loading = document.getElementById('loadingOverlay');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loadingOverlay';
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        document.body.appendChild(loading);
    } else {
        loading.querySelector('.loading-text').textContent = message;
        loading.style.display = 'flex';
    }
}

/**
 * Oculta el loading
 */
function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

/**
 * Configura las pestañas del vendedor
 */
function setupVendorTabs() {
    const tabs = document.querySelectorAll('.vendor-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.view;

            // Actualizar estilos de pestañas
            tabs.forEach(t => {
                t.style.borderBottomColor = 'transparent';
                t.style.color = '#666';
                t.style.fontWeight = '500';
            });
            tab.style.borderBottomColor = '#ff6b8b';
            tab.style.color = '#ff6b8b';
            tab.style.fontWeight = '600';

            // Mostrar/ocultar vistas
            document.getElementById('posView').style.display = view === 'pos' ? 'flex' : 'none';
            document.getElementById('pendingView').style.display = view === 'pending' ? 'block' : 'none';
            const clientsView = document.getElementById('clientsView');
            if (clientsView) {
                clientsView.style.display = view === 'clients' ? 'block' : 'none';
            }

            // Cargar datos según la vista
            if (view === 'pending') {
                loadVendorPendingSales();
            } else if (view === 'clients') {
                loadVendorClients();
            }
        });
    });
}

/**
 * Carga el conteo de pagos pendientes para el badge
 */
async function loadVendorPendingCount() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('sales')
            .where('status', '==', 'pending')
            .get();

        const count = snapshot.size;
        const badge = document.getElementById('pendingBadge');

        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error cargando conteo de pendientes:', error);
    }
}

/**
 * Carga las ventas pendientes en la vista del vendedor
 */
async function loadVendorPendingSales() {
    const listContainer = document.getElementById('vendorPendingList');
    const totalElement = document.getElementById('vendorTotalPending');

    if (!listContainer) return;

    listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
            <p>Cargando...</p>
        </div>
    `;

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
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #28a745;"></i>
                    <p style="color: #28a745; margin-top: 15px; font-weight: 600;">¡Todo cobrado!</p>
                    <p style="color: #666;">No hay pagos pendientes.</p>
                </div>
            `;
            if (totalElement) totalElement.textContent = '$0.00';
            return;
        }

        // Ordenar por fecha de pago
        pendingSales.sort((a, b) => {
            if (!a.creditDueDate) return 1;
            if (!b.creditDueDate) return -1;
            return new Date(a.creditDueDate) - new Date(b.creditDueDate);
        });

        let totalPending = 0;
        let html = '';

        pendingSales.forEach(sale => {
            totalPending += sale.total;

            const saleDate = new Date(sale.date);
            const formattedDate = saleDate.toLocaleDateString('es-MX');

            let isOverdue = false;
            let dueDateText = 'Sin fecha';
            if (sale.creditDueDate) {
                const dueDate = new Date(sale.creditDueDate + 'T00:00:00');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                isOverdue = dueDate < today;
                dueDateText = dueDate.toLocaleDateString('es-MX');
            }

            const products = sale.details.map(d => `${d.quantity}x ${d.name}`).join(', ');

            html += `
                <div style="background: ${isOverdue ? '#fff5f5' : '#f8f9fa'}; border: 1px solid ${isOverdue ? '#dc3545' : '#ddd'}; border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <div>
                            <strong style="font-size: 1.1rem; color: #333;">${sale.customerName || 'Cliente'}</strong>
                            <br>
                            <small style="color: #666;">Venta #${sale.id} • ${formattedDate}</small>
                        </div>
                        <div style="text-align: right;">
                            <strong style="font-size: 1.2rem; color: #ff6b8b;">${settings.currencySymbol}${sale.total.toFixed(2)}</strong>
                        </div>
                    </div>
                    
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">
                        ${products}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: ${isOverdue ? '#dc3545' : '#856404'}; font-size: 0.9rem;">
                            <i class="fas ${isOverdue ? 'fa-exclamation-triangle' : 'fa-calendar'}"></i>
                            ${isOverdue ? 'VENCIDO: ' : 'Pago: '}${dueDateText}
                        </span>
                        <button onclick="vendorMarkAsPaid('${sale.docId}')" 
                                style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-check"></i> Cobrar
                        </button>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;
        if (totalElement) totalElement.textContent = `${settings.currencySymbol}${totalPending.toFixed(2)}`;

    } catch (error) {
        console.error('Error cargando ventas pendientes:', error);
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
                <p>Error al cargar los pagos pendientes</p>
            </div>
        `;
    }
}

/**
 * Marca una venta como pagada desde la vista de vendedor
 */
async function vendorMarkAsPaid(docId) {
    if (!confirm('¿Confirmas que esta venta ya fue pagada?')) return;

    showLoading('Actualizando...');

    try {
        const db = firebase.firestore();
        await db.collection('sales').doc(docId).update({
            status: 'completed',
            paidAt: new Date().toISOString(),
            paymentLabel: 'A Crédito (Pagado)'
        });

        hideLoading();
        showToast('✅ Pago registrado');

        // Recargar lista y badge
        loadVendorPendingSales();
        loadVendorPendingCount();

    } catch (error) {
        console.error('Error actualizando venta:', error);
        hideLoading();
        alert('Error al registrar el pago. Intenta de nuevo.');
    }
}

// Hacer funciones globales
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.vendorMarkAsPaid = vendorMarkAsPaid;
window.cancelSale = cancelSale;
window.openClientModal = openClientModal;
window.editClient = editClient;
window.deleteClient = deleteClient;
window.callClient = callClient;
window.filterByCategory = filterByCategory;
window.openBarcodeScanner = openBarcodeScanner;
window.closeBarcodeScanner = closeBarcodeScanner;

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', initializeVendorPOS);

// ==================== ESCÁNER DE CÓDIGO DE BARRAS ====================

let html5QrCode = null;
let scannedProductsCount = 0;
let lastScannedCode = null;
let scanCooldown = false;
let audioContext = null;

/**
 * Reproduce un sonido de beep usando Web Audio API
 * @param {boolean} success - true para beep de éxito, false para error
 */
function playBeep(success = true) {
    try {
        // Crear contexto de audio si no existe
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (success) {
            // Beep de éxito: tono alto y corto
            oscillator.frequency.value = 1200;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.15);
        } else {
            // Beep de error: tono bajo y más largo
            oscillator.frequency.value = 400;
            oscillator.type = 'square';
            gainNode.gain.value = 0.2;

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        }
    } catch (error) {
        console.warn('No se pudo reproducir el sonido:', error);
    }
}

/**
 * Abre el modal del escáner de código de barras
 */
async function openBarcodeScanner() {
    const modal = document.getElementById('scannerModal');
    const scannerContainer = document.getElementById('barcode-scanner');
    const scanResult = document.getElementById('scanResult');
    const instructions = document.getElementById('scannerInstructions');

    // Resetear estado
    scannedProductsCount = 0;
    lastScannedCode = null;
    document.getElementById('scannedCount').textContent = '0';
    scanResult.style.display = 'none';
    instructions.style.display = 'block';

    modal.classList.add('active');

    try {
        // Inicializar escáner
        html5QrCode = new Html5Qrcode('barcode-scanner');

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 100 },
            aspectRatio: 1.5,
            formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.CODE_93,
                Html5QrcodeSupportedFormats.QR_CODE
            ]
        };

        await html5QrCode.start(
            { facingMode: 'environment' }, // Cámara trasera
            config,
            onScanSuccess,
            onScanError
        );

        instructions.innerHTML = `
            <i class="fas fa-camera" style="font-size: 2rem; margin-bottom: 10px; color: var(--success-color);"></i>
            <p style="color: var(--success-color);">📷 Cámara activa - Apunta al código de barras</p>
        `;

    } catch (error) {
        console.error('Error iniciando escáner:', error);
        instructions.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; color: var(--danger-color);"></i>
            <p style="color: var(--danger-color);">Error al acceder a la cámara</p>
            <p style="font-size: 0.85rem; color: #666;">Verifica los permisos de la cámara</p>
        `;
    }
}

/**
 * Cierra el modal del escáner
 */
async function closeBarcodeScanner() {
    const modal = document.getElementById('scannerModal');

    // Detener el escáner si está activo
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch (error) {
            console.warn('Error deteniendo escáner:', error);
        }
        html5QrCode = null;
    }

    modal.classList.remove('active');

    // Actualizar la vista del carrito
    updateCartDisplay();
    renderProducts();
}

/**
 * Callback cuando se escanea exitosamente un código
 */
function onScanSuccess(decodedText, decodedResult) {
    // Evitar escaneos duplicados muy rápidos del mismo código
    if (scanCooldown || decodedText === lastScannedCode) {
        return;
    }

    // Activar cooldown
    scanCooldown = true;
    setTimeout(() => {
        scanCooldown = false;
        lastScannedCode = null;
    }, 1500); // 1.5 segundos entre escaneos del mismo producto

    lastScannedCode = decodedText;

    console.log('📦 Código escaneado:', decodedText);

    // Buscar producto por código de barras o ID
    const product = findProductByBarcode(decodedText);

    if (product) {
        // Agregar al carrito
        addToCartFromScanner(product);

        // Mostrar resultado
        showScanResult(product, true);

        // Sonido de éxito (beep)
        playBeep(true);

        // Vibración de éxito
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        // Incrementar contador
        scannedProductsCount++;
        document.getElementById('scannedCount').textContent = scannedProductsCount;

    } else {
        // Producto no encontrado
        showScanResult(null, false, decodedText);

        // Sonido de error
        playBeep(false);

        // Vibración de error
        if (navigator.vibrate) {
            navigator.vibrate(300);
        }
    }
}

/**
 * Callback para errores de escaneo (se ignoran, son normales)
 */
function onScanError(errorMessage) {
    // Ignorar - son errores normales cuando no hay código visible
}

/**
 * Busca un producto por su código de barras o ID
 */
function findProductByBarcode(code) {
    // Buscar por código de barras exacto
    let product = products.find(p => p.barcode === code);

    // Si no se encuentra, buscar por ID
    if (!product) {
        product = products.find(p => String(p.id) === code);
    }

    // Si aún no se encuentra, buscar coincidencia parcial en barcode
    if (!product) {
        product = products.find(p => p.barcode && p.barcode.includes(code));
    }

    return product;
}

/**
 * Agrega un producto al carrito desde el escáner
 */
function addToCartFromScanner(product) {
    if (!product || product.stock <= 0) return;

    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            showToast('Sin stock disponible');
            return;
        }
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }

    // Actualizar display sin cerrar el escáner
    updateCartDisplay();
}

/**
 * Muestra el resultado del escaneo
 */
function showScanResult(product, success, code = '') {
    const scanResult = document.getElementById('scanResult');
    const productName = document.getElementById('scannedProductName');
    const productInfo = document.getElementById('scannedProductInfo');

    if (success && product) {
        scanResult.style.background = '#d4edda';
        productName.style.color = '#155724';
        productInfo.style.color = '#155724';

        productName.innerHTML = `<i class="fas fa-check-circle"></i> ${product.name}`;

        const cartItem = cart.find(item => item.productId === product.id);
        const qty = cartItem ? cartItem.quantity : 1;
        productInfo.textContent = `${settings.currencySymbol}${product.price.toFixed(2)} × ${qty} = ${settings.currencySymbol}${(product.price * qty).toFixed(2)}`;

    } else {
        scanResult.style.background = '#f8d7da';
        productName.style.color = '#721c24';
        productInfo.style.color = '#721c24';

        productName.innerHTML = `<i class="fas fa-times-circle"></i> Producto no encontrado`;
        productInfo.textContent = `Código: ${code}`;
    }

    scanResult.style.display = 'block';

    // Ocultar después de 2 segundos si es éxito
    if (success) {
        setTimeout(() => {
            scanResult.style.display = 'none';
        }, 2000);
    }
}

// ==================== RUTAS Y CLIENTES ====================

/**
 * Inicializa las rutas y clientes
 */
async function initializeRoutesAndClients() {
    try {
        // Inicializar variable global db para los servicios
        window.db = firebase.firestore();
        db = window.db;

        // Cargar rutas
        await loadVendorRoutes();

        // Cargar clientes
        await loadVendorClients();

        // Popular selectores de ruta
        populateRouteSelects();

        console.log('✅ Rutas y clientes inicializados');
    } catch (error) {
        console.error('❌ Error inicializando rutas y clientes:', error);
    }
}

/**
 * Carga las rutas desde Firebase
 */
async function loadVendorRoutes() {
    try {
        const snapshot = await db.collection('routes').get();

        if (snapshot.empty) {
            // Crear rutas por defecto
            const defaultRoutes = [
                { id: 'comitan', name: 'Comitán' },
                { id: 'palenque', name: 'Palenque' },
                { id: 'tenozique', name: 'Tenozique' },
                { id: 'salto_de_agua', name: 'Salto de Agua' },
                { id: 'trinitaria', name: 'Trinitaria' },
                { id: 'comalapa', name: 'Comalapa' },
                { id: 'chicomuselo', name: 'Chicomuselo' },
                { id: 'tzimol', name: 'Tzimol' },
                { id: 'margaritas', name: 'Margaritas' }
            ];

            for (const route of defaultRoutes) {
                await db.collection('routes').doc(route.id).set({
                    ...route,
                    isActive: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            vendorRoutes = defaultRoutes;
        } else {
            vendorRoutes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

        console.log(`📍 ${vendorRoutes.length} rutas cargadas`);
    } catch (error) {
        console.error('Error cargando rutas:', error);
        vendorRoutes = [];
    }
}

/**
 * Carga los clientes desde Firebase
 */
async function loadVendorClients() {
    try {
        const snapshot = await db.collection('clients').orderBy('businessName').get();

        vendorClients = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`👥 ${vendorClients.length} clientes cargados`);

        // Renderizar lista si estamos en la vista de clientes
        renderVendorClientsList();

    } catch (error) {
        console.error('Error cargando clientes:', error);
        vendorClients = [];
    }
}

/**
 * Popula los selectores de rutas
 */
function populateRouteSelects() {
    const selects = [
        'saleRoute',
        'clientRoute',
        'clientRouteFilter'
    ];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Mantener la primera opción
        const firstOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);

        // Agregar rutas
        vendorRoutes.filter(r => r.isActive !== false).forEach(route => {
            const option = document.createElement('option');
            option.value = route.id;
            option.textContent = route.name;
            select.appendChild(option);
        });
    });
}

/**
 * Renderiza la lista de clientes en la vista del vendedor
 */
function renderVendorClientsList() {
    const container = document.getElementById('vendorClientsList');
    if (!container) return;

    const routeFilter = document.getElementById('clientRouteFilter')?.value || '';
    const searchQuery = document.getElementById('clientSearchInput')?.value?.toLowerCase() || '';

    let filteredClients = vendorClients;

    // Filtrar por ruta
    if (routeFilter) {
        filteredClients = filteredClients.filter(c => c.routeId === routeFilter);
    }

    // Filtrar por búsqueda
    if (searchQuery) {
        filteredClients = filteredClients.filter(c =>
            c.businessName?.toLowerCase().includes(searchQuery) ||
            c.ownerName?.toLowerCase().includes(searchQuery) ||
            c.phone?.includes(searchQuery)
        );
    }

    if (filteredClients.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-users" style="font-size: 3rem; color: #ddd;"></i>
                <p style="margin-top: 15px;">No hay clientes${routeFilter ? ' en esta ruta' : ''}</p>
                <button class="btn btn-primary" onclick="openClientModal()" style="margin-top: 15px;">
                    <i class="fas fa-plus"></i> Agregar Cliente
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    filteredClients.forEach(client => {
        const route = vendorRoutes.find(r => r.id === client.routeId);
        const routeName = route ? route.name : 'Sin ruta';
        const creditBadge = client.hasCredit && client.creditAmount > 0
            ? `<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">💳 $${client.creditAmount.toFixed(2)}</span>`
            : '';

        html += `
            <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; margin-bottom: 12px; border-left: 4px solid #ff6b8b;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 5px 0; color: #333;">
                            <i class="fas fa-store" style="color: #ff6b8b;"></i> ${client.businessName}
                        </h4>
                        <p style="margin: 3px 0; font-size: 0.9rem; color: #666;">
                            <i class="fas fa-user"></i> ${client.ownerName || 'Sin nombre'}
                        </p>
                        <p style="margin: 3px 0; font-size: 0.9rem; color: #666;">
                            <i class="fas fa-phone"></i> ${client.phone || 'Sin teléfono'}
                        </p>
                        <p style="margin: 3px 0; font-size: 0.9rem; color: #666;">
                            <i class="fas fa-route"></i> ${routeName}
                        </p>
                        ${client.address ? `<p style="margin: 3px 0; font-size: 0.85rem; color: #888;"><i class="fas fa-map-marker-alt"></i> ${client.address}</p>` : ''}
                        ${client.reference ? `<p style="margin: 3px 0; font-size: 0.85rem; color: #888;"><i class="fas fa-info-circle"></i> ${client.reference}</p>` : ''}
                        ${creditBadge}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        ${client.phone ? `<button onclick="callClient('${client.phone}')" class="btn btn-success" style="padding: 8px 12px; font-size: 0.85rem;"><i class="fas fa-phone"></i></button>` : ''}
                        <button onclick="editClient('${client.id}')" class="btn btn-info" style="padding: 8px 12px; font-size: 0.85rem;"><i class="fas fa-edit"></i></button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Configura los event listeners para clientes
 */
function setupClientListeners() {
    // Botón nuevo cliente
    const addBtn = document.getElementById('addNewClientBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openClientModal());
    }

    // Cerrar modal
    const closeBtn = document.getElementById('closeClientModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeClientModal);
    }

    // Cancelar
    const cancelBtn = document.getElementById('cancelClientBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeClientModal);
    }

    // Guardar cliente
    const saveBtn = document.getElementById('saveClientBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveClient);
    }

    // Filtro por ruta
    const routeFilter = document.getElementById('clientRouteFilter');
    if (routeFilter) {
        routeFilter.addEventListener('change', renderVendorClientsList);
    }

    // Búsqueda
    const searchInput = document.getElementById('clientSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchInput.searchTimeout);
            searchInput.searchTimeout = setTimeout(renderVendorClientsList, 300);
        });
    }

    // Selección de ruta en modal de pago
    const saleRouteSelect = document.getElementById('saleRoute');
    if (saleRouteSelect) {
        saleRouteSelect.addEventListener('change', (e) => {
            selectedRouteId = e.target.value;
            updateClientSelect();
        });
    }

    // Selección de cliente en modal de pago
    const saleClientSelect = document.getElementById('saleClient');
    if (saleClientSelect) {
        saleClientSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'new') {
                // Abrir modal de nuevo cliente
                openClientModal(true);
            } else if (value) {
                selectedClientId = value;
                showSelectedClientInfo(value);
            } else {
                selectedClientId = null;
                hideSelectedClientInfo();
            }
        });
    }
}

/**
 * Actualiza el selector de clientes según la ruta seleccionada
 */
function updateClientSelect() {
    const select = document.getElementById('saleClient');
    if (!select) return;

    select.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
    select.innerHTML += '<option value="new">➕ Nuevo Cliente...</option>';

    let filteredClients = vendorClients;
    if (selectedRouteId) {
        filteredClients = vendorClients.filter(c => c.routeId === selectedRouteId);
    }

    filteredClients.forEach(client => {
        const creditBadge = client.hasCredit ? ' 💳' : '';
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.businessName}${creditBadge}`;
        select.appendChild(option);
    });
}

/**
 * Muestra información del cliente seleccionado
 */
function showSelectedClientInfo(clientId) {
    const container = document.getElementById('selectedClientInfo');
    const manualGroup = document.getElementById('manualNameGroup');
    if (!container) return;

    const client = vendorClients.find(c => c.id === clientId);
    if (!client) {
        hideSelectedClientInfo();
        return;
    }

    container.style.display = 'block';
    container.innerHTML = `
        <div style="font-size: 0.9rem;">
            <strong><i class="fas fa-store"></i> ${client.businessName}</strong>
            <br>
            <small><i class="fas fa-user"></i> ${client.ownerName || 'Sin nombre'}</small>
            ${client.phone ? `<br><small><i class="fas fa-phone"></i> ${client.phone}</small>` : ''}
            ${client.hasCredit ? `<br><span style="color: #dc3545;"><i class="fas fa-exclamation-triangle"></i> Crédito pendiente: $${client.creditAmount?.toFixed(2) || '0.00'}</span>` : ''}
        </div>
    `;

    // Ocultar campo de nombre manual
    if (manualGroup) {
        manualGroup.style.display = 'none';
    }

    // Llenar el campo de nombre con el nombre del cliente
    const customerNameInput = document.getElementById('customerName');
    if (customerNameInput) {
        customerNameInput.value = client.businessName;
    }
}

/**
 * Oculta la información del cliente seleccionado
 */
function hideSelectedClientInfo() {
    const container = document.getElementById('selectedClientInfo');
    const manualGroup = document.getElementById('manualNameGroup');

    if (container) {
        container.style.display = 'none';
    }
    if (manualGroup) {
        manualGroup.style.display = 'block';
    }
}

/**
 * Abre el modal de cliente
 */
function openClientModal(fromPayment = false) {
    const modal = document.getElementById('clientModal');
    if (!modal) return;

    // Limpiar formulario
    document.getElementById('editClientId').value = '';
    document.getElementById('clientBusinessName').value = '';
    document.getElementById('clientOwnerName').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientRoute').value = selectedRouteId || '';
    document.getElementById('clientAddress').value = '';
    document.getElementById('clientReference').value = '';
    document.getElementById('clientNotes').value = '';

    document.getElementById('clientModalTitle').textContent = 'Nuevo Cliente';

    // Popular rutas en el select del modal
    populateRouteSelects();

    modal.style.display = 'flex';
    modal.classList.add('active');
}

/**
 * Cierra el modal de cliente
 */
function closeClientModal() {
    const modal = document.getElementById('clientModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

/**
 * Edita un cliente existente
 */
function editClient(clientId) {
    const client = vendorClients.find(c => c.id === clientId);
    if (!client) return;

    const modal = document.getElementById('clientModal');
    if (!modal) return;

    document.getElementById('editClientId').value = clientId;
    document.getElementById('clientBusinessName').value = client.businessName || '';
    document.getElementById('clientOwnerName').value = client.ownerName || '';
    document.getElementById('clientPhone').value = client.phone || '';
    document.getElementById('clientRoute').value = client.routeId || '';
    document.getElementById('clientAddress').value = client.address || '';
    document.getElementById('clientReference').value = client.reference || '';
    document.getElementById('clientNotes').value = client.notes || '';

    document.getElementById('clientModalTitle').textContent = 'Editar Cliente';

    modal.style.display = 'flex';
    modal.classList.add('active');
}

/**
 * Guarda un cliente (nuevo o editado)
 */
async function saveClient() {
    const editId = document.getElementById('editClientId').value;
    const businessName = document.getElementById('clientBusinessName').value.trim();
    const ownerName = document.getElementById('clientOwnerName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const routeId = document.getElementById('clientRoute').value;
    const address = document.getElementById('clientAddress').value.trim();
    const reference = document.getElementById('clientReference').value.trim();
    const notes = document.getElementById('clientNotes').value.trim();

    if (!businessName) {
        showToast('El nombre del local es obligatorio');
        return;
    }

    if (!routeId) {
        showToast('Selecciona una ruta');
        return;
    }

    showLoading('Guardando cliente...');

    try {
        const clientData = {
            businessName,
            ownerName,
            phone,
            routeId,
            address,
            reference,
            notes,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (editId) {
            // Actualizar existente
            await db.collection('clients').doc(editId).update(clientData);

            const index = vendorClients.findIndex(c => c.id === editId);
            if (index !== -1) {
                vendorClients[index] = { ...vendorClients[index], ...clientData };
            }

            showToast('✅ Cliente actualizado');
        } else {
            // Crear nuevo
            clientData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            clientData.createdBy = 'vendedor';
            clientData.totalPurchases = 0;
            clientData.purchaseCount = 0;
            clientData.hasCredit = false;
            clientData.creditAmount = 0;

            const docRef = await db.collection('clients').add(clientData);
            vendorClients.push({ id: docRef.id, ...clientData });

            // Si venía del modal de pago, seleccionar el nuevo cliente
            selectedClientId = docRef.id;
            updateClientSelect();

            const saleClientSelect = document.getElementById('saleClient');
            if (saleClientSelect) {
                saleClientSelect.value = docRef.id;
                showSelectedClientInfo(docRef.id);
            }

            showToast('✅ Cliente creado');
        }

        hideLoading();
        closeClientModal();
        renderVendorClientsList();

    } catch (error) {
        console.error('Error guardando cliente:', error);
        hideLoading();
        showToast('❌ Error al guardar cliente');
    }
}

/**
 * Elimina un cliente
 */
async function deleteClient(clientId) {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    showLoading('Eliminando...');

    try {
        await db.collection('clients').doc(clientId).delete();

        const index = vendorClients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            vendorClients.splice(index, 1);
        }

        hideLoading();
        showToast('🗑️ Cliente eliminado');
        renderVendorClientsList();

    } catch (error) {
        console.error('Error eliminando cliente:', error);
        hideLoading();
        showToast('❌ Error al eliminar cliente');
    }
}

/**
 * Llama a un cliente
 */
function callClient(phone) {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
}
