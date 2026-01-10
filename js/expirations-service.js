/**
 * Servicio de Caducidades para Camil Candy POS
 * Maneja alertas de productos próximos a caducar
 */

// Configuración de alertas
const EXPIRATION_CONFIG = {
    DAYS_WARNING: 15,      // Días antes de caducar para mostrar alerta
    DAYS_CRITICAL: 7,      // Días críticos (alerta roja)
    DAYS_URGENT: 3         // Días urgentes (alerta muy crítica)
};

/**
 * Obtiene productos próximos a caducar
 */
async function getExpiringProducts(daysAhead = EXPIRATION_CONFIG.DAYS_WARNING) {
    try {
        const products = await FirebaseService.getProducts();
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + daysAhead);

        const expiringProducts = products.filter(product => {
            if (!product.expirationDate) return false;

            const expDate = product.expirationDate?.toDate
                ? product.expirationDate.toDate()
                : new Date(product.expirationDate);

            return expDate <= futureDate && expDate >= now;
        });

        // Ordenar por fecha de caducidad (más próximos primero)
        expiringProducts.sort((a, b) => {
            const dateA = a.expirationDate?.toDate ? a.expirationDate.toDate() : new Date(a.expirationDate);
            const dateB = b.expirationDate?.toDate ? b.expirationDate.toDate() : new Date(b.expirationDate);
            return dateA - dateB;
        });

        return expiringProducts;
    } catch (error) {
        console.error('❌ Error obteniendo productos por caducar:', error);
        return [];
    }
}

/**
 * Obtiene productos ya caducados
 */
async function getExpiredProducts() {
    try {
        const products = await FirebaseService.getProducts();
        const now = new Date();

        const expiredProducts = products.filter(product => {
            if (!product.expirationDate) return false;

            const expDate = product.expirationDate?.toDate
                ? product.expirationDate.toDate()
                : new Date(product.expirationDate);

            return expDate < now;
        });

        return expiredProducts;
    } catch (error) {
        console.error('❌ Error obteniendo productos caducados:', error);
        return [];
    }
}

/**
 * Calcula los días restantes hasta la caducidad
 */
function getDaysUntilExpiration(expirationDate) {
    if (!expirationDate) return null;

    const expDate = expirationDate?.toDate
        ? expirationDate.toDate()
        : new Date(expirationDate);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * Obtiene el nivel de alerta para un producto
 */
function getAlertLevel(expirationDate) {
    const daysLeft = getDaysUntilExpiration(expirationDate);

    if (daysLeft === null) return 'none';
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= EXPIRATION_CONFIG.DAYS_URGENT) return 'urgent';
    if (daysLeft <= EXPIRATION_CONFIG.DAYS_CRITICAL) return 'critical';
    if (daysLeft <= EXPIRATION_CONFIG.DAYS_WARNING) return 'warning';

    return 'ok';
}

/**
 * Obtiene el color del badge según el nivel de alerta
 */
function getAlertColor(alertLevel) {
    const colors = {
        'expired': '#6c757d',    // Gris (caducado)
        'urgent': '#dc3545',     // Rojo (urgente)
        'critical': '#fd7e14',   // Naranja (crítico)
        'warning': '#ffc107',    // Amarillo (advertencia)
        'ok': '#28a745',         // Verde (OK)
        'none': '#6c757d'        // Gris (sin fecha)
    };
    return colors[alertLevel] || colors.none;
}

/**
 * Obtiene el texto del badge según el nivel de alerta
 */
function getAlertText(expirationDate) {
    const daysLeft = getDaysUntilExpiration(expirationDate);
    const alertLevel = getAlertLevel(expirationDate);

    if (daysLeft === null) return 'Sin fecha';
    if (daysLeft < 0) return `Caducado hace ${Math.abs(daysLeft)} días`;
    if (daysLeft === 0) return '¡Caduca HOY!';
    if (daysLeft === 1) return '¡Caduca MAÑANA!';
    if (daysLeft <= EXPIRATION_CONFIG.DAYS_WARNING) return `Caduca en ${daysLeft} días`;

    return `Caduca en ${daysLeft} días`;
}

/**
 * Genera un badge HTML para la caducidad
 */
