/**
 * Módulo de Configuración para Camil Candy POS
 * Maneja la configuración del sistema
 */

/**
 * Inicializa el módulo de configuración
 */
function initializeSettings() {
    setupSettingsEventListeners();
    console.log('✅ Módulo de configuración inicializado');
}

/**
 * Configura los event listeners de configuración
 */
function setupSettingsEventListeners() {
    const saveBusinessInfoBtn = document.getElementById('saveBusinessInfoBtn');
    const saveSalesSettingsBtn = document.getElementById('saveSalesSettingsBtn');
    const saveAppearanceBtn = document.getElementById('saveAppearanceBtn');
    const exportAllDataBtn = document.getElementById('exportAllDataBtn');
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');
    const closeStockModal = document.getElementById('closeStockModal');
    const closeSaleDetailModal = document.getElementById('closeSaleDetailModal');

    if (saveBusinessInfoBtn) {
        saveBusinessInfoBtn.addEventListener('click', saveBusinessInfo);
    }

    if (saveSalesSettingsBtn) {
        saveSalesSettingsBtn.addEventListener('click', saveSalesSettings);
    }

    if (saveAppearanceBtn) {
        saveAppearanceBtn.addEventListener('click', saveAppearance);
    }

    if (exportAllDataBtn) {
        exportAllDataBtn.addEventListener('click', exportAllData);
    }

    if (clearAllDataBtn) {
        clearAllDataBtn.addEventListener('click', clearAllData);
    }

    // Configurar cierre de modales
    if (closeStockModal) {
        closeStockModal.addEventListener('click', () => {
            document.getElementById('adjustStockModal')?.classList.remove('active');
        });
    }

    if (closeSaleDetailModal) {
        closeSaleDetailModal.addEventListener('click', () => {
            document.getElementById('saleDetailModal')?.classList.remove('active');
        });
    }

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        const adjustStockModal = document.getElementById('adjustStockModal');
        const saleDetailModal = document.getElementById('saleDetailModal');

        if (e.target === adjustStockModal) {
            adjustStockModal.classList.remove('active');
        }
        if (e.target === saleDetailModal) {
            saleDetailModal.classList.remove('active');
        }
    });
}

/**
 * Carga el formulario de configuración
 */
async function loadSettingsForm() {
    const settings = await FirebaseService.getSettings();

    // Información del negocio
    const businessName = document.getElementById('businessName');
    const businessAddress = document.getElementById('businessAddress');
    const businessPhone = document.getElementById('businessPhone');

    if (businessName) businessName.value = settings.businessName || '';
    if (businessAddress) businessAddress.value = settings.businessAddress || '';
    if (businessPhone) businessPhone.value = settings.businessPhone || '';

    // Configuración de ventas
    const taxRate = document.getElementById('taxRate');
    const currencySymbol = document.getElementById('currencySymbol');
    const receiptFooter = document.getElementById('receiptFooter');

    if (taxRate) taxRate.value = settings.taxRate || 16;
    if (currencySymbol) currencySymbol.value = settings.currencySymbol || '$';
    if (receiptFooter) receiptFooter.value = settings.receiptFooter || '';

    // Apariencia
    const themeColor = document.getElementById('themeColor');
    const language = document.getElementById('language');
    const darkMode = document.getElementById('darkMode');

    if (themeColor) themeColor.value = settings.themeColor || 'default';
    if (language) language.value = settings.language || 'es';
    if (darkMode) darkMode.checked = settings.darkMode || false;

    // Actualizar info de almacenamiento
    updateStorageInfo();
}

/**
 * Guarda la información del negocio
 */
