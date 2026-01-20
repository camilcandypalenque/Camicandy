/**
 * Catálogo Cami Candy - Landing Page
 * Carga productos desde Firebase (sin precios)
 */

// Número de WhatsApp para contacto
const WHATSAPP_NUMBER = '5219631466242';

// Mapeo de imágenes locales para productos
const PRODUCT_IMAGES = {
    'gomitas': 'images/productos/gomitas.png',
    'gomita': 'images/productos/gomitas.png',
    'polvo tajin': 'images/productos/polvo_tajin.png',
    'polvo tajín': 'images/productos/polvo_tajin.png',
    'tajin': 'images/productos/polvo_tajin.png',
    'tajín': 'images/productos/polvo_tajin.png',
    'pasta sandia': 'images/productos/pasta_sandia.png',
    'pasta sandía': 'images/productos/pasta_sandia.png',
    'sandia': 'images/productos/pasta_sandia.png',
    'sandía': 'images/productos/pasta_sandia.png',
    'pasta mango': 'images/productos/pasta_mango.png',
    'mango': 'images/productos/pasta_mango.png',
    'mangonada': 'images/productos/pasta_mango.png',
    'pasta tamarindo': 'images/productos/pasta_tamarindo.png',
    'tamarindo': 'images/productos/pasta_tamarindo.png',
    'chamoy': 'images/productos/pasta_chamoy.png',
    'pasta chamoy': 'images/productos/pasta_chamoy.png',
    'skwinkles': 'images/productos/pasta_chamoy.png',
    'cacahuates': 'images/productos/cacahuates.png',
    'cacahuate': 'images/productos/cacahuates.png',
    'japoneses': 'images/productos/cacahuates.png',
    'pruebas': 'images/productos/gomitas.png',
    'polvo sandia': 'images/productos/pasta_sandia.png',
    'concentrado': 'images/productos/pasta_chamoy.png'
};

/**
 * Obtiene la imagen para un producto basándose en su nombre
 */
function getProductImage(productName) {
    const nameLower = productName.toLowerCase();

    // Buscar coincidencia exacta primero
    if (PRODUCT_IMAGES[nameLower]) {
        return PRODUCT_IMAGES[nameLower];
    }

    // Buscar coincidencia parcial
    for (const [key, value] of Object.entries(PRODUCT_IMAGES)) {
        if (nameLower.includes(key) || key.includes(nameLower)) {
            return value;
        }
    }

    return null;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    await loadCatalogProducts();
    setupEventListeners();
});

/**
 * Carga productos desde Firebase y los renderiza
 */
