/**
 * Servicio de Clientes para Camil Candy POS
 * Maneja la cartelera de clientes (CRM básico)
 */

// Variables del módulo
let clients = [];

/**
 * Inicializa los clientes desde Firebase
 */
async function initializeClients() {
    try {
        const snapshot = await db.collection('clients').orderBy('businessName').get();

        clients = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ ${clients.length} clientes cargados`);
        return clients;
    } catch (error) {
        console.error('❌ Error cargando clientes:', error);
        clients = [];
        return clients;
    }
}

/**
 * Obtiene todos los clientes
 */
async function getClients() {
    if (clients.length === 0) {
        await initializeClients();
    }
    return clients;
}

/**
 * Obtiene clientes por ruta
 */
async function getClientsByRoute(routeId) {
    if (clients.length === 0) {
        await initializeClients();
    }
    return clients.filter(c => c.routeId === routeId);
}

/**
 * Obtiene un cliente por su ID
 */
async function getClientById(clientId) {
    if (clients.length === 0) {
        await initializeClients();
    }
    return clients.find(c => c.id === clientId);
}

/**
 * Busca clientes por nombre o teléfono
 */
async function searchClients(query) {
    if (clients.length === 0) {
        await initializeClients();
    }

    const searchTerm = query.toLowerCase().trim();
    return clients.filter(c =>
        c.businessName.toLowerCase().includes(searchTerm) ||
        c.ownerName.toLowerCase().includes(searchTerm) ||
        (c.phone && c.phone.includes(searchTerm))
    );
}

/**
 * Agrega un nuevo cliente
 */
async function addClient(clientData) {
    try {
        // Validar campos obligatorios
        if (!clientData.businessName || !clientData.routeId) {
            return { success: false, error: 'Nombre del local y ruta son obligatorios' };
        }

        const newClient = {
            businessName: clientData.businessName.trim(),
            ownerName: clientData.ownerName?.trim() || '',
            phone: clientData.phone?.trim() || '',
            address: clientData.address?.trim() || '',
            routeId: clientData.routeId,
            reference: clientData.reference?.trim() || '',
            notes: clientData.notes?.trim() || '',
            totalPurchases: 0,
            purchaseCount: 0,
            lastPurchaseDate: null,
            hasCredit: false,
            creditAmount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: clientData.createdBy || 'admin'
        };

        const docRef = await db.collection('clients').add(newClient);

        const clientWithId = {
            id: docRef.id,
            ...newClient,
            createdAt: new Date()
        };
        clients.push(clientWithId);

        console.log('✅ Cliente agregado:', docRef.id);
        return { success: true, id: docRef.id, client: clientWithId };
    } catch (error) {
        console.error('❌ Error agregando cliente:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza un cliente existente
 */
async function updateClient(clientId, updates) {
    try {
        await db.collection('clients').doc(clientId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const index = clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            clients[index] = { ...clients[index], ...updates };
        }

        console.log('✅ Cliente actualizado:', clientId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error actualizando cliente:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Elimina un cliente
 */
async function deleteClient(clientId) {
    try {
        await db.collection('clients').doc(clientId).delete();

        const index = clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            clients.splice(index, 1);
        }

        console.log('✅ Cliente eliminado:', clientId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error eliminando cliente:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Registra una compra del cliente
 */
async function registerClientPurchase(clientId, saleTotal, saleId) {
    try {
        const client = await getClientById(clientId);
        if (!client) {
            return { success: false, error: 'Cliente no encontrado' };
        }

        const updates = {
            totalPurchases: (client.totalPurchases || 0) + saleTotal,
            purchaseCount: (client.purchaseCount || 0) + 1,
            lastPurchaseDate: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('clients').doc(clientId).update(updates);

        const index = clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            clients[index] = {
                ...clients[index],
                ...updates,
                lastPurchaseDate: new Date()
            };
        }

        console.log(`✅ Compra registrada para cliente ${clientId}: $${saleTotal}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error registrando compra:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Registra crédito para un cliente
 */
async function addClientCredit(clientId, amount) {
    try {
        const client = await getClientById(clientId);
        if (!client) {
            return { success: false, error: 'Cliente no encontrado' };
        }

        const newCreditAmount = (client.creditAmount || 0) + amount;

        await db.collection('clients').doc(clientId).update({
            hasCredit: newCreditAmount > 0,
            creditAmount: newCreditAmount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const index = clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            clients[index].hasCredit = newCreditAmount > 0;
            clients[index].creditAmount = newCreditAmount;
        }

        console.log(`✅ Crédito agregado para cliente ${clientId}: $${amount}`);
        return { success: true, newCreditAmount };
    } catch (error) {
        console.error('❌ Error agregando crédito:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reduce crédito de un cliente (pago)
 */
async function reduceClientCredit(clientId, amount) {
    try {
        const client = await getClientById(clientId);
        if (!client) {
            return { success: false, error: 'Cliente no encontrado' };
        }

        const newCreditAmount = Math.max(0, (client.creditAmount || 0) - amount);

        await db.collection('clients').doc(clientId).update({
            hasCredit: newCreditAmount > 0,
            creditAmount: newCreditAmount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const index = clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            clients[index].hasCredit = newCreditAmount > 0;
            clients[index].creditAmount = newCreditAmount;
        }

        console.log(`✅ Crédito reducido para cliente ${clientId}: -$${amount}`);
        return { success: true, newCreditAmount };
    } catch (error) {
        console.error('❌ Error reduciendo crédito:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene clientes con crédito pendiente
 */
async function getClientsWithCredit() {
    if (clients.length === 0) {
        await initializeClients();
    }
    return clients.filter(c => c.hasCredit && c.creditAmount > 0);
}

/**
 * Renderiza un select de clientes
 */
function renderClientsSelect(selectId, routeId = null, selectedClientId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    let filteredClients = routeId
        ? clients.filter(c => c.routeId === routeId)
        : clients;

    let html = '<option value="">-- Seleccionar Cliente --</option>';
    html += '<option value="new">➕ Nuevo Cliente...</option>';

    filteredClients.forEach(client => {
        const selected = client.id === selectedClientId ? 'selected' : '';
        const creditBadge = client.hasCredit ? ' 💳' : '';
        html += `<option value="${client.id}" ${selected}>${client.businessName}${creditBadge}</option>`;
    });

    select.innerHTML = html;
}

/**
 * Formatea los datos de un cliente para mostrar
 */
function formatClientInfo(client) {
    if (!client) return '';

    return `
        <div class="client-info-card">
            <h4><i class="fas fa-store"></i> ${client.businessName}</h4>
            <p><i class="fas fa-user"></i> ${client.ownerName || 'Sin nombre'}</p>
            <p><i class="fas fa-phone"></i> ${client.phone || 'Sin teléfono'}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${client.address || 'Sin dirección'}</p>
            ${client.reference ? `<p><i class="fas fa-info-circle"></i> ${client.reference}</p>` : ''}
            ${client.hasCredit ? `<p class="credit-warning"><i class="fas fa-exclamation-triangle"></i> Crédito: $${client.creditAmount.toFixed(2)}</p>` : ''}
        </div>
    `;
}

// Exportar funciones globalmente
window.ClientsService = {
    init: initializeClients,
    getAll: getClients,
    getByRoute: getClientsByRoute,
    getById: getClientById,
    search: searchClients,
    add: addClient,
    update: updateClient,
    delete: deleteClient,
    registerPurchase: registerClientPurchase,
    addCredit: addClientCredit,
    reduceCredit: reduceClientCredit,
    getWithCredit: getClientsWithCredit,
    renderSelect: renderClientsSelect,
    formatInfo: formatClientInfo
};
