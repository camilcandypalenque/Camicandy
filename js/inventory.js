/**
 * Módulo de Inventario para Camil Candy POS
 * Maneja la gestión completa de productos
 */

// Variables del módulo
let products = [];
let settings = {};

/**
 * Inicializa el módulo de inventario
 */
async function initializeInventory() {
    await loadProductsData();
    setupInventoryEventListeners();
    console.log('✅ Módulo de inventario inicializado');
}

/**
 * Carga los datos de productos desde Firebase
 */
async function loadProductsData() {
    try {
        products = await FirebaseService.getProducts();
        settings = await FirebaseService.getSettings();
    } catch (error) {
        console.error('Error cargando productos:', error);
        products = [];
    }
}

/**
 * Configura los event listeners del inventario
 */
function setupInventoryEventListeners() {
    const addProductBtn = document.getElementById('addProductBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const importFileInput = document.getElementById('importFile');
    const resetDataBtn = document.getElementById('resetDataBtn');

    if (addProductBtn) {
        addProductBtn.addEventListener('click', handleAddProduct);
    }

    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', handleExportData);
    }

    if (importDataBtn) {
        importDataBtn.addEventListener('click', () => importFileInput?.click());
    }

    if (importFileInput) {
        importFileInput.addEventListener('change', handleImportData);
    }

    if (resetDataBtn) {
        resetDataBtn.addEventListener('click', handleResetData);
    }

    // Evento para tipo de costo
    const costTypeSelect = document.getElementById('costType');
    if (costTypeSelect) {
        costTypeSelect.addEventListener('change', () => {
            const batchGroup = document.getElementById('batchSizeGroup');
            if (batchGroup) {
                batchGroup.style.display = costTypeSelect.value === 'batch' ? 'block' : 'none';
            }
        });
    }

    // Evento para preview de caducidad
    const expirationInput = document.getElementById('expirationDate');
    if (expirationInput) {
        expirationInput.addEventListener('change', updateExpirationPreview);
    }
}

/**
 * Actualiza la vista previa de caducidad
 */
function updateExpirationPreview() {
    const dateInput = document.getElementById('expirationDate');
    const preview = document.getElementById('expirationPreview');
    if (!dateInput || !preview) return;

    if (!dateInput.value) {
        preview.innerHTML = '<small style="color: #888;"><i class="fas fa-info-circle"></i> Sin fecha de caducidad</small>';
        return;
    }

    const expDate = new Date(dateInput.value + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        preview.innerHTML = `<span style="color: #dc3545;"><i class="fas fa-skull-crossbones"></i> <strong>CADUCADO</strong> hace ${Math.abs(diffDays)} días</span>`;
    } else if (diffDays <= 15) {
        preview.innerHTML = `<span style="color: #ffc107;"><i class="fas fa-exclamation-triangle"></i> <strong>Caduca pronto:</strong> ${diffDays} días</span>`;
    } else {
        preview.innerHTML = `<span style="color: #28a745;"><i class="fas fa-check-circle"></i> Vigente por ${diffDays} días</span>`;
    }
}

/**
 * Busca un producto por ID de forma segura (maneja números y strings)
 * @param {number|string} productId - ID del producto a buscar
 * @returns {Object|null} El producto encontrado o null
 */
function findProductById(productId) {
    const numericId = parseInt(productId);
    return products.find(p =>
        p.id === productId ||
        p.id === numericId ||
        p.docId === String(productId)
    ) || null;
}

/**
 * Carga y muestra la tabla de productos
 */