async function loadCatalogProducts() {
    const grid = document.getElementById('productsGrid');
    const loader = document.getElementById('loader');

    try {
        // Esperar a que Firebase esté listo
        if (typeof firebase === 'undefined') {
            console.error('Firebase no está cargado');
            showError('Error cargando productos');
            return;
        }

        const db = firebase.firestore();
        const snapshot = await db.collection('products').get();

        const products = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.stock > 0) { // Solo productos con stock
                products.push({
                    id: doc.id,
                    ...data
                });
            }
        });

        loader.style.display = 'none';

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i>
                    <p>Próximamente nuevos productos</p>
                </div>
            `;
            return;
        }

        renderProducts(products);

    } catch (error) {
        console.error('Error cargando productos:', error);
        loader.style.display = 'none';
        showError('No se pudieron cargar los productos');
    }
}

// Descripciones aleatorias para productos
const PRODUCT_DESCRIPTIONS = [
    "Elaborado con los mejores ingredientes para darte una experiencia única de sabor. Perfecto para compartir en familia o disfrutar en cualquier momento del día.",
    "Una explosión de sabor que conquistará tu paladar desde el primer bocado. Ideal para los amantes de los dulces mexicanos tradicionales.",
    "Preparado artesanalmente con recetas que han pasado de generación en generación. Cada mordida es un viaje a las tradiciones de Chiapas.",
    "El complemento perfecto para tus micheladas, frutas y snacks favoritos. Dale ese toque especial que solo Cami Candy puede ofrecer.",
    "Calidad premium que puedes saborear en cada detalle. Hecho con amor y dedicación para los paladares más exigentes.",
    "Un clásico favorito reinventado con el sazón único de nuestra tierra. Disfruta de sabores auténticos en cada presentación.",
    "Perfecto para negocio o consumo personal. Su sabor intenso y consistencia perfecta lo hacen irresistible.",
    "La opción ideal para quienes buscan calidad y sabor en un solo producto. ¡Una vez que lo pruebes, repetirás!"
];

/**
 * Obtiene una descripción aleatoria para un producto
 */
function getRandomDescription(index) {
    return PRODUCT_DESCRIPTIONS[index % PRODUCT_DESCRIPTIONS.length];
}

/**
 * Renderiza los productos como secciones de pantalla completa
 */
function renderProducts(products) {
    const grid = document.getElementById('productsGrid');

    // Cambiar el contenedor a un layout vertical
    grid.className = 'products-showcase';

    grid.innerHTML = products.map((product, index) => {
        const localImage = getProductImage(product.name);
        const imageUrl = product.imageUrl || localImage;
        const description = getRandomDescription(index);
        const isEven = index % 2 === 0;

        return `
            <section class="product-showcase ${isEven ? 'layout-left' : 'layout-right'}">
                <div class="showcase-content">
                    <div class="showcase-image">
                        ${imageUrl
                ? `<img src="${imageUrl}" alt="${product.name}" loading="lazy">`
                : `<div class="showcase-placeholder">
                                    <i class="fas ${getProductIcon(product.type)}"></i>
                               </div>`
            }
                    </div>
                    <div class="showcase-info">
                        <span class="showcase-number">${String(index + 1).padStart(2, '0')}</span>
                        <h2 class="showcase-title">${product.name}</h2>
                        <p class="showcase-description">${description}</p>
                        <button class="showcase-cta" onclick="contactWhatsApp()">
                            <i class="fab fa-whatsapp"></i> Consultar precio
                        </button>
                    </div>
                </div>
                ${index < products.length - 1 ? '<div class="scroll-indicator"><i class="fas fa-chevron-down"></i></div>' : ''}
            </section>
        `;
    }).join('');

    // Inicializar animaciones de scroll
    initScrollAnimations();
}

/**
 * Inicializa animaciones cuando los elementos entran en viewport
 */
function initScrollAnimations() {
    const sections = document.querySelectorAll('.product-showcase');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.2 });

    sections.forEach(section => observer.observe(section));
}

/**
 * Obtiene el icono según el tipo de producto
 */
function getProductIcon(type) {
    const icons = {
        'concentrado': 'fa-flask',
        'embolsado': 'fa-cookie-bite',
        'bebida': 'fa-glass-cheers',
        'snack': 'fa-candy-cane',
        'dulce': 'fa-candy-cane'
    };
    return icons[type?.toLowerCase()] || 'fa-gift';
}

/**
 * Formatea el tipo de producto
 */
function formatType(type) {
    const types = {
        'concentrado': 'Concentrado',
        'embolsado': 'Embolsado',
        'bebida': 'Bebida',
        'snack': 'Snack',
        'dulce': 'Dulce'
    };
    return types[type?.toLowerCase()] || type;
}

/**
 * Muestra mensaje de error
 */
function showError(message) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
            <button onclick="location.reload()" class="retry-btn">
                <i class="fas fa-redo"></i> Reintentar
            </button>
        </div>
    `;
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
    // Botón de WhatsApp
    const whatsappBtn = document.getElementById('whatsappBtn');
    const whatsappFloat = document.getElementById('whatsappFloat');

    const openWhatsApp = () => {
        const message = encodeURIComponent('¡Hola! Me interesa conocer más sobre sus productos de Cami Candy 🍬');
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    };

    if (whatsappBtn) whatsappBtn.addEventListener('click', openWhatsApp);
    if (whatsappFloat) whatsappFloat.addEventListener('click', openWhatsApp);
}

// Exponer función globalmente
window.contactWhatsApp = function () {
    const message = encodeURIComponent('¡Hola! Me interesa conocer más sobre sus productos de Cami Candy 🍬');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
};
