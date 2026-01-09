/**
 * Archivo principal de inicialización para Camil Candy POS
 * Coordina la carga de todos los módulos
 */

/**
 * Inicializa la aplicación completa
 */
async function initializeApp() {
    console.log('🍬 Iniciando Camil Candy POS...');

    // Mostrar loading inicial
    showInitialLoading();

    try {
        // 1. Inicializar Firebase
        console.log('📡 Conectando con Firebase...');
        const firebaseReady = await FirebaseService.init();

        if (!firebaseReady) {
            throw new Error('No se pudo conectar con Firebase');
        }

        // 2. Inicializar UI del sidebar
        console.log('🎨 Inicializando interfaz...');
        UI.initializeSidebar();

        // 3. Inicializar módulos
        console.log('📦 Cargando módulos...');
        await initializeInventory();
        initializePOS();
        initializeReports();
        initializeDashboard();
        initializeSettings();
        setupStorageRefreshButton();

        // 4. Cargar datos iniciales
        console.log('📊 Cargando datos iniciales...');
        await loadProductsTable();

        // 5. Ocultar loading
        hideInitialLoading();

        console.log('✅ Camil Candy POS iniciado correctamente');

        // Mostrar notificación de bienvenida
        setTimeout(() => {
            UI.showNotification('¡Bienvenido a Candy Cami POS!', 'success');
        }, 500);

    } catch (error) {
        console.error('❌ Error iniciando la aplicación:', error);
        hideInitialLoading();
        showErrorMessage(error.message);
    }
}

/**
 * Muestra el loading inicial
 */
function showInitialLoading() {
    const loadingHTML = `
        <div id="initialLoading" class="loading-overlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">Cargando Candy Cami POS...</div>
            <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                Conectando con Firebase...
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

/**
 * Oculta el loading inicial
 */
function hideInitialLoading() {
    const loading = document.getElementById('initialLoading');
    if (loading) {
        loading.style.opacity = '0';
        setTimeout(() => loading.remove(), 300);
    }
}

/**
 * Muestra un mensaje de error
 */
function showErrorMessage(message) {
    const errorHTML = `
        <div id="errorMessage" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            z-index: 9999;
            max-width: 400px;
        ">
            <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #dc3545; margin-bottom: 20px;"></i>
            <h2 style="color: #333; margin-bottom: 10px;">Error de Conexión</h2>
            <p style="color: #666; margin-bottom: 20px;">${message}</p>
            <button onclick="location.reload()" class="btn btn-primary">
                <i class="fas fa-redo"></i> Reintentar
            </button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', errorHTML);
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

// Manejar errores globales
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error('Error global:', msg, url, lineNo, columnNo, error);
    return false;
};

// Manejar promesas rechazadas
window.addEventListener('unhandledrejection', function (event) {
    console.error('Promesa rechazada:', event.reason);
});
