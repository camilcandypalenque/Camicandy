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

        // Renderizar productos
        renderProducts();
        updateCartDisplay();

        // Configurar eventos
        setupEventListeners();

        hideLoading();
        console.log('✅ POS Vendedor listo');

    } catch (error) {
        console.error('Error inicializando:', error);
        hideLoading();
        alert('Error al conectar. Verifica tu conexión a internet.');
    }
}

/**
 * Carga los productos desde Firebase
 */
async function loadProducts() {
    const db = firebase.firestore();
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
 * Renderiza los productos en el grid
 */
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const countBadge = document.getElementById('productCount');

    const availableProducts = products.filter(p => p.stock > 0);
    countBadge.textContent = `${availableProducts.length} disponibles`;

    grid.innerHTML = '';

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = `product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`;

        // Iconos y colores según el tipo de producto
        const isConcentrado = product.type === 'concentrado';
        const productIcon = isConcentrado ? 'fa-wine-bottle' : 'fa-shopping-bag';
        const iconColor = isConcentrado ? '#17a2b8' : '#28a745';
        const badgeClass = isConcentrado ? 'badge-concentrado' : 'badge-embolsado';
        const typeName = isConcentrado ? 'Concentrado' : 'Embolsado';

        card.innerHTML = `
            <div class="product-icon" style="text-align: center; margin-bottom: 8px;">
                <i class="fas ${productIcon}" style="font-size: 2rem; color: ${iconColor};"></i>
            </div>
            <span class="product-badge ${badgeClass}">${typeName}</span>
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
                <div class="cart-item-price">${settings.currencySymbol}${item.price.toFixed(2)} c/u</div>
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
 * Cancela la venta actual
 */
function cancelSale() {
    if (cart.length === 0) return;

    if (confirm('¿Cancelar esta venta?')) {
        cart = [];
        updateCartDisplay();
        showToast('Venta cancelada');
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
    const paymentLabels = {
        'efectivo': 'Efectivo',
        'transferencia': 'Transferencia',
        'deposito': 'Depósito',
        'credito': 'A Crédito'
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
            <span>${item.quantity}x ${item.name}</span>
            <span>${settings.currencySymbol}${item.subtotal.toFixed(2)}</span>
        </div>
    `).join('');

    receiptContent.innerHTML = `
        <div class="receipt-header">
            <h2><i class="fas fa-candy-cane"></i> ${settings.businessName || 'Cami Candy'}</h2>
            <p>${settings.businessAddress || ''}</p>
            <p>${settings.businessPhone || ''}</p>
        </div>
        
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
 * Descarga el recibo como imagen
 */
async function downloadReceipt() {
    if (!currentSale) return;

    showToast('Generando recibo...');

    // Crear un canvas temporal para el recibo
    const receiptEl = document.getElementById('receiptContent');

    try {
        // Usar html2canvas si está disponible, sino generar texto
        const receiptText = generateReceiptText();

        // Crear blob de texto
        const blob = new Blob([receiptText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `recibo_${currentSale.id}_${Date.now()}.txt`;
        link.click();

        URL.revokeObjectURL(url);
        showToast('Recibo descargado');
    } catch (error) {
        console.error('Error descargando recibo:', error);
        showToast('Error al descargar');
    }
}

/**
 * Genera el texto del recibo para compartir
 */
function generateReceiptText() {
    if (!currentSale) return '';

    let text = `🍬 *${settings.businessName || 'Candy Cami'}*\n`;
    text += `${'─'.repeat(30)}\n`;
    text += `📋 *Recibo #${currentSale.id}*\n`;
    text += `📅 ${currentSale.formattedDate}\n`;
    text += `👤 Cliente: ${currentSale.customerName}\n`;
    text += `💳 Pago: ${currentSale.paymentLabel}\n`;
    text += `${'─'.repeat(30)}\n`;
    text += `*PRODUCTOS:*\n`;

    currentSale.details.forEach(item => {
        text += `  ${item.quantity}x ${item.name}\n`;
        text += `     ${settings.currencySymbol}${item.subtotal.toFixed(2)}\n`;
    });

    text += `${'─'.repeat(30)}\n`;
    text += `Subtotal: ${settings.currencySymbol}${currentSale.subtotal.toFixed(2)}\n`;
    text += `Impuesto (${currentSale.taxRate}%): ${settings.currencySymbol}${currentSale.taxAmount.toFixed(2)}\n`;
    text += `*TOTAL: ${settings.currencySymbol}${currentSale.total.toFixed(2)}*\n`;
    text += `${'─'.repeat(30)}\n`;
    text += `${settings.receiptFooter || '¡Gracias por su compra!'}\n`;

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

// Hacer funciones globales
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', initializeVendorPOS);
