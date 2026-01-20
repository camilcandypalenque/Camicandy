/**
 * Servicio de Órdenes de Salida para Camil Candy POS
 * Maneja la asignación de inventario a vendedores/rutas
 */

// Variables del módulo
let exitOrders = [];

/**
 * Genera un ID único para la orden de salida
 * Formato: EO-YYYYMMDD-XXX
 */
async function generateExitOrderId() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Obtener contador
    const countersRef = db.collection(COLLECTIONS.COUNTERS).doc('main');
    const countersDoc = await countersRef.get();
    const counters = countersDoc.data() || {};
    const nextId = (counters.nextExitOrderId || 1);

    // Actualizar contador
    await countersRef.update({
        nextExitOrderId: nextId + 1
    });

    return `EO-${dateStr}-${String(nextId).padStart(3, '0')}`;
}

/**
 * Obtiene todas las órdenes de salida
 * @param {Object} filters - Filtros opcionales { status, routeId, date }
 */
async function getExitOrders(filters = {}) {
    try {
        let query = db.collection(COLLECTIONS.EXIT_ORDERS)
            .orderBy('createdAt', 'desc');

        const snapshot = await query.get();
        let orders = snapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id
        }));

        // Aplicar filtros en cliente
        if (filters.status) {
            orders = orders.filter(o => o.status === filters.status);
        }
        if (filters.routeId) {
            orders = orders.filter(o => o.routeId === filters.routeId);
        }
        if (filters.date) {
            orders = orders.filter(o => o.date === filters.date);
        }

        exitOrders = orders;
        return orders;
    } catch (error) {
        console.error('❌ Error obteniendo órdenes de salida:', error);
        return [];
    }
}

/**
 * Obtiene una orden de salida activa para una ruta específica
 * @param {string} routeId - ID de la ruta
 */
