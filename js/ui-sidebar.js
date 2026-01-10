/**
 * Módulo de UI Sidebar para Camil Candy POS
 * Maneja la navegación del sidebar y cambio de secciones
 */

// Variables del sidebar
let sidebarCollapsed = false;

/**
 * Inicializa el sidebar y la navegación
 */
function initializeSidebar() {
    setupSidebarToggle();
    setupMenuNavigation();
    console.log('✅ Sidebar inicializado');
}

/**
 * Configura el toggle del sidebar
 */
function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
}

/**
 * Alterna el estado colapsado del sidebar
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleIcon = document.getElementById('toggleIcon');

    sidebarCollapsed = !sidebarCollapsed;

    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('collapsed');
        toggleIcon.classList.remove('fa-chevron-left');
        toggleIcon.classList.add('fa-chevron-right');
    } else {
        sidebar.classList.remove('collapsed');
        mainContent.classList.remove('collapsed');
        toggleIcon.classList.remove('fa-chevron-right');
        toggleIcon.classList.add('fa-chevron-left');
    }
}

/**
 * Configura la navegación del menú
 */
function setupMenuNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            switchSection(section);
        });
    });
}

/**
 * Cambia a la sección especificada
 */
async function switchSection(section) {
    const menuItems = document.querySelectorAll('.menu-item');
    const contentSections = document.querySelectorAll('.content-section');

    // Remover clase active de todos los items del menú
    menuItems.forEach(item => {
        item.classList.remove('active');
    });

    // Remover clase active de todas las secciones
    contentSections.forEach(sec => {
        sec.classList.remove('active');
    });

    // Agregar clase active al item del menú seleccionado
    const selectedMenuItem = document.querySelector(`[data-section="${section}"]`);
    if (selectedMenuItem) {
        selectedMenuItem.classList.add('active');
    }

    // Mostrar la sección correspondiente
    const sectionElement = document.getElementById(`${section}Section`);
    if (sectionElement) {
        sectionElement.classList.add('active');

        // Actualizar título de la página
        updatePageTitle(section);

        // Cargar datos específicos de la sección
        await loadSectionData(section);
    }
}

/**
 * Actualiza el título de la página según la sección
 */
function updatePageTitle(section) {
    const pageTitle = document.getElementById('pageTitle');

    const titles = {
        'inventory': { icon: 'fa-boxes', text: 'Gestión de Inventario' },
        'pos': { icon: 'fa-cash-register', text: 'Punto de Venta' },
        'clients': { icon: 'fa-users', text: 'Cartelera de Clientes' },
        'routes': { icon: 'fa-route', text: 'Gestión de Rutas' },
        'expenses': { icon: 'fa-money-bill-wave', text: 'Control de Gastos' },
        'reports': { icon: 'fa-chart-bar', text: 'Reportes y Estadísticas' },
        'dashboard': { icon: 'fa-tachometer-alt', text: 'Dashboard' },
        'settings': { icon: 'fa-cog', text: 'Configuración' }
    };

    if (titles[section] && pageTitle) {
        pageTitle.innerHTML = `
            <i class="fas ${titles[section].icon}"></i>
            <span>${titles[section].text}</span>
        `;
    }
}

/**
 * Carga los datos específicos de cada sección
 */
async function loadSectionData(section) {
    try {
        switch (section) {
            case 'inventory':
                if (typeof loadProductsTable === 'function') {
                    await loadProductsTable();
                }
                break;
            case 'pos':
                if (typeof loadProductsForSale === 'function') {
                    await loadProductsForSale();
                }
                break;
            case 'reports':
                if (typeof loadReports === 'function') {
                    await loadReports();
                }
                break;
            case 'dashboard':
                if (typeof loadDashboard === 'function') {
                    await loadDashboard();
                }
                break;
            case 'settings':
                if (typeof loadSettingsForm === 'function') {
                    await loadSettingsForm();
                }
                break;
            case 'clients':
                if (typeof loadAdminClients === 'function') {
                    await loadAdminClients();
                }
                break;
            case 'routes':
                if (typeof loadAdminRoutes === 'function') {
                    await loadAdminRoutes();
                }
                break;
            case 'expenses':
                if (typeof loadAdminExpenses === 'function') {
                    await loadAdminExpenses();
                }
                break;
        }
    } catch (error) {
        console.error('Error cargando datos de sección:', error);
    }
}

/**
 * Muestra un mensaje de carga
 */
function showLoading(message = 'Cargando...') {
    let loadingOverlay = document.getElementById('loadingOverlay');

    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        document.body.appendChild(loadingOverlay);
    } else {
        loadingOverlay.querySelector('.loading-text').textContent = message;
        loadingOverlay.style.display = 'flex';
    }
}

/**
 * Oculta el mensaje de carga
 */
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Muestra una notificación temporal
 */
function showNotification(message, type = 'success') {
    // Crear contenedor de notificaciones si no existe
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 3000;
        `;
        document.body.appendChild(container);
    }

    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.style.cssText = `
        margin-bottom: 10px;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(notification);

    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Exportar funciones para uso global
window.UI = {
    initializeSidebar,
    toggleSidebar,
    switchSection,
    updatePageTitle,
    showLoading,
    hideLoading,
    showNotification
};