async function loadProductsTable() {
    await loadProductsData();

    const productsTableBody = document.getElementById('productsTableBody');
    if (!productsTableBody) return;

    if (!products.length) {
        productsTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                    <p>No hay productos registrados. Agrega tu primer producto.</p>
                </td>
            </tr>
        `;
        return;
    }

    productsTableBody.innerHTML = '';

    products.forEach(product => {
        const statusClass = product.stock <= product.minStock ? 'inventory-low' : 'inventory-ok';
        const statusText = product.stock <= product.minStock ? 'BAJO' : 'OK';

        // Buscar la categoría de manera dinámica
        const category = productCategories.find(c => c.id === product.type);
        const badgeClass = product.type === 'concentrado' ? 'badge-concentrado' : 'badge-embolsado';
        const badgeText = category ? category.name : product.type;

        // Calcular badge de caducidad
        let expirationBadge = '';
        if (product.expirationDate) {
            const expDate = product.expirationDate.toDate ? product.expirationDate.toDate() : new Date(product.expirationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                expirationBadge = `<br><span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">☠️ CADUCADO</span>`;
            } else if (diffDays <= 15) {
                expirationBadge = `<br><span style="background: #ffc107; color: #333; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">⚠️ ${diffDays} días</span>`;
            }
        }

        // Generar ID único para el SVG del código de barras
        const barcodeId = `barcode-${product.id}`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td style="font-family: monospace; font-size: 0.8rem;">${product.barcode || '-'}</td>
            <td style="text-align: center; padding: 5px;">
                ${product.barcode ? `<div style="display: flex; justify-content: center;"><svg id="${barcodeId}" style="max-width: 120px; height: 40px;"></svg></div>` : '-'}
            </td>
            <td>${product.name}${expirationBadge}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>${settings.currencySymbol || '$'}${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.cost ? (settings.currencySymbol || '$') + parseFloat(product.cost).toFixed(2) : '-'}</td>
            <td class="${statusClass}">${product.stock}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>
                <button class="btn btn-warning" onclick="editProduct(${product.id})" style="padding: 5px 10px; font-size: 0.9rem;" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-primary" onclick="adjustStockModalOpen(${product.id})" style="padding: 5px 10px; font-size: 0.9rem;" title="Ajustar Stock">
                    <i class="fas fa-box"></i>
                </button>
                <button class="btn btn-success" onclick="generateProductLabel(${product.id})" style="padding: 5px 10px; font-size: 0.9rem;" title="Generar Etiqueta">
                    <i class="fas fa-tag"></i>
                </button>
                <button class="btn btn-danger" onclick="handleDeleteProduct(${product.id})" style="padding: 5px 10px; font-size: 0.9rem;" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        productsTableBody.appendChild(row);

        // Generar código de barras después de agregar al DOM
        if (product.barcode && typeof JsBarcode !== 'undefined') {
            try {
                JsBarcode(`#${barcodeId}`, product.barcode, {
                    format: "CODE128",
                    width: 1.5,
                    height: 35,
                    displayValue: false,
                    margin: 2
                });
            } catch (e) {
                console.warn('Error generando código de barras para:', product.barcode);
            }
        }
    });
}

/**
 * Maneja la adición de un nuevo producto
 */
