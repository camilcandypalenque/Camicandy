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
        const badgeClass = product.type === 'concentrado' ? 'badge-concentrado' : 'badge-embolsado';
        const badgeText = product.type === 'concentrado' ? 'Concentrado' : 'Embolsado';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>${settings.currencySymbol || '$'}${parseFloat(product.price).toFixed(2)}</td>
            <td>${settings.currencySymbol || '$'}${parseFloat(product.cost).toFixed(2)}</td>
            <td class="${statusClass}">${product.stock}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>
                <button class="btn btn-warning" onclick="editProduct(${product.id})" style="padding: 5px 10px; font-size: 0.9rem;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-primary" onclick="adjustStockModalOpen(${product.id})" style="padding: 5px 10px; font-size: 0.9rem;">
                    <i class="fas fa-box"></i>
                </button>
                <button class="btn btn-danger" onclick="handleDeleteProduct(${product.id})" style="padding: 5px 10px; font-size: 0.9rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        productsTableBody.appendChild(row);
    });
}

/**
 * Maneja la adición de un nuevo producto
 */
async function handleAddProduct() {
    const name = document.getElementById('productName').value.trim();
    const type = document.getElementById('productType').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const cost = parseFloat(document.getElementById('productCost').value);
    const stock = parseInt(document.getElementById('initialStock').value);
    const minStock = parseInt(document.getElementById('minStock').value);

    // Validaciones
    if (!name) {
        alert('Por favor ingresa un nombre para el producto.');
        return;
    }

    if (isNaN(price) || price <= 0) {
        alert('Por favor ingresa un precio válido mayor a 0.');
        return;
    }

    if (isNaN(cost) || cost < 0) {
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

    UI.showLoading('Guardando producto...');

    try {
        const result = await FirebaseService.addProduct({
            name,
            type,
            price,
            cost,
            stock,
            minStock
        });

        if (result.success) {
            // Limpiar formulario
            document.getElementById('productName').value = '';
            document.getElementById('productPrice').value = '';
            document.getElementById('productCost').value = '';
            document.getElementById('initialStock').value = '';
            document.getElementById('minStock').value = '10';

            // Actualizar tabla
            await loadProductsTable();

            UI.showNotification(`Producto "${name}" agregado exitosamente.`, 'success');
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
 * Edita un producto existente
 */
async function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newName = prompt('Nuevo nombre del producto:', product.name);
    if (newName === null) return;

    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert('El nombre no puede estar vacío.');
        return;
    }

    UI.showLoading('Actualizando producto...');

    try {
        const result = await FirebaseService.updateProduct(productId, { name: trimmedName });

        if (result.success) {
            await loadProductsTable();
            UI.showNotification('Producto actualizado exitosamente.', 'success');
        } else {
            alert('Error al actualizar el producto.');
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
    const product = products.find(p => p.id === productId);
    if (!product) return;

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
    const product = products.find(p => p.id === productId);
    if (!product) return;

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

    const product = products.find(p => p.id === productId);
    if (!product) return;

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

// Hacer funciones disponibles globalmente
window.initializeInventory = initializeInventory;
window.loadProductsTable = loadProductsTable;
window.editProduct = editProduct;
window.handleDeleteProduct = handleDeleteProduct;
window.adjustStockModalOpen = adjustStockModalOpen;
window.adjustStock = adjustStock;
window.getProducts = () => products;
window.getSettings = () => settings;