async function getActiveExitOrderByRoute(routeId) {
    try {
        const snapshot = await db.collection(COLLECTIONS.EXIT_ORDERS)
            .where('routeId', '==', routeId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return {
            ...doc.data(),
            docId: doc.id
        };
    } catch (error) {
        console.error('❌ Error obteniendo orden activa:', error);
        return null;
    }
}

/**
 * Obtiene una orden de salida por su ID
 * @param {string} orderId - ID de la orden
 */
async function getExitOrderById(orderId) {
    try {
        const doc = await db.collection(COLLECTIONS.EXIT_ORDERS).doc(orderId).get();

        if (!doc.exists) {
            return null;
        }

        return {
            ...doc.data(),
            docId: doc.id
        };
    } catch (error) {
        console.error('❌ Error obteniendo orden:', error);
        return null;
    }
}

/**
 * Crea una nueva orden de salida
 * @param {Object} orderData - Datos de la orden { routeId, vendorName, items }
 * items: [{ productId, productName, quantity, price, cost }]
 */
async function createExitOrder(orderData) {
    try {
        const orderId = await generateExitOrderId();
        const today = new Date();

        // Calcular totales
        let totalItems = 0;
        let totalValue = 0;
        let totalCost = 0;

        const items = orderData.items.map(item => {
            totalItems += item.quantity;
            totalValue += item.quantity * item.price;
            totalCost += item.quantity * (item.cost || 0);

            return {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                cost: item.cost || 0,
                sold: 0,
                remaining: item.quantity
            };
        });

        const exitOrder = {
            id: orderId,
            routeId: orderData.routeId,
            routeName: orderData.routeName || '',
            vendorName: orderData.vendorName || '',
            status: 'active',
            date: today.toISOString().slice(0, 10),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            items: items,
            totalItems: totalItems,
            totalValue: totalValue,
            totalCost: totalCost,
            soldItems: 0,
            soldValue: 0
        };

        // Usar batch para crear orden y actualizar stock
        const batch = db.batch();

        // Crear orden
        const orderRef = db.collection(COLLECTIONS.EXIT_ORDERS).doc(orderId);
        batch.set(orderRef, exitOrder);

        // Descontar stock del inventario principal
        for (const item of items) {
            const productRef = db.collection(COLLECTIONS.PRODUCTS).doc(item.productId.toString());
            const productDoc = await productRef.get();

            if (productDoc.exists) {
                const currentStock = productDoc.data().stock || 0;
                const newStock = Math.max(0, currentStock - item.quantity);

                batch.update(productRef, {
                    stock: newStock,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        // Registrar movimiento de stock
        const countersRef = db.collection(COLLECTIONS.COUNTERS).doc('main');
        const countersDoc = await countersRef.get();
        let movementId = countersDoc.data()?.nextMovementId || 1;

        for (const item of items) {
            const movementRef = db.collection(COLLECTIONS.STOCK_MOVEMENTS).doc(movementId.toString());
            batch.set(movementRef, {
                id: movementId,
                productId: item.productId,
                productName: item.productName,
                type: 'exit',
                quantity: -item.quantity,
                notes: `Orden de Salida ${orderId} - Ruta: ${orderData.routeName || orderData.routeId}`,
                date: today.toISOString(),
                exitOrderId: orderId
            });
            movementId++;
        }

        batch.update(countersRef, {
            nextMovementId: movementId
        });

        await batch.commit();

        console.log('✅ Orden de salida creada:', orderId);
        return { success: true, orderId, order: exitOrder };
    } catch (error) {
        console.error('❌ Error creando orden de salida:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza las cantidades vendidas en una orden de salida
 * @param {string} orderId - ID de la orden
 * @param {Array} soldItems - Items vendidos [{ productId, quantity }]
 */
async function updateExitOrderSales(orderId, soldItems) {
    try {
        const orderRef = db.collection(COLLECTIONS.EXIT_ORDERS).doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Orden no encontrada' };
        }

        const orderData = orderDoc.data();
        let items = [...orderData.items];
        let soldItemsCount = orderData.soldItems || 0;
        let soldValue = orderData.soldValue || 0;

        for (const soldItem of soldItems) {
            const itemIndex = items.findIndex(i =>
                i.productId.toString() === soldItem.productId.toString()
            );

            if (itemIndex !== -1) {
                items[itemIndex].sold = (items[itemIndex].sold || 0) + soldItem.quantity;
                items[itemIndex].remaining = items[itemIndex].quantity - items[itemIndex].sold;

                soldItemsCount += soldItem.quantity;
                soldValue += soldItem.quantity * items[itemIndex].price;
            }
        }

        await orderRef.update({
            items: items,
            soldItems: soldItemsCount,
            soldValue: soldValue,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Orden actualizada con ventas:', orderId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error actualizando orden:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Completa una orden de salida (devuelve productos no vendidos al inventario)
 * @param {string} orderId - ID de la orden
 */
async function completeExitOrder(orderId) {
    try {
        const orderRef = db.collection(COLLECTIONS.EXIT_ORDERS).doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Orden no encontrada' };
        }

        const orderData = orderDoc.data();
        const batch = db.batch();

        // Devolver productos no vendidos al inventario
        for (const item of orderData.items) {
            const remaining = item.remaining || (item.quantity - (item.sold || 0));

            if (remaining > 0) {
                const productRef = db.collection(COLLECTIONS.PRODUCTS).doc(item.productId.toString());
                const productDoc = await productRef.get();

                if (productDoc.exists) {
                    const currentStock = productDoc.data().stock || 0;
                    batch.update(productRef, {
                        stock: currentStock + remaining,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }

        // Marcar orden como completada
        batch.update(orderRef, {
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        console.log('✅ Orden completada:', orderId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error completando orden:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancela una orden de salida (devuelve todos los productos al inventario)
 * @param {string} orderId - ID de la orden
 */
async function cancelExitOrder(orderId) {
    try {
        const orderRef = db.collection(COLLECTIONS.EXIT_ORDERS).doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Orden no encontrada' };
        }

        const orderData = orderDoc.data();

        if (orderData.soldItems > 0) {
            return {
                success: false,
                error: 'No se puede cancelar una orden con ventas registradas. Use "Completar" en su lugar.'
            };
        }

        const batch = db.batch();

        // Devolver todos los productos al inventario
        for (const item of orderData.items) {
            const productRef = db.collection(COLLECTIONS.PRODUCTS).doc(item.productId.toString());
            const productDoc = await productRef.get();

            if (productDoc.exists) {
                const currentStock = productDoc.data().stock || 0;
                batch.update(productRef, {
                    stock: currentStock + item.quantity,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        // Marcar orden como cancelada
        batch.update(orderRef, {
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        console.log('✅ Orden cancelada:', orderId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error cancelando orden:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene productos disponibles de una orden para el POS del vendedor
 * @param {string} orderId - ID de la orden
 */
async function getExitOrderProducts(orderId) {
    try {
        const order = await getExitOrderById(orderId);

        if (!order) {
            return [];
        }

        // Mapear items a formato de producto para el POS
        return order.items
            .filter(item => item.remaining > 0)
            .map(item => ({
                id: item.productId,
                productId: item.productId,
                name: item.productName,
                price: item.price,
                cost: item.cost,
                stock: item.remaining,
                exitOrderId: order.id,
                fromExitOrder: true
            }));
    } catch (error) {
        console.error('❌ Error obteniendo productos de orden:', error);
        return [];
    }
}

// Exportar funciones globalmente
window.ExitOrdersService = {
    getAll: getExitOrders,
    getById: getExitOrderById,
    getActiveByRoute: getActiveExitOrderByRoute,
    create: createExitOrder,
    updateSales: updateExitOrderSales,
    complete: completeExitOrder,
    cancel: cancelExitOrder,
    getProducts: getExitOrderProducts
};