async function saveBusinessInfo() {
    const businessName = document.getElementById('businessName')?.value || '';
    const businessAddress = document.getElementById('businessAddress')?.value || '';
    const businessPhone = document.getElementById('businessPhone')?.value || '';

    UI.showLoading('Guardando...');

    try {
        const result = await FirebaseService.saveSettings({
            businessName,
            businessAddress,
            businessPhone
        });

        if (result.success) {
            UI.showNotification('Información del negocio guardada exitosamente.', 'success');
        }
    } catch (error) {
        console.error('Error guardando info del negocio:', error);
        alert('Error al guardar la información.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Guarda la configuración de ventas
 */
async function saveSalesSettings() {
    const taxRate = parseFloat(document.getElementById('taxRate')?.value) || 0;
    const currencySymbol = document.getElementById('currencySymbol')?.value || '$';
    const receiptFooter = document.getElementById('receiptFooter')?.value || '';

    UI.showLoading('Guardando...');

    try {
        const result = await FirebaseService.saveSettings({
            taxRate,
            currencySymbol,
            receiptFooter
        });

        if (result.success) {
            UI.showNotification('Configuración de ventas guardada exitosamente.', 'success');
        }
    } catch (error) {
        console.error('Error guardando config de ventas:', error);
        alert('Error al guardar la configuración.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Guarda la configuración de apariencia
 */
async function saveAppearance() {
    const themeColor = document.getElementById('themeColor')?.value || 'default';
    const language = document.getElementById('language')?.value || 'es';
    const darkMode = document.getElementById('darkMode')?.checked || false;

    UI.showLoading('Guardando...');

    try {
        const result = await FirebaseService.saveSettings({
            themeColor,
            language,
            darkMode
        });

        if (result.success) {
            UI.showNotification('Configuración de apariencia guardada. Recarga la página para ver los cambios.', 'success');
        }
    } catch (error) {
        console.error('Error guardando apariencia:', error);
        alert('Error al guardar la apariencia.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Exporta todos los datos del sistema
 */
async function exportAllData() {
    UI.showLoading('Exportando todos los datos...');

    try {
        const data = await FirebaseService.exportAllData();

        if (data) {
            const dataStr = JSON.stringify(data, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `candy_cami_complete_backup_${new Date().toISOString().slice(0, 10)}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();

            UI.showNotification('Todos los datos exportados exitosamente.', 'success');
        }
    } catch (error) {
        console.error('Error exportando datos:', error);
        alert('Error al exportar los datos.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Limpia todos los datos del sistema
 */
async function clearAllData() {
    if (!confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Esto eliminará TODOS los datos incluyendo productos, ventas, movimientos y configuración.')) {
        return;
    }

    if (!confirm('¿ÚLTIMA OPORTUNIDAD? Esto no se puede deshacer.')) {
        return;
    }

    UI.showLoading('Limpiando datos...');

    try {
        const result = await FirebaseService.clearAllData();

        if (result.success) {
            // Recargar todos los datos
            if (typeof loadProductsTable === 'function') {
                await loadProductsTable();
            }
            if (typeof loadProductsForSale === 'function') {
                await loadProductsForSale();
            }
            await loadSettingsForm();

            UI.showNotification('Todos los datos han sido eliminados y restablecidos.', 'success');
        }
    } catch (error) {
        console.error('Error limpiando datos:', error);
        alert('Error al limpiar los datos.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Actualiza la información de almacenamiento con datos reales
 */
async function updateStorageInfo() {
    // Tamaños estimados por tipo de documento (en bytes)
    const PRODUCT_SIZE = 500;      // ~500 bytes por producto
    const SALE_SIZE = 1500;        // ~1.5 KB por venta (incluye detalles)
    const MOVEMENT_SIZE = 300;     // ~300 bytes por movimiento
    const SETTINGS_SIZE = 500;     // ~500 bytes para configuración
    const FIREBASE_LIMIT = 1073741824; // 1 GB en bytes

    try {
        const db = firebase.firestore();

        // Contar documentos de cada colección
        const [productsSnap, salesSnap, movementsSnap] = await Promise.all([
            db.collection('products').get(),
            db.collection('sales').get(),
            db.collection('movements').get()
        ]);

        const productsCount = productsSnap.size;
        const salesCount = salesSnap.size;
        const movementsCount = movementsSnap.size;

        // Calcular tamaños estimados
        const productsBytes = productsCount * PRODUCT_SIZE;
        const salesBytes = salesCount * SALE_SIZE;
        const movementsBytes = movementsCount * MOVEMENT_SIZE;
        const totalBytes = productsBytes + salesBytes + movementsBytes + SETTINGS_SIZE;

        // Calcular porcentaje
        const percentUsed = (totalBytes / FIREBASE_LIMIT) * 100;

        // Actualizar UI
        const storagePercentText = document.getElementById('storagePercentText');
        const storageBar = document.getElementById('storageBar');
        const storageUsedText = document.getElementById('storageUsedText');
        const storageProductsCount = document.getElementById('storageProductsCount');
        const storageProductsSize = document.getElementById('storageProductsSize');
        const storageSalesCount = document.getElementById('storageSalesCount');
        const storageSalesSize = document.getElementById('storageSalesSize');
        const storageMovementsCount = document.getElementById('storageMovementsCount');
        const storageMovementsSize = document.getElementById('storageMovementsSize');
        const storageTotalSize = document.getElementById('storageTotalSize');

        // Formatear tamaños
        const formatSize = (bytes) => {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        };

        if (storagePercentText) {
            storagePercentText.textContent = `${percentUsed.toFixed(3)}%`;
            // Cambiar color según el uso
            if (percentUsed < 50) {
                storagePercentText.style.color = 'var(--success-color)';
            } else if (percentUsed < 80) {
                storagePercentText.style.color = 'var(--warning-color)';
            } else {
                storagePercentText.style.color = 'var(--danger-color)';
            }
        }

        if (storageBar) {
            // Mínimo 1% para que sea visible, máximo 100%
            storageBar.style.width = `${Math.max(1, Math.min(percentUsed, 100))}%`;
            if (percentUsed < 50) {
                storageBar.style.background = 'linear-gradient(90deg, var(--success-color), #5cb85c)';
            } else if (percentUsed < 80) {
                storageBar.style.background = 'linear-gradient(90deg, var(--warning-color), #ffda44)';
            } else {
                storageBar.style.background = 'linear-gradient(90deg, var(--danger-color), #ff6b6b)';
            }
        }

        if (storageUsedText) {
            storageUsedText.textContent = `${formatSize(totalBytes)} usados de 1 GB`;
        }

        if (storageProductsCount) storageProductsCount.textContent = productsCount;
        if (storageProductsSize) storageProductsSize.textContent = `~${formatSize(productsBytes)}`;
        if (storageSalesCount) storageSalesCount.textContent = salesCount;
        if (storageSalesSize) storageSalesSize.textContent = `~${formatSize(salesBytes)}`;
        if (storageMovementsCount) storageMovementsCount.textContent = movementsCount;
        if (storageMovementsSize) storageMovementsSize.textContent = `~${formatSize(movementsBytes)}`;
        if (storageTotalSize) storageTotalSize.textContent = formatSize(totalBytes);

        console.log('📊 Estadísticas de almacenamiento actualizadas');

    } catch (error) {
        console.error('Error actualizando info de almacenamiento:', error);
        const storageUsedText = document.getElementById('storageUsedText');
        if (storageUsedText) {
            storageUsedText.textContent = 'Error al calcular';
        }
    }
}

/**
 * Configura el botón de actualizar almacenamiento
 */
function setupStorageRefreshButton() {
    const refreshBtn = document.getElementById('refreshStorageBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            await updateStorageInfo();
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Estadísticas';
        });
    }
}

// Hacer funciones disponibles globalmente
window.initializeSettings = initializeSettings;
window.loadSettingsForm = loadSettingsForm;
window.saveBusinessInfo = saveBusinessInfo;
window.saveSalesSettings = saveSalesSettings;
window.saveAppearance = saveAppearance;
window.updateStorageInfo = updateStorageInfo;
window.setupStorageRefreshButton = setupStorageRefreshButton;
