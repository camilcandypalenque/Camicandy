/**
 * Configuración de Firebase para Camil Candy POS
 * Este archivo contiene las credenciales y configuración inicial de Firebase
 */

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDjpn6GPBXkvpKGZIOa3E6smQbS9Tp_QfY",
    authDomain: "camil-candy.firebaseapp.com",
    projectId: "camil-candy",
    storageBucket: "camil-candy.firebasestorage.app",
    messagingSenderId: "601855059534",
    appId: "1:601855059534:web:80c88a8a89a9a00c0c051f"
};

// Nombres de las colecciones en Firestore
const COLLECTIONS = {
    PRODUCTS: 'products',
    SALES: 'sales',
    STOCK_MOVEMENTS: 'stock_movements',
    SETTINGS: 'settings',
    COUNTERS: 'counters'
};

// Configuración por defecto del sistema
const DEFAULT_SETTINGS = {
    businessName: "Cami Candy",
    businessAddress: "",
    businessPhone: "",
    taxRate: 16,
    currencySymbol: "$",
    receiptFooter: "¡Gracias por su compra! Vuelva pronto.",
    themeColor: "default",
    language: "es",
    darkMode: false
};

// Productos de ejemplo para inicialización
const SAMPLE_PRODUCTS = [
    { id: 1, name: "Concentrado Michelada Clásica", type: "concentrado", price: 25.00, cost: 12.50, stock: 15, minStock: 10 },
    { id: 2, name: "Concentrado Michelada Tamarindo", type: "concentrado", price: 28.00, cost: 14.00, stock: 8, minStock: 10 },
    { id: 3, name: "Concentrado Michelada Mango", type: "concentrado", price: 28.00, cost: 14.00, stock: 12, minStock: 10 },
    { id: 4, name: "Cacahuates Japoneses", type: "embolsado", price: 15.00, cost: 8.00, stock: 25, minStock: 15 },
    { id: 5, name: "Gomitas de Sandía", type: "embolsado", price: 12.00, cost: 6.00, stock: 30, minStock: 15 },
    { id: 6, name: "Papas Sabritas", type: "embolsado", price: 18.00, cost: 9.00, stock: 10, minStock: 15 }
];

// Exportar configuración para uso global
window.FIREBASE_CONFIG = firebaseConfig;
window.COLLECTIONS = COLLECTIONS;
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
window.SAMPLE_PRODUCTS = SAMPLE_PRODUCTS;
