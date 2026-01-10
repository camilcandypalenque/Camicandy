/**
 * Servicio de Gastos para Camil Candy POS
 * Maneja gastos generales y por producto
 */

// Categorías de gastos
const EXPENSE_CATEGORIES = [
    { id: 'envios', name: 'Envíos', icon: 'fa-truck', color: '#3498db' },
    { id: 'gasolina', name: 'Gasolina', icon: 'fa-gas-pump', color: '#e74c3c' },
    { id: 'bolsas', name: 'Bolsas/Empaque', icon: 'fa-shopping-bag', color: '#9b59b6' },
    { id: 'sellos', name: 'Sellos/Etiquetas', icon: 'fa-stamp', color: '#f39c12' },
    { id: 'sueldos', name: 'Sueldos', icon: 'fa-money-bill-wave', color: '#27ae60' },
    { id: 'otros', name: 'Otros Gastos', icon: 'fa-ellipsis-h', color: '#95a5a6' }
];

// Variables del módulo
let expenses = [];

/**
 * Inicializa los gastos desde Firebase
 */
async function initializeExpenses() {
    try {
        const snapshot = await db.collection('expenses')
            .orderBy('date', 'desc')
            .limit(500)
            .get();

        expenses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ ${expenses.length} gastos cargados`);
        return expenses;
    } catch (error) {
        console.error('❌ Error cargando gastos:', error);
        expenses = [];
        return expenses;
    }
}

/**
 * Obtiene todos los gastos
 */
async function getExpenses() {
    if (expenses.length === 0) {
        await initializeExpenses();
    }
    return expenses;
}

/**
 * Obtiene gastos por categoría
 */
async function getExpensesByCategory(categoryId) {
    if (expenses.length === 0) {
        await initializeExpenses();
    }
    return expenses.filter(e => e.category === categoryId);
}

/**
 * Obtiene gastos por rango de fechas
 */
async function getExpensesByDateRange(startDate, endDate) {
    if (expenses.length === 0) {
        await initializeExpenses();
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return expenses.filter(e => {
        const expenseDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return expenseDate >= start && expenseDate <= end;
    });
}

/**
 * Obtiene gastos de un producto específico
 */
async function getExpensesByProduct(productId) {
    if (expenses.length === 0) {
        await initializeExpenses();
    }
    return expenses.filter(e => e.productId === productId);
}

/**
 * Obtiene gastos por ruta
 */
async function getExpensesByRoute(routeId) {
    if (expenses.length === 0) {
        await initializeExpenses();
    }
    return expenses.filter(e => e.routeId === routeId);
}

/**
 * Agrega un nuevo gasto
 */
async function addExpense(expenseData) {
    try {
        // Validar campos obligatorios
        if (!expenseData.category || !expenseData.amount) {
            return { success: false, error: 'Categoría y monto son obligatorios' };
        }

        const newExpense = {
            category: expenseData.category,
            amount: parseFloat(expenseData.amount),
            description: expenseData.description?.trim() || '',
            date: expenseData.date ? new Date(expenseData.date) : new Date(),
            productId: expenseData.productId || null,
            routeId: expenseData.routeId || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('expenses').add(newExpense);

        const expenseWithId = {
            id: docRef.id,
            ...newExpense
        };
        expenses.unshift(expenseWithId); // Agregar al inicio

        console.log('✅ Gasto agregado:', docRef.id);
        return { success: true, id: docRef.id, expense: expenseWithId };
    } catch (error) {
        console.error('❌ Error agregando gasto:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza un gasto existente
 */
async function updateExpense(expenseId, updates) {
    try {
        await db.collection('expenses').doc(expenseId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const index = expenses.findIndex(e => e.id === expenseId);
        if (index !== -1) {
            expenses[index] = { ...expenses[index], ...updates };
        }

        console.log('✅ Gasto actualizado:', expenseId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error actualizando gasto:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Elimina un gasto
 */
async function deleteExpense(expenseId) {
    try {
        await db.collection('expenses').doc(expenseId).delete();

        const index = expenses.findIndex(e => e.id === expenseId);
        if (index !== -1) {
            expenses.splice(index, 1);
        }

        console.log('✅ Gasto eliminado:', expenseId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error eliminando gasto:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Calcula el total de gastos por categoría
 */
async function getTotalByCategory(startDate = null, endDate = null) {
    let filteredExpenses = await getExpenses();

    if (startDate && endDate) {
        filteredExpenses = await getExpensesByDateRange(startDate, endDate);
    }

    const totals = {};
    EXPENSE_CATEGORIES.forEach(cat => {
        totals[cat.id] = 0;
    });

    filteredExpenses.forEach(expense => {
        if (totals.hasOwnProperty(expense.category)) {
            totals[expense.category] += expense.amount;
        }
    });

    return totals;
}

/**
 * Calcula el total general de gastos
 */
async function getGrandTotal(startDate = null, endDate = null) {
    let filteredExpenses = await getExpenses();

    if (startDate && endDate) {
        filteredExpenses = await getExpensesByDateRange(startDate, endDate);
    }

    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Obtiene resumen de gastos del mes actual
 */
async function getMonthlyExpensesSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyExpenses = await getExpensesByDateRange(startOfMonth, endOfMonth);
    const totalByCategory = await getTotalByCategory(startOfMonth, endOfMonth);
    const grandTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
        expenses: monthlyExpenses,
        totalByCategory,
        grandTotal,
        count: monthlyExpenses.length
    };
}

/**
 * Obtiene resumen de gastos de hoy
 */
async function getTodayExpensesSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayExpenses = await getExpensesByDateRange(today, tomorrow);
    const grandTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
        expenses: todayExpenses,
        grandTotal,
        count: todayExpenses.length
    };
}

/**
 * Obtiene la información de una categoría
 */
function getCategoryInfo(categoryId) {
    return EXPENSE_CATEGORIES.find(c => c.id === categoryId);
}

/**
 * Renderiza un select de categorías
 */
function renderCategoriesSelect(selectId, selectedCategoryId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    let html = '<option value="">-- Seleccionar Categoría --</option>';

    EXPENSE_CATEGORIES.forEach(cat => {
        const selected = cat.id === selectedCategoryId ? 'selected' : '';
        html += `<option value="${cat.id}" ${selected}>${cat.name}</option>`;
    });

    select.innerHTML = html;
}

/**
 * Formatea un gasto para mostrar
 */
function formatExpense(expense) {
    const category = getCategoryInfo(expense.category);
    const date = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);

    return `
        <div class="expense-item" style="border-left: 4px solid ${category?.color || '#ccc'}">
            <div class="expense-icon">
                <i class="fas ${category?.icon || 'fa-money-bill'}"></i>
            </div>
            <div class="expense-details">
                <strong>${category?.name || expense.category}</strong>
                <span class="expense-description">${expense.description || 'Sin descripción'}</span>
                <small>${date.toLocaleDateString('es-MX')}</small>
            </div>
            <div class="expense-amount">
                -$${expense.amount.toFixed(2)}
            </div>
        </div>
    `;
}

// Exportar funciones globalmente
window.ExpensesService = {
    init: initializeExpenses,
    getAll: getExpenses,
    getByCategory: getExpensesByCategory,
    getByDateRange: getExpensesByDateRange,
    getByProduct: getExpensesByProduct,
    getByRoute: getExpensesByRoute,
    add: addExpense,
    update: updateExpense,
    delete: deleteExpense,
    getTotalByCategory,
    getGrandTotal,
    getMonthlySummary: getMonthlyExpensesSummary,
    getTodaySummary: getTodayExpensesSummary,
    getCategoryInfo,
    renderCategoriesSelect,
    formatExpense,
    CATEGORIES: EXPENSE_CATEGORIES
};
