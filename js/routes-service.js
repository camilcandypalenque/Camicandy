/**
 * Servicio de Rutas para Camil Candy POS
 * Maneja las rutas de distribución y sus precios específicos
 */

// Rutas por defecto
const DEFAULT_ROUTES = [
    { id: 'comitan', name: 'Comitán', description: 'Zona Comitán de Domínguez', isActive: true },
    { id: 'palenque', name: 'Palenque', description: 'Zona Palenque', isActive: true },
    { id: 'tenozique', name: 'Tenozique', description: 'Zona Tenozique', isActive: true },
    { id: 'salto_de_agua', name: 'Salto de Agua', description: 'Zona Salto de Agua', isActive: true },
    { id: 'trinitaria', name: 'Trinitaria', description: 'Zona La Trinitaria', isActive: true },
    { id: 'comalapa', name: 'Comalapa', description: 'Zona Comalapa', isActive: true },
    { id: 'chicomuselo', name: 'Chicomuselo', description: 'Zona Chicomuselo', isActive: true },
    { id: 'tzimol', name: 'Tzimol', description: 'Zona Tzimol', isActive: true },
    { id: 'margaritas', name: 'Margaritas', description: 'Zona Las Margaritas', isActive: true }
];

// Variables del módulo
let routes = [];

/**
 * Inicializa las rutas desde Firebase
 */
async function initializeRoutes() {
    try {
        const snapshot = await db.collection('routes').get();

        if (snapshot.empty) {
            // Inicializar con rutas por defecto
            console.log('🛣️ Inicializando rutas por defecto...');
            for (const route of DEFAULT_ROUTES) {
                await db.collection('routes').doc(route.id).set({
                    ...route,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            routes = [...DEFAULT_ROUTES];
        } else {
            routes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

        console.log(`✅ ${routes.length} rutas cargadas`);
        return routes;
    } catch (error) {
        console.error('❌ Error cargando rutas:', error);
        routes = [...DEFAULT_ROUTES];
        return routes;
    }
}

/**
 * Obtiene todas las rutas activas
 */
async function getRoutes() {
    if (routes.length === 0) {
        await initializeRoutes();
    }
    return routes.filter(r => r.isActive);
}

/**
 * Obtiene una ruta por su ID
 */
async function getRouteById(routeId) {
    if (routes.length === 0) {
        await initializeRoutes();
    }
    return routes.find(r => r.id === routeId);
}

/**
 * Agrega una nueva ruta
 */
async function addRoute(routeData) {
    try {
        const routeId = routeData.id || routeData.name.toLowerCase().replace(/\s+/g, '_');

        const newRoute = {
            id: routeId,
            name: routeData.name,
            description: routeData.description || '',
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('routes').doc(routeId).set(newRoute);
        routes.push({ ...newRoute, createdAt: new Date() });

        console.log('✅ Ruta agregada:', routeId);
        return { success: true, id: routeId };
    } catch (error) {
        console.error('❌ Error agregando ruta:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza una ruta existente
 */
async function updateRoute(routeId, updates) {
    try {
        await db.collection('routes').doc(routeId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const index = routes.findIndex(r => r.id === routeId);
        if (index !== -1) {
            routes[index] = { ...routes[index], ...updates };
        }

        console.log('✅ Ruta actualizada:', routeId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error actualizando ruta:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Desactiva una ruta (no la elimina)
 */
async function deactivateRoute(routeId) {
    return updateRoute(routeId, { isActive: false });
}

/**
 * Obtiene el precio de un producto para una ruta específica
 * Si no hay precio específico, retorna el precio base del producto
 */
function getProductPriceForRoute(product, routeId) {
    // Si el producto tiene precios por ruta, usar ese
    if (product.routePrices && product.routePrices[routeId]) {
        return product.routePrices[routeId];
    }
    // Retornar precio base
    return product.price;
}

/**
 * Establece el precio de un producto para una ruta específica
 */
async function setProductRoutePrice(productId, routeId, price) {
    try {
        const productRef = db.collection('products').doc(productId);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
            return { success: false, error: 'Producto no encontrado' };
        }

        const currentRoutePrices = productDoc.data().routePrices || {};
        currentRoutePrices[routeId] = parseFloat(price);

        await productRef.update({
            routePrices: currentRoutePrices,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Precio de ruta ${routeId} establecido para producto ${productId}: $${price}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error estableciendo precio de ruta:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Elimina el precio específico de una ruta para un producto
 */
async function removeProductRoutePrice(productId, routeId) {
    try {
        const productRef = db.collection('products').doc(productId);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
            return { success: false, error: 'Producto no encontrado' };
        }

        const currentRoutePrices = productDoc.data().routePrices || {};
        delete currentRoutePrices[routeId];

        await productRef.update({
            routePrices: currentRoutePrices,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Precio de ruta ${routeId} eliminado para producto ${productId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error eliminando precio de ruta:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Renderiza un select de rutas
 */
function renderRoutesSelect(selectId, selectedRouteId = null, includeAllOption = true) {
    const select = document.getElementById(selectId);
    if (!select) return;

    let html = '';

    if (includeAllOption) {
        html += '<option value="">-- Seleccionar Ruta --</option>';
    }

    routes.filter(r => r.isActive).forEach(route => {
        const selected = route.id === selectedRouteId ? 'selected' : '';
        html += `<option value="${route.id}" ${selected}>${route.name}</option>`;
    });

    select.innerHTML = html;
}

// Exportar funciones globalmente
window.RoutesService = {
    init: initializeRoutes,
    getAll: getRoutes,
    getById: getRouteById,
    add: addRoute,
    update: updateRoute,
    deactivate: deactivateRoute,
    getProductPrice: getProductPriceForRoute,
    setProductPrice: setProductRoutePrice,
    removeProductPrice: removeProductRoutePrice,
    renderSelect: renderRoutesSelect,
    DEFAULT_ROUTES
};