function generateExpirationBadge(expirationDate) {
    const alertLevel = getAlertLevel(expirationDate);
    const color = getAlertColor(alertLevel);
    const text = getAlertText(expirationDate);

    const icons = {
        'expired': 'fa-times-circle',
        'urgent': 'fa-exclamation-triangle',
        'critical': 'fa-exclamation-circle',
        'warning': 'fa-clock',
        'ok': 'fa-check-circle',
        'none': 'fa-question-circle'
    };

    return `
        <span class="expiration-badge" style="
            background-color: ${color}20;
            color: ${color};
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        ">
            <i class="fas ${icons[alertLevel]}"></i>
            ${text}
        </span>
    `;
}

/**
 * Obtiene resumen de caducidades
 */
async function getExpirationsSummary() {
    const products = await FirebaseService.getProducts();

    let expired = 0;
    let urgent = 0;
    let critical = 0;
    let warning = 0;
    let ok = 0;
    let noDate = 0;

    products.forEach(product => {
        const level = getAlertLevel(product.expirationDate);
        switch (level) {
            case 'expired': expired++; break;
            case 'urgent': urgent++; break;
            case 'critical': critical++; break;
            case 'warning': warning++; break;
            case 'ok': ok++; break;
            case 'none': noDate++; break;
        }
    });

    return {
        expired,
        urgent,
        critical,
        warning,
        ok,
        noDate,
        totalWithDate: products.length - noDate,
        needsAttention: expired + urgent + critical + warning
    };
}

/**
 * Renderiza el widget de caducidades para el dashboard
 */
async function renderExpirationsWidget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const expiringProducts = await getExpiringProducts();
    const expiredProducts = await getExpiredProducts();
    const allAlertProducts = [...expiredProducts, ...expiringProducts];

    if (allAlertProducts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #28a745;">
                <i class="fas fa-check-circle" style="font-size: 2rem;"></i>
                <p style="margin-top: 10px;">No hay productos próximos a caducar</p>
            </div>
        `;
        return;
    }

    let html = '<div class="expirations-list">';

    allAlertProducts.slice(0, 10).forEach(product => {
        const daysLeft = getDaysUntilExpiration(product.expirationDate);
        const color = getAlertColor(getAlertLevel(product.expirationDate));
        const expDate = product.expirationDate?.toDate
            ? product.expirationDate.toDate()
            : new Date(product.expirationDate);

        html += `
            <div class="expiration-item" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-left: 4px solid ${color};
                background: ${color}10;
                margin-bottom: 8px;
                border-radius: 4px;
            ">
                <div>
                    <strong>${product.name}</strong>
                    <br>
                    <small style="color: #666;">
                        Caduca: ${expDate.toLocaleDateString('es-MX')}
                        | Stock: ${product.stock}
                    </small>
                </div>
                <div style="text-align: right;">
                    ${generateExpirationBadge(product.expirationDate)}
                </div>
            </div>
        `;
    });

    if (allAlertProducts.length > 10) {
        html += `
            <div style="text-align: center; padding: 10px;">
                <small style="color: #666;">
                    ... y ${allAlertProducts.length - 10} productos más
                </small>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Muestra una notificación si hay productos por caducar
 */
async function checkAndNotifyExpirations() {
    const summary = await getExpirationsSummary();

    if (summary.expired > 0) {
        UI.showNotification(
            `⚠️ ${summary.expired} producto(s) ya caducaron`,
            'error'
        );
    } else if (summary.urgent > 0) {
        UI.showNotification(
            `⏰ ${summary.urgent} producto(s) caducan en menos de 3 días`,
            'warning'
        );
    } else if (summary.critical > 0 || summary.warning > 0) {
        UI.showNotification(
            `📅 ${summary.needsAttention} producto(s) próximos a caducar`,
            'info'
        );
    }
}

// Exportar funciones globalmente
window.ExpirationsService = {
    getExpiring: getExpiringProducts,
    getExpired: getExpiredProducts,
    getDaysUntil: getDaysUntilExpiration,
    getAlertLevel,
    getAlertColor,
    getAlertText,
    generateBadge: generateExpirationBadge,
    getSummary: getExpirationsSummary,
    renderWidget: renderExpirationsWidget,
    checkAndNotify: checkAndNotifyExpirations,
    CONFIG: EXPIRATION_CONFIG
};
