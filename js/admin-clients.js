/**
 * Módulo de Clientes, Rutas y Gastos para Admin - Camil Candy POS
 * Maneja la cartelera de clientes, gestión de rutas y control de gastos
 */

// Variables del módulo
let adminClients = [];
let adminRoutes = [];
let adminExpenses = [];

// ==================== INICIALIZACIÓN ====================

/**
 * Inicializa los módulos de admin
 */
async function initializeAdminModules() {
    console.log('📋 Inicializando módulos de admin...');

    try {
        // Cargar rutas
        await loadAdminRoutes();

        // Cargar clientes
        await loadAdminClients();

        // Cargar gastos
        await loadAdminExpenses();

        // Configurar eventos
        setupAdminEvents();

        // Establecer fecha por defecto para gastos
        const expenseDateInput = document.getElementById('expenseDate');
        if (expenseDateInput) {
            expenseDateInput.value = new Date().toISOString().split('T')[0];
        }

        console.log('✅ Módulos de admin inicializados');
    } catch (error) {
        console.error('❌ Error inicializando módulos de admin:', error);
    }
}

// ==================== CLIENTES ====================

/**
 * Carga los clientes desde Firebase
 */
async function loadAdminClients() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('clients').orderBy('businessName').get();

        adminClients = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`👥 ${adminClients.length} clientes cargados en admin`);

        renderAdminClientsTable();
        updateClientsStats();

    } catch (error) {
        console.error('Error cargando clientes:', error);
        adminClients = [];
    }
}

/**
 * Renderiza la tabla de clientes
 */