async function handleAddProduct() {
    const name = document.getElementById('productName').value.trim();
    const type = document.getElementById('productType').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const costInput = document.getElementById('productCost').value;
    const cost = costInput ? parseFloat(costInput) : null; // Costo ahora es opcional
    const costType = document.getElementById('costType')?.value || 'unit';
    const batchSize = costType === 'batch' ? parseInt(document.getElementById('batchSize')?.value) : null;
    const stock = parseInt(document.getElementById('initialStock').value);
    const minStock = parseInt(document.getElementById('minStock').value);
    const expirationDate = document.getElementById('expirationDate')?.value || null;
    let barcode = document.getElementById('productBarcode').value.trim();

    // Validaciones
    if (!name) {
        alert('Por favor ingresa un nombre para el producto.');
        return;
    }

    if (isNaN(price) || price <= 0) {
        alert('Por favor ingresa un precio válido mayor a 0.');
        return;
    }

    // Costo es opcional, pero si se ingresa debe ser válido
    if (cost !== null && (isNaN(cost) || cost < 0)) {
        alert('Por favor ingresa un costo válido.');
        return;
    }

    if (isNaN(stock) || stock < 0) {
        alert('Por favor ingresa un inventario inicial válido.');
        return;
    }

    if (isNaN(minStock) || minStock < 0) {
        alert('Por favor ingresa un inventario mínimo válido.');
        return;
    }

    // Si no hay código de barras, generar uno
    if (!barcode) {
        barcode = await generateBarcodeForCategory(type);
    }

    UI.showLoading('Guardando producto...');

    try {
        const productData = {
            name,
            type,
            price,
            cost: cost || 0,
            costType,
            batchSize,
            stock,
            minStock,
            barcode,
            expirationDate: expirationDate ? new Date(expirationDate) : null
        };

        const result = await FirebaseService.addProduct(productData);

        if (result.success) {
            // Limpiar formulario
            document.getElementById('productName').value = '';
            document.getElementById('productPrice').value = '';
            document.getElementById('productCost').value = '';
            document.getElementById('initialStock').value = '';
            document.getElementById('minStock').value = '10';
            document.getElementById('productBarcode').value = '';
            if (document.getElementById('costType')) document.getElementById('costType').value = 'unit';
            if (document.getElementById('batchSize')) document.getElementById('batchSize').value = '';
            if (document.getElementById('batchSizeGroup')) document.getElementById('batchSizeGroup').style.display = 'none';
            if (document.getElementById('expirationDate')) document.getElementById('expirationDate').value = '';
            if (document.getElementById('expirationPreview')) document.getElementById('expirationPreview').innerHTML = '';

            // Actualizar tabla
            await loadProductsTable();

            UI.showNotification(`Producto "${name}" agregado exitosamente. Código: ${barcode}`, 'success');
        } else {
            alert('Error al guardar el producto: ' + result.error);
        }
    } catch (error) {
        console.error('Error agregando producto:', error);
        alert('Error al guardar el producto.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Edita un producto existente - Abre modal de edición
 */
function editProduct(productId) {
    const product = findProductById(productId);

    if (!product) {
        console.error('Producto no encontrado:', productId);
        alert('Error: Producto no encontrado.');
        return;
    }

    const editProductBody = document.getElementById('editProductBody');
    const editProductModal = document.getElementById('editProductModal');

    if (!editProductBody || !editProductModal) {
        console.error('Modal de edición no encontrado');
        alert('Error: Modal de edición no disponible.');
        return;
    }

    // Formatear fecha de caducidad si existe
    let expirationValue = '';
    if (product.expirationDate) {
        const expDate = product.expirationDate.toDate ? product.expirationDate.toDate() : new Date(product.expirationDate);
        expirationValue = expDate.toISOString().split('T')[0];
    }

    // Generar opciones de categorías
    let categoryOptions = '';
    productCategories.forEach(cat => {
        const selected = product.type === cat.id ? 'selected' : '';
        categoryOptions += `<option value="${cat.id}" ${selected}>${cat.name}</option>`;
    });

    editProductBody.innerHTML = `
        <p style="margin-bottom: 20px; color: #666;">
            <strong>ID:</strong> ${product.id} | 
            <strong>Código:</strong> ${product.barcode || 'Sin código'}
        </p>
        
        <div class="form-group">
            <label for="editProductName"><i class="fas fa-tag"></i> Nombre del Producto *</label>
            <input type="text" id="editProductName" class="form-control" value="${product.name}" 
                   style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; width: 100%;">
        </div>
        
        <div class="form-group">
            <label for="editProductType"><i class="fas fa-folder"></i> Tipo/Categoría</label>
            <select id="editProductType" class="form-control" 
                    style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; width: 100%;">
                ${categoryOptions}
            </select>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="form-group">
                <label for="editProductPrice"><i class="fas fa-dollar-sign"></i> Precio de Venta *</label>
                <input type="number" id="editProductPrice" class="form-control" value="${product.price}" 
                       min="0" step="0.01" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; width: 100%;">
            </div>
            <div class="form-group">
                <label for="editProductCost"><i class="fas fa-coins"></i> Costo (opcional)</label>
                <input type="number" id="editProductCost" class="form-control" value="${product.cost || ''}" 
                       min="0" step="0.01" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; width: 100%;">
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="form-group">
                <label for="editProductStock"><i class="fas fa-boxes"></i> Stock Actual</label>
                <input type="number" id="editProductStock" class="form-control" value="${product.stock}" 
                       readonly style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; width: 100%; background: #f5f5f5; cursor: not-allowed;">
                <small style="color: #888;">Usa el botón de ajuste de inventario para cambiar el stock</small>
            </div>
            <div class="form-group">
                <label for="editProductMinStock"><i class="fas fa-exclamation-triangle"></i> Stock Mínimo (Alerta)</label>
                <input type="number" id="editProductMinStock" class="form-control" value="${product.minStock}" 
                       min="0" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; width: 100%;">
            </div>
        </div>
        
        <div class="form-group">
            <label for="editProductExpiration"><i class="fas fa-calendar-alt"></i> Fecha de Caducidad (opcional)</label>
            <input type="date" id="editProductExpiration" class="form-control" value="${expirationValue}" 
                   style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; width: 100%;">
            <small style="color: #888;">Se mostrará alerta 15 días antes de caducar</small>
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 25px;">
            <button class="btn btn-success" id="saveEditProductBtn" style="flex: 1; padding: 15px; font-size: 1rem;">
                <i class="fas fa-save"></i> Guardar Cambios
            </button>
            <button class="btn btn-secondary" onclick="closeEditProductModal()" style="padding: 15px 20px;">
                <i class="fas fa-times"></i> Cancelar
            </button>
        </div>
    `;

    // Agregar event listener al botón de guardar
    setTimeout(() => {
        document.getElementById('saveEditProductBtn').addEventListener('click', () => saveProductChanges(productId));
    }, 100);

    // Mostrar modal
    editProductModal.classList.add('active');
}

/**
 * Cierra el modal de edición de producto
 */
function closeEditProductModal() {
    const editProductModal = document.getElementById('editProductModal');
    if (editProductModal) {
        editProductModal.classList.remove('active');
    }
}

/**
 * Guarda los cambios del producto editado
 */
async function saveProductChanges(productId) {
    const name = document.getElementById('editProductName').value.trim();
    const type = document.getElementById('editProductType').value;
    const price = parseFloat(document.getElementById('editProductPrice').value);
    const costInput = document.getElementById('editProductCost').value;
    const cost = costInput ? parseFloat(costInput) : null;
    const minStock = parseInt(document.getElementById('editProductMinStock').value);
    const expirationDate = document.getElementById('editProductExpiration').value || null;

    // Validaciones
    if (!name) {
        alert('Por favor ingresa un nombre para el producto.');
        return;
    }

    if (isNaN(price) || price <= 0) {
        alert('Por favor ingresa un precio válido mayor a 0.');
        return;
    }

    if (cost !== null && (isNaN(cost) || cost < 0)) {
        alert('Por favor ingresa un costo válido.');
        return;
    }

    if (isNaN(minStock) || minStock < 0) {
        alert('Por favor ingresa un inventario mínimo válido.');
        return;
    }

    UI.showLoading('Actualizando producto...');

    try {
        const updates = {
            name,
            type,
            price,
            cost: cost || 0,
            minStock,
            expirationDate: expirationDate ? new Date(expirationDate) : null
        };

        const result = await FirebaseService.updateProduct(productId, updates);

        if (result.success) {
            closeEditProductModal();
            await loadProductsTable();
            UI.showNotification(`Producto "${name}" actualizado exitosamente.`, 'success');
        } else {
            alert('Error al actualizar el producto: ' + (result.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error actualizando producto:', error);
        alert('Error al actualizar el producto.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Elimina un producto
 */
async function handleDeleteProduct(productId) {
    const product = findProductById(productId);
    if (!product) {
        console.error('Producto no encontrado para eliminar:', productId);
        alert('Error: Producto no encontrado.');
        return;
    }

    let confirmMessage = `¿Estás seguro de que deseas eliminar el producto "${product.name}"?`;
    if (product.stock > 0) {
        confirmMessage = `El producto "${product.name}" tiene ${product.stock} unidades en inventario. ¿Estás seguro de que deseas eliminarlo?`;
    }

    if (!confirm(confirmMessage)) return;

    UI.showLoading('Eliminando producto...');

    try {
        const result = await FirebaseService.deleteProduct(productId);

        if (result.success) {
            await loadProductsTable();
            if (typeof loadProductsForSale === 'function') {
                await loadProductsForSale();
            }
            UI.showNotification('Producto eliminado exitosamente.', 'success');
        } else {
            alert('Error al eliminar el producto.');
        }
    } catch (error) {
        console.error('Error eliminando producto:', error);
        alert('Error al eliminar el producto.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Abre el modal para ajustar stock
 */
function adjustStockModalOpen(productId) {
    const product = findProductById(productId);
    if (!product) {
        console.error('Producto no encontrado para ajustar stock:', productId);
        alert('Error: Producto no encontrado.');
        return;
    }

    const modalBody = document.getElementById('modalBody');
    const adjustStockModal = document.getElementById('adjustStockModal');

    modalBody.innerHTML = `
        <p><strong>Producto:</strong> ${product.name}</p>
        <p><strong>Stock actual:</strong> ${product.stock} unidades</p>
        <p><strong>Stock mínimo:</strong> ${product.minStock} unidades</p>
        
        <div class="form-group" style="margin-top: 20px;">
            <label for="adjustmentType">Tipo de ajuste</label>
            <select id="adjustmentType" class="form-control">
                <option value="entrada">Entrada (Aumentar stock)</option>
                <option value="salida">Salida (Disminuir stock)</option>
                <option value="ajuste">Ajuste manual</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="adjustmentQuantity">Cantidad</label>
            <input type="number" id="adjustmentQuantity" class="form-control" min="1" value="1">
        </div>
        
        <div class="form-group">
            <label for="adjustmentNotes">Notas (opcional)</label>
            <textarea id="adjustmentNotes" class="form-control" rows="3" placeholder="Motivo del ajuste..."></textarea>
        </div>
        
        <button class="btn btn-success" id="saveAdjustmentBtn" style="width: 100%; margin-top: 20px;">
            <i class="fas fa-save"></i> Guardar Ajuste
        </button>
    `;

    // Agregar event listener al botón de guardar
    setTimeout(() => {
        document.getElementById('saveAdjustmentBtn').addEventListener('click', () => adjustStock(productId));
    }, 100);

    adjustStockModal.classList.add('active');
}

/**
 * Ajusta el stock de un producto
 */
async function adjustStock(productId) {
    const adjustmentType = document.getElementById('adjustmentType').value;
    const quantity = parseInt(document.getElementById('adjustmentQuantity').value);
    const notes = document.getElementById('adjustmentNotes').value.trim();

    if (isNaN(quantity) || quantity <= 0) {
        alert('Por favor ingresa una cantidad válida mayor a 0.');
        return;
    }

    const product = findProductById(productId);
    if (!product) {
        console.error('Producto no encontrado para ajustar:', productId);
        alert('Error: Producto no encontrado.');
        return;
    }

    const previousStock = product.stock;
    let newStock = product.stock;

    if (adjustmentType === 'entrada') {
        newStock = product.stock + quantity;
    } else if (adjustmentType === 'salida') {
        if (quantity > product.stock) {
            alert(`No puedes retirar ${quantity} unidades. Solo hay ${product.stock} disponibles.`);
            return;
        }
        newStock = product.stock - quantity;
    } else if (adjustmentType === 'ajuste') {
        newStock = quantity;
    }

    UI.showLoading('Ajustando inventario...');

    try {
        const movementData = {
            productName: product.name,
            type: adjustmentType,
            quantity: Math.abs(newStock - previousStock),
            previousStock: previousStock,
            newStock: newStock,
            notes: notes || `Ajuste de inventario (${adjustmentType})`
        };

        const result = await FirebaseService.addStockMovement(productId, movementData);

        if (result.success) {
            document.getElementById('adjustStockModal').classList.remove('active');
            await loadProductsTable();
            if (typeof loadProductsForSale === 'function') {
                await loadProductsForSale();
            }
            UI.showNotification('Inventario actualizado exitosamente.', 'success');
        } else {
            alert('Error al ajustar el inventario.');
        }
    } catch (error) {
        console.error('Error ajustando stock:', error);
        alert('Error al ajustar el inventario.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Exporta los datos a JSON
 */
async function handleExportData() {
    UI.showLoading('Exportando datos...');

    try {
        const data = await FirebaseService.exportAllData();

        if (data) {
            const dataStr = JSON.stringify(data, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `candy_cami_backup_${new Date().toISOString().slice(0, 10)}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();

            UI.showNotification('Datos exportados exitosamente.', 'success');
        }
    } catch (error) {
        console.error('Error exportando datos:', error);
        alert('Error al exportar los datos.');
    } finally {
        UI.hideLoading();
    }
}

/**
 * Importa datos desde un archivo JSON
 */
async function handleImportData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function (e) {
        try {
            const importedData = JSON.parse(e.target.result);

            if (!importedData.products || !Array.isArray(importedData.products)) {
                throw new Error('El archivo no contiene datos válidos.');
            }

            if (confirm('¿Estás seguro de que deseas importar estos datos? Esto reemplazará todos los datos actuales.')) {
                UI.showLoading('Importando datos...');
                // TODO: Implementar importación completa a Firebase
                alert('Función de importación en desarrollo.');
                UI.hideLoading();
            }
        } catch (error) {
            console.error('Error importando datos:', error);
            alert('Error al importar datos: ' + error.message);
        }

        event.target.value = '';
    };

    reader.readAsText(file);
}

/**
 * Restablece los datos a los valores de ejemplo
 */
async function handleResetData() {
    if (!confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Esto eliminará todos los productos, ventas y movimientos.')) {
        return;
    }

    if (!confirm('¿ÚLTIMA OPORTUNIDAD? Se perderán todos los datos de productos y ventas.')) {
        return;
    }

    UI.showLoading('Restableciendo datos...');

    try {
        const result = await FirebaseService.clearAllData();

        if (result.success) {
            await loadProductsTable();
            if (typeof loadProductsForSale === 'function') {
                await loadProductsForSale();
            }
            UI.showNotification('Datos restablecidos exitosamente.', 'success');
        }
    } catch (error) {
        console.error('Error restableciendo datos:', error);
        alert('Error al restablecer los datos.');
    } finally {
        UI.hideLoading();
    }
}

// ==================== GENERACIÓN DE CÓDIGOS DE BARRAS ====================

// Prefijo de empresa (provisional - el usuario lo puede cambiar después)
const BARCODE_PREFIX = 'CAMI';

/**
 * Genera un código de barras provisional para el producto
 * Formato: CAMI-[CAT]-[NNNN]
 */
async function generateBarcodeForCategory(categoryId) {
    // Obtener abreviatura de categoría (máximo 3 caracteres)
    const category = productCategories.find(c => c.id === categoryId);
    let catAbbr = 'GEN'; // Por defecto "General"

    if (category) {
        // Tomar las primeras 3 consonantes o letras del nombre
        catAbbr = category.name
            .toUpperCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
            .replace(/[^A-Z]/g, '') // Solo letras
            .substring(0, 3);
    }

    // Contar productos existentes con esta categoría para el número secuencial
    const existingProducts = products.filter(p => p.type === categoryId);
    const nextNumber = existingProducts.length + 1;
    const paddedNumber = String(nextNumber).padStart(4, '0');

    return `${BARCODE_PREFIX}-${catAbbr}-${paddedNumber}`;
}

/**
 * Genera y muestra un código de barras en el campo del formulario
 */
async function generateBarcode() {
    const categoryId = document.getElementById('productType').value;
    const barcode = await generateBarcodeForCategory(categoryId);
    document.getElementById('productBarcode').value = barcode;
}

/**
 * Actualiza el código de barras cuando cambia la categoría
 */
function setupBarcodeAutoGenerate() {
    const typeSelect = document.getElementById('productType');
    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            // Solo generar si el campo está vacío o tiene un código provisional
            const barcodeField = document.getElementById('productBarcode');
            if (barcodeField && (!barcodeField.value || barcodeField.value.startsWith(BARCODE_PREFIX))) {
                generateBarcode();
            }
        });
    }
}

// Inicializar auto-generación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', setupBarcodeAutoGenerate);

// ==================== GESTIÓN DE CATEGORÍAS ====================

// Categorías por defecto
let productCategories = [
    { id: 'concentrado', name: 'Concentrado de Michelada', isDefault: true },
    { id: 'embolsado', name: 'Producto Embolsado', isDefault: true }
];

/**
 * Carga las categorías desde Firebase
 */
async function loadCategories() {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('settings').doc('categories').get();

        if (doc.exists && doc.data().list) {
            productCategories = doc.data().list;
        }

        updateCategorySelect();
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

/**
 * Actualiza el select de tipos de producto con las categorías
 */
function updateCategorySelect() {
    const select = document.getElementById('productType');
    if (!select) return;

    select.innerHTML = '';
    productCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}

/**
 * Abre el modal de gestión de categorías
 */
function openCategoryModal() {
    document.getElementById('categoryModal').classList.add('active');
    renderCategoryList();
}

/**
 * Cierra el modal de categorías
 */
function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
    document.getElementById('newCategoryName').value = '';
}

/**
 * Renderiza la lista de categorías en el modal
 */
function renderCategoryList() {
    const container = document.getElementById('categoryList');
    if (!container) return;

    if (productCategories.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">No hay categorías.</p>';
        return;
    }

    container.innerHTML = productCategories.map(cat => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8f9fa; border-radius: 8px; margin-bottom: 8px;">
            <span style="font-weight: 500;">
                ${cat.name}
                ${cat.isDefault ? '<small style="color: #888;">(Por defecto)</small>' : ''}
            </span>
            ${!cat.isDefault ? `
                <button onclick="deleteCategory('${cat.id}')" class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

/**
 * Agrega una nueva categoría
 */
async function addCategory() {
    const nameInput = document.getElementById('newCategoryName');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Por favor ingresa un nombre para la categoría.');
        return;
    }

    // Generar ID basado en el nombre
    const id = name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^a-z0-9]/g, '_'); // Solo letras, números y guiones bajos

    // Verificar si ya existe
    if (productCategories.find(c => c.id === id)) {
        alert('Ya existe una categoría con ese nombre.');
        return;
    }

    productCategories.push({ id, name, isDefault: false });

    // Guardar en Firebase
    try {
        const db = firebase.firestore();
        await db.collection('settings').doc('categories').set({
            list: productCategories
        });

        nameInput.value = '';
        renderCategoryList();
        updateCategorySelect();
        UI.showNotification(`Categoría "${name}" agregada.`, 'success');
    } catch (error) {
        console.error('Error guardando categoría:', error);
        alert('Error al guardar la categoría.');
    }
}

/**
 * Elimina una categoría
 */
async function deleteCategory(categoryId) {
    const category = productCategories.find(c => c.id === categoryId);
    if (!category) return;

    if (category.isDefault) {
        alert('No puedes eliminar las categorías por defecto.');
        return;
    }

    // Verificar si hay productos con esta categoría
    const productsWithCategory = products.filter(p => p.type === categoryId);
    if (productsWithCategory.length > 0) {
        alert(`No puedes eliminar esta categoría porque hay ${productsWithCategory.length} productos asociados a ella.`);
        return;
    }

    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return;

    productCategories = productCategories.filter(c => c.id !== categoryId);

    // Guardar en Firebase
    try {
        const db = firebase.firestore();
        await db.collection('settings').doc('categories').set({
            list: productCategories
        });

        renderCategoryList();
        updateCategorySelect();
        UI.showNotification('Categoría eliminada.', 'success');
    } catch (error) {
        console.error('Error eliminando categoría:', error);
        alert('Error al eliminar la categoría.');
    }
}

// Cargar categorías al inicializar
(async function () {
    await loadCategories();
})();

// Hacer funciones disponibles globalmente
window.initializeInventory = initializeInventory;
window.loadProductsTable = loadProductsTable;
window.editProduct = editProduct;
window.closeEditProductModal = closeEditProductModal;
window.saveProductChanges = saveProductChanges;
window.handleDeleteProduct = handleDeleteProduct;
window.adjustStockModalOpen = adjustStockModalOpen;
window.adjustStock = adjustStock;
window.getProducts = () => products;
window.getSettings = () => settings;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.addCategory = addCategory;
window.deleteCategory = deleteCategory;
window.generateBarcode = generateBarcode;
window.generateProductLabel = generateProductLabel;

/**
 * Genera etiquetas imprimibles para un producto
 * El número de etiquetas es igual al stock del producto
 */
function generateProductLabel(productId) {
    const product = findProductById(productId);

    if (!product) {
        alert('Producto no encontrado');
        return;
    }

    const quantity = product.stock || 1;

    // Preguntar cuántas etiquetas generar (sugerir el stock actual)
    const userQuantity = prompt(`¿Cuántas etiquetas deseas generar?\n\nStock actual: ${product.stock} unidades`, quantity);

    if (!userQuantity || isNaN(parseInt(userQuantity)) || parseInt(userQuantity) <= 0) {
        return;
    }

    const labelCount = parseInt(userQuantity);

    // Generar las etiquetas
    let labelsHTML = '';
    for (let i = 0; i < labelCount; i++) {
        labelsHTML += `
            <div class="label">
                <div class="label-header">
                    <span class="label-logo">🍬</span>
                    <span class="label-company">Camil Candy</span>
                </div>
                <div class="label-product">${product.name}</div>
                <div class="label-barcode">
                    <svg id="label-barcode-${i}"></svg>
                </div>
            </div>
        `;
    }

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Etiquetas - ${product.name}</title>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: Arial, sans-serif;
                    padding: 10px;
                    background: #f5f5f5;
                }
                .print-header {
                    text-align: center;
                    padding: 20px;
                    margin-bottom: 20px;
                    background: white;
                    border-radius: 10px;
                }
                .print-header h2 { color: #6a11cb; margin-bottom: 10px; }
                .print-header p { color: #666; }
                .print-btn {
                    background: linear-gradient(135deg, #ff6b8b, #6a11cb);
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    font-size: 1.1rem;
                    border-radius: 25px;
                    cursor: pointer;
                    margin: 10px;
                }
                .print-btn:hover { opacity: 0.9; }
                .labels-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    justify-content: center;
                }
                .label {
                    width: 200px;
                    height: 120px;
                    background: white;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    padding: 10px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    page-break-inside: avoid;
                }
                .label-header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                }
                .label-logo { font-size: 1.2rem; }
                .label-company { 
                    font-weight: bold; 
                    font-size: 0.9rem;
                    color: #6a11cb;
                }
                .label-product {
                    font-weight: bold;
                    font-size: 0.85rem;
                    color: #333;
                    margin: 5px 0;
                }
                .label-barcode svg {
                    max-width: 100%;
                    height: 30px;
                }
                .label-price {
                    font-weight: bold;
                    font-size: 1rem;
                    color: #ff6b8b;
                }
                @media print {
                    .print-header { display: none; }
                    body { background: white; padding: 0; }
                    .labels-container { gap: 5px; }
                    .label { 
                        border: 1px solid #ccc;
                        margin: 2px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h2>🏷️ Etiquetas de Producto</h2>
                <p><strong>${product.name}</strong> - ${labelCount} etiquetas</p>
                <button class="print-btn" onclick="window.print()">
                    🖨️ Imprimir Etiquetas
                </button>
                <button class="print-btn" onclick="window.close()" style="background: #6c757d;">
                    ❌ Cerrar
                </button>
            </div>
            <div class="labels-container">
                ${labelsHTML}
            </div>
            <script>
                // Generar códigos de barras
                window.onload = function() {
                    for (let i = 0; i < ${labelCount}; i++) {
                        try {
                            JsBarcode('#label-barcode-' + i, '${product.barcode || product.id}', {
                                format: "CODE128",
                                width: 1.5,
                                height: 30,
                                displayValue: false,
                                margin: 2
                            });
                        } catch(e) {
                            console.warn('Error en código de barras', i);
                        }
                    }
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
