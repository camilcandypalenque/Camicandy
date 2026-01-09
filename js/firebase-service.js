/**
 * Servicio Firebase para Camil Candy POS
 * Maneja todas las operaciones CRUD con Firestore
 */

// Variables globales de Firebase
let db = null;
let isFirebaseReady = false;

/**
 * Inicializa Firebase y Firestore
 */
async function initializeFirebase() {
    try {
        // Inicializar Firebase App
        if (!firebase.apps.length) {
            firebase.initializeApp(window.FIREBASE_CONFIG);
        }

        // Obtener referencia a Firestore
        db = firebase.firestore();

        // Habilitar persistencia offline
        try {
            await db.enablePersistence();
            console.log('✅ Persistencia offline habilitada');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Persistencia no disponible: múltiples tabs abiertas');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Persistencia no soportada en este navegador');
            }
        }

        isFirebaseReady = true;
        console.log('✅ Firebase inicializado correctamente');

        // Verificar si hay datos iniciales
        await initializeDataIfEmpty();

        return true;
    } catch (error) {
        console.error('❌ Error inicializando Firebase:', error);
        isFirebaseReady = false;
        return false;
    }
}

/**
 * Inicializa datos de ejemplo si la base está vacía
 */
async function initializeDataIfEmpty() {
    try {
        const productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS).limit(1).get();

        if (productsSnapshot.empty) {
            console.log('📦 Inicializando datos de ejemplo...');

            // Insertar productos de ejemplo
            const batch = db.batch();

            for (const product of SAMPLE_PRODUCTS) {
                const docRef = db.collection(COLLECTIONS.PRODUCTS).doc(product.id.toString());
                batch.set(docRef, {
                    ...product,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // Inicializar contadores
            const countersRef = db.collection(COLLECTIONS.COUNTERS).doc('main');
            batch.set(countersRef, {
                nextProductId: 7,
                nextSaleId: 1,
                nextMovementId: 1
            });

            // Inicializar configuración
            const settingsRef = db.collection(COLLECTIONS.SETTINGS).doc('main');
            batch.set(settingsRef, DEFAULT_SETTINGS);

            await batch.commit();
            console.log('✅ Datos de ejemplo inicializados');
        }
    } catch (error) {
        console.error('❌ Error inicializando datos:', error);
    }
}

// ==================== PRODUCTOS ====================

/**
 * Obtiene todos los productos
 */
async function getProducts() {
    try {
        const snapshot = await db.collection(COLLECTIONS.PRODUCTS)
            .orderBy('id', 'asc')
            .get();

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id
        }));
    } catch (error) {
        console.error('❌ Error obteniendo productos:', error);
        return [];
    }
}

/**
 * Agrega un nuevo producto
 */