function renderAdminClientsTable() {
    const tbody = document.getElementById('adminClientsTableBody');
    if (!tbody) return;

    const searchQuery = document.getElementById('adminClientSearch')?.value?.toLowerCase() || '';
    const routeFilter = document.getElementById('adminRouteFilter')?.value || '';

    let filteredClients = adminClients;

    // Filtrar por búsqueda
    if (searchQuery) {
        filteredClients = filteredClients.filter(c =>
            c.businessName?.toLowerCase().includes(searchQuery) ||
            c.ownerName?.toLowerCase().includes(searchQuery) ||
            c.phone?.includes(searchQuery)
        );
    }

    // Filtrar por ruta
    if (routeFilter) {
        filteredClients = filteredClients.filter(c => c.routeId === routeFilter);
    }

    if (filteredClients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-users" style="font-size: 2rem; color: #ddd; display: block; margin-bottom: 10px;"></i>
                    No hay clientes${routeFilter ? ' en esta ruta' : ''}
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    filteredClients.forEach(client => {
        const route = adminRoutes.find(r => r.id === client.routeId);
        const routeName = route ? route.name : '<span style="color: #999;">Sin ruta</span>';
        const creditBadge = client.hasCredit && client.creditAmount > 0
            ? `<span style="background: #dc3545; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">$${client.creditAmount.toFixed(2)}</span>`
            : '<span style="color: #28a745;">✓ Sin deuda</span>';

        html += `
            <tr>
                <td>
                    <strong><i class="fas fa-store" style="color: #ff6b8b;"></i> ${client.businessName}</strong>
                    ${client.reference ? `<br><small style="color: #888;">${client.reference}</small>` : ''}
                </td>
                <td>${client.ownerName || '-'}</td>
                <td>
                    ${client.phone
                ? `<a href="tel:${client.phone}" style="color: #28a745;"><i class="fas fa-phone"></i> ${client.phone}</a>`
                : '-'}
                </td>
                <td><span style="background: #f0f0f0; padding: 3px 8px; border-radius: 4px;"><i class="fas fa-route"></i> ${routeName}</span></td>
                <td><small>${client.address || '-'}</small></td>
                <td>${creditBadge}</td>
                <td>
                    <button class="btn btn-info" onclick="editAdminClient('${client.id}')" style="padding: 5px 10px; margin: 2px;" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteAdminClient('${client.id}')" style="padding: 5px 10px; margin: 2px;" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * Actualiza las estadísticas de clientes
 */
function updateClientsStats() {
    // Total clientes
    const totalEl = document.getElementById('totalClientsCount');
    if (totalEl) totalEl.textContent = adminClients.length;

    // Con crédito
    const clientsWithCredit = adminClients.filter(c => c.hasCredit && c.creditAmount > 0);
    const creditCountEl = document.getElementById('clientsWithCreditCount');
    if (creditCountEl) creditCountEl.textContent = clientsWithCredit.length;

    const totalCredit = clientsWithCredit.reduce((sum, c) => sum + (c.creditAmount || 0), 0);
    const creditAmountEl = document.getElementById('totalCreditAmount');
    if (creditAmountEl) creditAmountEl.textContent = `$${totalCredit.toFixed(2)}`;

    // Rutas activas
    const uniqueRoutes = new Set(adminClients.map(c => c.routeId).filter(Boolean));
    const routesEl = document.getElementById('activeRoutesCount');
    if (routesEl) routesEl.textContent = uniqueRoutes.size;

    // Nuevos este mes
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = adminClients.filter(c => {
        if (!c.createdAt) return false;
        const createdDate = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return createdDate >= startOfMonth;
    });
    const newMonthEl = document.getElementById('newClientsMonth');
    if (newMonthEl) newMonthEl.textContent = newThisMonth.length;
}

/**
 * Abre el modal de cliente para admin
 */
function openAdminClientModal(clientId = null) {
    // Crear modal si no existe
    let modal = document.getElementById('adminClientModal');
    if (!modal) {
        modal = createAdminClientModal();
        document.body.appendChild(modal);
    }

    // Limpiar formulario
    document.getElementById('adminEditClientId').value = clientId || '';
    document.getElementById('adminClientBusinessName').value = '';
    document.getElementById('adminClientOwnerName').value = '';
    document.getElementById('adminClientPhone').value = '';
    document.getElementById('adminClientRoute').value = '';
    document.getElementById('adminClientAddress').value = '';
    document.getElementById('adminClientReference').value = '';
    document.getElementById('adminClientNotes').value = '';

    // Popular select de rutas
    const routeSelect = document.getElementById('adminClientRoute');
    if (routeSelect) {
        routeSelect.innerHTML = '<option value="">-- Seleccionar Ruta --</option>';
        adminRoutes.filter(r => r.isActive !== false).forEach(route => {
            routeSelect.innerHTML += `<option value="${route.id}">${route.name}</option>`;
        });
    }

    document.getElementById('adminClientModalTitle').textContent = clientId ? 'Editar Cliente' : 'Nuevo Cliente';

    modal.style.display = 'flex';
}

/**
 * Crea el modal de cliente para admin
 */
function createAdminClientModal() {
    const modal = document.createElement('div');
    modal.id = 'adminClientModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;';

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 id="adminClientModalTitle" style="margin: 0; color: #333;"><i class="fas fa-user-plus"></i> Nuevo Cliente</h3>
                <button onclick="closeAdminClientModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;">&times;</button>
            </div>
            
            <input type="hidden" id="adminEditClientId">
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;"><i class="fas fa-store"></i> Nombre del Local *</label>
                <input type="text" id="adminClientBusinessName" placeholder="Ej: Tienda Don Pedro" style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;"><i class="fas fa-user"></i> Nombre del Dueño</label>
                <input type="text" id="adminClientOwnerName" placeholder="Ej: Pedro López" style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;"><i class="fas fa-phone"></i> Teléfono</label>
                <input type="tel" id="adminClientPhone" placeholder="Ej: 963 123 4567" style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;"><i class="fas fa-route"></i> Ruta *</label>
                <select id="adminClientRoute" style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
                    <option value="">-- Seleccionar Ruta --</option>
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;"><i class="fas fa-map-marker-alt"></i> Dirección</label>
                <input type="text" id="adminClientAddress" placeholder="Ej: Calle Principal #123" style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;"><i class="fas fa-info-circle"></i> Referencia</label>
                <input type="text" id="adminClientReference" placeholder="Ej: Frente a la iglesia" style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;"><i class="fas fa-sticky-note"></i> Notas</label>
                <textarea id="adminClientNotes" placeholder="Notas adicionales..." rows="2" style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem; resize: vertical;"></textarea>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="closeAdminClientModal()" class="btn btn-secondary" style="flex: 1; padding: 12px;">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button onclick="saveAdminClient()" class="btn btn-primary" style="flex: 1; padding: 12px;">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </div>
    `;

    return modal;
}

/**
 * Cierra el modal de cliente
 */
function closeAdminClientModal() {
    const modal = document.getElementById('adminClientModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Edita un cliente existente
 */
function editAdminClient(clientId) {
    const client = adminClients.find(c => c.id === clientId);
    if (!client) return;

    openAdminClientModal(clientId);

    setTimeout(() => {
        document.getElementById('adminClientBusinessName').value = client.businessName || '';
        document.getElementById('adminClientOwnerName').value = client.ownerName || '';
        document.getElementById('adminClientPhone').value = client.phone || '';
        document.getElementById('adminClientRoute').value = client.routeId || '';
        document.getElementById('adminClientAddress').value = client.address || '';
        document.getElementById('adminClientReference').value = client.reference || '';
        document.getElementById('adminClientNotes').value = client.notes || '';
    }, 100);
}

/**
 * Guarda un cliente (nuevo o editado)
 */
async function saveAdminClient() {
    const editId = document.getElementById('adminEditClientId').value;
    const businessName = document.getElementById('adminClientBusinessName').value.trim();
    const ownerName = document.getElementById('adminClientOwnerName').value.trim();
    const phone = document.getElementById('adminClientPhone').value.trim();
    const routeId = document.getElementById('adminClientRoute').value;
    const address = document.getElementById('adminClientAddress').value.trim();
    const reference = document.getElementById('adminClientReference').value.trim();
    const notes = document.getElementById('adminClientNotes').value.trim();

    if (!businessName) {
        UI.showNotification('El nombre del local es obligatorio', 'error');
        return;
    }

    if (!routeId) {
        UI.showNotification('Selecciona una ruta', 'error');
        return;
    }

    try {
        const db = firebase.firestore();
        const clientData = {
            businessName,
            ownerName,
            phone,
            routeId,
            address,
            reference,
            notes,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (editId) {
            await db.collection('clients').doc(editId).update(clientData);
            UI.showNotification('✅ Cliente actualizado', 'success');
        } else {
            clientData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            clientData.createdBy = 'admin';
            clientData.totalPurchases = 0;
            clientData.purchaseCount = 0;
            clientData.hasCredit = false;
            clientData.creditAmount = 0;

            await db.collection('clients').add(clientData);
            UI.showNotification('✅ Cliente creado', 'success');
        }

        closeAdminClientModal();
        await loadAdminClients();

    } catch (error) {
        console.error('Error guardando cliente:', error);
        UI.showNotification('❌ Error al guardar cliente', 'error');
    }
}

/**
 * Elimina un cliente
 */
async function deleteAdminClient(clientId) {
    if (!confirm('¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.')) return;

    try {
        const db = firebase.firestore();
        await db.collection('clients').doc(clientId).delete();

        UI.showNotification('🗑️ Cliente eliminado', 'success');
        await loadAdminClients();

    } catch (error) {
        console.error('Error eliminando cliente:', error);
        UI.showNotification('❌ Error al eliminar cliente', 'error');
    }
}

// ==================== RUTAS ====================

/**
 * Carga las rutas desde Firebase
 */
async function loadAdminRoutes() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('routes').get();

        if (snapshot.empty) {
            // Crear rutas por defecto
            const defaultRoutes = [
                { id: 'comitan', name: 'Comitán', description: 'Zona Comitán de Domínguez' },
                { id: 'palenque', name: 'Palenque', description: 'Zona Palenque' },
                { id: 'tenozique', name: 'Tenozique', description: 'Zona Tenozique' },
                { id: 'salto_de_agua', name: 'Salto de Agua', description: 'Zona Salto de Agua' },
                { id: 'trinitaria', name: 'Trinitaria', description: 'Zona La Trinitaria' },
                { id: 'comalapa', name: 'Comalapa', description: 'Zona Comalapa' },
                { id: 'chicomuselo', name: 'Chicomuselo', description: 'Zona Chicomuselo' },
                { id: 'tzimol', name: 'Tzimol', description: 'Zona Tzimol' },
                { id: 'margaritas', name: 'Margaritas', description: 'Zona Las Margaritas' }
            ];

            for (const route of defaultRoutes) {
                await db.collection('routes').doc(route.id).set({
                    ...route,
                    isActive: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            adminRoutes = defaultRoutes.map(r => ({ ...r, isActive: true }));
        } else {
            adminRoutes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

        console.log(`📍 ${adminRoutes.length} rutas cargadas`);

        renderRoutesList();
        populateRouteFilters();

    } catch (error) {
        console.error('Error cargando rutas:', error);
        adminRoutes = [];
    }
}

/**
 * Renderiza la lista de rutas
 */
function renderRoutesList() {
    const container = document.getElementById('routesList');
    if (!container) return;

    if (adminRoutes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; grid-column: 1 / -1;">
                <i class="fas fa-route" style="font-size: 3rem; color: #ddd;"></i>
                <p style="margin-top: 15px;">No hay rutas configuradas</p>
            </div>
        `;
        return;
    }

    let html = '';
    adminRoutes.forEach(route => {
        const clientsInRoute = adminClients.filter(c => c.routeId === route.id).length;
        const statusBadge = route.isActive !== false
            ? '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">Activa</span>'
            : '<span style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">Inactiva</span>';

        html += `
            <div style="background: white; padding: 20px; border-radius: var(--border-radius); box-shadow: var(--shadow); border-left: 4px solid #ff6b8b;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #333;">
                        <i class="fas fa-map-marker-alt" style="color: #ff6b8b;"></i> ${route.name}
                    </h4>
                    ${statusBadge}
                </div>
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 15px;">${route.description || 'Sin descripción'}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #888; font-size: 0.85rem;">
                        <i class="fas fa-users"></i> ${clientsInRoute} clientes
                    </span>
                    <div>
                        <button class="btn btn-info" onclick="editRoute('${route.id}')" style="padding: 5px 10px; margin: 2px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-${route.isActive !== false ? 'warning' : 'success'}" onclick="toggleRoute('${route.id}')" style="padding: 5px 10px; margin: 2px;" title="${route.isActive !== false ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${route.isActive !== false ? 'pause' : 'play'}"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Popula los filtros de rutas
 */
function populateRouteFilters() {
    const selects = ['adminRouteFilter', 'expenseRoute'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const firstOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);

        adminRoutes.filter(r => r.isActive !== false).forEach(route => {
            const option = document.createElement('option');
            option.value = route.id;
            option.textContent = route.name;
            select.appendChild(option);
        });
    });
}

/**
 * Abre el modal de ruta
 */
function openRouteModal(routeId = null) {
    const existing = routeId ? adminRoutes.find(r => r.id === routeId) : null;

    const name = prompt('Nombre de la ruta:', existing?.name || '');
    if (!name) return;

    const description = prompt('Descripción (opcional):', existing?.description || '');

    saveRoute(routeId, name.trim(), description?.trim() || '');
}

/**
 * Edita una ruta
 */
function editRoute(routeId) {
    openRouteModal(routeId);
}

/**
 * Guarda una ruta
 */
async function saveRoute(routeId, name, description) {
    try {
        const db = firebase.firestore();
        const id = routeId || name.toLowerCase().replace(/\s+/g, '_');

        await db.collection('routes').doc(id).set({
            id,
            name,
            description,
            isActive: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        UI.showNotification('✅ Ruta guardada', 'success');
        await loadAdminRoutes();

    } catch (error) {
        console.error('Error guardando ruta:', error);
        UI.showNotification('❌ Error al guardar ruta', 'error');
    }
}

/**
 * Activa/Desactiva una ruta
 */
async function toggleRoute(routeId) {
    try {
        const route = adminRoutes.find(r => r.id === routeId);
        if (!route) return;

        const db = firebase.firestore();
        await db.collection('routes').doc(routeId).update({
            isActive: route.isActive === false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        UI.showNotification(route.isActive !== false ? '⏸️ Ruta desactivada' : '▶️ Ruta activada', 'success');
        await loadAdminRoutes();

    } catch (error) {
        console.error('Error actualizando ruta:', error);
        UI.showNotification('❌ Error al actualizar ruta', 'error');
    }
}

// ==================== GASTOS ====================

/**
 * Carga los gastos desde Firebase
 */
async function loadAdminExpenses() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('expenses')
            .orderBy('date', 'desc')
            .limit(100)
            .get();

        adminExpenses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`💰 ${adminExpenses.length} gastos cargados`);

        renderExpensesTable();
        updateExpensesStats();

    } catch (error) {
        console.error('Error cargando gastos:', error);
        adminExpenses = [];
    }
}

/**
 * Renderiza la tabla de gastos
 */
function renderExpensesTable() {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;

    if (adminExpenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-money-bill-wave" style="font-size: 2rem; color: #ddd; display: block; margin-bottom: 10px;"></i>
                    No hay gastos registrados
                </td>
            </tr>
        `;
        return;
    }

    const categoryLabels = {
        'envios': '📦 Envíos',
        'gasolina': '⛽ Gasolina',
        'bolsas': '🛍️ Bolsas/Empaque',
        'sellos': '🎯 Sellos/Etiquetas',
        'sueldos': '💰 Sueldos',
        'otros': '📋 Otros'
    };

    let html = '';
    adminExpenses.slice(0, 50).forEach(expense => {
        const date = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
        const route = expense.routeId ? adminRoutes.find(r => r.id === expense.routeId) : null;

        html += `
            <tr>
                <td>${date.toLocaleDateString('es-MX')}</td>
                <td>${categoryLabels[expense.category] || expense.category}</td>
                <td>${expense.description || '-'}</td>
                <td>${route ? route.name : '-'}</td>
                <td style="color: #dc3545; font-weight: bold;">-$${expense.amount.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteExpense('${expense.id}')" style="padding: 5px 10px;" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * Actualiza las estadísticas de gastos
 */
function updateExpensesStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Gastos de hoy
    const todayExpenses = adminExpenses.filter(e => {
        const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return date >= today;
    });
    const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const todayEl = document.getElementById('expensesToday');
    if (todayEl) todayEl.textContent = `$${todayTotal.toFixed(2)}`;

    const todayCountEl = document.getElementById('expensesTodayCount');
    if (todayCountEl) todayCountEl.textContent = `${todayExpenses.length} registros`;

    // Gastos del mes
    const monthExpenses = adminExpenses.filter(e => {
        const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return date >= startOfMonth;
    });
    const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const monthEl = document.getElementById('expensesMonth');
    if (monthEl) monthEl.textContent = `$${monthTotal.toFixed(2)}`;

    const monthCountEl = document.getElementById('expensesMonthCount');
    if (monthCountEl) monthCountEl.textContent = `${monthExpenses.length} registros`;

    // Gasolina del mes
    const gasExpenses = monthExpenses.filter(e => e.category === 'gasolina');
    const gasTotal = gasExpenses.reduce((sum, e) => sum + e.amount, 0);
    const gasEl = document.getElementById('expensesGas');
    if (gasEl) gasEl.textContent = `$${gasTotal.toFixed(2)}`;

    // Sueldos del mes
    const salaryExpenses = monthExpenses.filter(e => e.category === 'sueldos');
    const salaryTotal = salaryExpenses.reduce((sum, e) => sum + e.amount, 0);
    const salaryEl = document.getElementById('expensesSalary');
    if (salaryEl) salaryEl.textContent = `$${salaryTotal.toFixed(2)}`;
}

/**
 * Guarda un nuevo gasto
 */
async function saveExpense() {
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const dateInput = document.getElementById('expenseDate').value;
    const routeId = document.getElementById('expenseRoute').value;
    const description = document.getElementById('expenseDescription').value.trim();

    if (!category) {
        UI.showNotification('Selecciona una categoría', 'error');
        return;
    }

    if (!amount || amount <= 0) {
        UI.showNotification('Ingresa un monto válido', 'error');
        return;
    }

    try {
        const db = firebase.firestore();

        await db.collection('expenses').add({
            category,
            amount,
            date: dateInput ? new Date(dateInput) : new Date(),
            routeId: routeId || null,
            description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Limpiar formulario
        document.getElementById('expenseCategory').value = '';
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseRoute').value = '';
        document.getElementById('expenseDescription').value = '';

        UI.showNotification('✅ Gasto registrado', 'success');
        await loadAdminExpenses();

    } catch (error) {
        console.error('Error guardando gasto:', error);
        UI.showNotification('❌ Error al guardar gasto', 'error');
    }
}

/**
 * Elimina un gasto
 */
async function deleteExpense(expenseId) {
    if (!confirm('¿Eliminar este gasto?')) return;

    try {
        const db = firebase.firestore();
        await db.collection('expenses').doc(expenseId).delete();

        UI.showNotification('🗑️ Gasto eliminado', 'success');
        await loadAdminExpenses();

    } catch (error) {
        console.error('Error eliminando gasto:', error);
        UI.showNotification('❌ Error al eliminar gasto', 'error');
    }
}

// ==================== EVENTOS ====================

/**
 * Configura los eventos del módulo
 */
function setupAdminEvents() {
    // Búsqueda de clientes
    const searchInput = document.getElementById('adminClientSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchInput.searchTimeout);
            searchInput.searchTimeout = setTimeout(renderAdminClientsTable, 300);
        });
    }

    // Filtro de rutas
    const routeFilter = document.getElementById('adminRouteFilter');
    if (routeFilter) {
        routeFilter.addEventListener('change', renderAdminClientsTable);
    }
}

// ==================== EXPORTAR FUNCIONES ====================

window.openAdminClientModal = openAdminClientModal;
window.closeAdminClientModal = closeAdminClientModal;
window.saveAdminClient = saveAdminClient;
window.editAdminClient = editAdminClient;
window.deleteAdminClient = deleteAdminClient;
window.openRouteModal = openRouteModal;
window.editRoute = editRoute;
window.toggleRoute = toggleRoute;
window.saveExpense = saveExpense;
window.deleteExpense = deleteExpense;
window.initializeAdminModules = initializeAdminModules;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Firebase esté listo
    setTimeout(initializeAdminModules, 1000);
});