async function addProduct(productData) {
    try {
        // Obtener siguiente ID
        const countersRef = db.collection(COLLECTIONS.COUNTERS).doc('main');
        const countersDoc = await countersRef.get();
        const nextId = countersDoc.exists ? countersDoc.data().nextProductId : 1;

        const product = {
            ...productData,
            id: nextId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Usar batch para actualizar producto y contador
        const batch = db.batch();

        const productRef = db.collection(COLLECTIONS.PRODUCTS).doc(nextId.toString());
        batch.set(productRef, product);

        batch.update(countersRef, {
            nextProductId: nextId + 1
        });

        await batch.commit();

        console.log('✅ Producto agregado:', product.name);
        return { success: true, product };
    } catch (error) {
        console.error('❌ Error agregando producto:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza un producto existente
 */
async function updateProduct(productId, updates) {
    try {
        const productRef = db.collection(COLLECTIONS.PRODUCTS).doc(productId.toString());

        await productRef.update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Producto actualizado:', productId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error actualizando producto:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Elimina un producto
 */
async function deleteProduct(productId) {
    try {
        await db.collection(COLLECTIONS.PRODUCTS).doc(productId.toString()).delete();
        console.log('✅ Producto eliminado:', productId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error eliminando producto:', error);
        return { success: false, error: error.message };
    }
}

// ==================== VENTAS ====================

/**
 * Obtiene todas las ventas
 */
async function getSales() {
    try {
        const snapshot = await db.collection(COLLECTIONS.SALES)
            .orderBy('date', 'desc')
            .get();

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id
        }));
    } catch (error) {
        console.error('❌ Error obteniendo ventas:', error);
        return [];
    }
}

/**
 * Registra una nueva venta
 */
async function addSale(saleData, stockUpdates, movements) {
    try {
        const countersRef = db.collection(COLLECTIONS.COUNTERS).doc('main');
        const countersDoc = await countersRef.get();
        const counters = countersDoc.data();

        const saleId = counters.nextSaleId;
        let movementId = counters.nextMovementId;

        const batch = db.batch();

        // Agregar venta
        const sale = {
            ...saleData,
            id: saleId,
            date: new Date().toISOString(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const saleRef = db.collection(COLLECTIONS.SALES).doc(saleId.toString());
        batch.set(saleRef, sale);

        // Actualizar stock de productos
        for (const update of stockUpdates) {
            const productRef = db.collection(COLLECTIONS.PRODUCTS).doc(update.productId.toString());
            batch.update(productRef, {
                stock: update.newStock,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // Registrar movimientos de stock
        for (const movement of movements) {
            const movementData = {
                ...movement,
                id: movementId,
                date: new Date().toISOString(),
                notes: `Venta #${saleId}`
            };

            const movementRef = db.collection(COLLECTIONS.STOCK_MOVEMENTS).doc(movementId.toString());
            batch.set(movementRef, movementData);
            movementId++;
        }

        // Actualizar contadores
        batch.update(countersRef, {
            nextSaleId: saleId + 1,
            nextMovementId: movementId
        });

        await batch.commit();

        console.log('✅ Venta registrada:', saleId);
        return { success: true, saleId, sale };
    } catch (error) {
        console.error('❌ Error registrando venta:', error);
        return { success: false, error: error.message };
    }
}

// ==================== MOVIMIENTOS DE STOCK ====================

/**
 * Obtiene movimientos de stock
 */
async function getStockMovements() {
    try {
        const snapshot = await db.collection(COLLECTIONS.STOCK_MOVEMENTS)
            .orderBy('date', 'desc')
            .get();

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id
        }));
    } catch (error) {
        console.error('❌ Error obteniendo movimientos:', error);
        return [];
    }
}

/**
 * Registra un ajuste de stock
 */
async function addStockMovement(productId, movementData) {
    try {
        const countersRef = db.collection(COLLECTIONS.COUNTERS).doc('main');
        const countersDoc = await countersRef.get();
        const movementId = countersDoc.data().nextMovementId;

        const batch = db.batch();

        // Agregar movimiento
        const movement = {
            ...movementData,
            id: movementId,
            productId: productId,
            date: new Date().toISOString()
        };

        const movementRef = db.collection(COLLECTIONS.STOCK_MOVEMENTS).doc(movementId.toString());
        batch.set(movementRef, movement);

        // Actualizar stock del producto
        const productRef = db.collection(COLLECTIONS.PRODUCTS).doc(productId.toString());
        batch.update(productRef, {
            stock: movementData.newStock,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Actualizar contador
        batch.update(countersRef, {
            nextMovementId: movementId + 1
        });

        await batch.commit();

        console.log('✅ Movimiento registrado');
        return { success: true };
    } catch (error) {
        console.error('❌ Error registrando movimiento:', error);
        return { success: false, error: error.message };
    }
}

// ==================== CONFIGURACIÓN ====================

/**
 * Obtiene la configuración del sistema
 */
async function getSettings() {
    try {
        const doc = await db.collection(COLLECTIONS.SETTINGS).doc('main').get();

        if (doc.exists) {
            return doc.data();
        }

        return DEFAULT_SETTINGS;
    } catch (error) {
        console.error('❌ Error obteniendo configuración:', error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Guarda la configuración del sistema
 */
async function saveSettings(settingsData) {
    try {
        await db.collection(COLLECTIONS.SETTINGS).doc('main').set(settingsData, { merge: true });
        console.log('✅ Configuración guardada');
        return { success: true };
    } catch (error) {
        console.error('❌ Error guardando configuración:', error);
        return { success: false, error: error.message };
    }
}

// ==================== EXPORTAR/IMPORTAR ====================

/**
 * Exporta todos los datos
 */
async function exportAllData() {
    try {
        const [products, sales, movements, settings] = await Promise.all([
            getProducts(),
            getSales(),
            getStockMovements(),
            getSettings()
        ]);

        const countersDoc = await db.collection(COLLECTIONS.COUNTERS).doc('main').get();

        return {
            products,
            sales,
            stockMovements: movements,
            settings,
            counters: countersDoc.data(),
            exportDate: new Date().toISOString(),
            source: 'camil-candy-firebase'
        };
    } catch (error) {
        console.error('❌ Error exportando datos:', error);
        return null;
    }
}

/**
 * Limpia todos los datos (reset)
 */
async function clearAllData() {
    try {
        const batch = db.batch();

        // Eliminar todos los documentos de cada colección
        for (const collectionName of Object.values(COLLECTIONS)) {
            const snapshot = await db.collection(collectionName).get();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
        }

        await batch.commit();

        // Reinicializar datos
        await initializeDataIfEmpty();

        console.log('✅ Datos limpiados y reinicializados');
        return { success: true };
    } catch (error) {
        console.error('❌ Error limpiando datos:', error);
        return { success: false, error: error.message };
    }
}

// Exportar funciones para uso global
window.FirebaseService = {
    init: initializeFirebase,
    isReady: () => isFirebaseReady,

    // Productos
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,

    // Ventas
    getSales,
    addSale,

    // Movimientos
    getStockMovements,
    addStockMovement,

    // Configuración
    getSettings,
    saveSettings,

    // Utilidades
    exportAllData,
    clearAllData
};
