const CACHE_NAME = 'camil-candy-v1';
const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'manifest.json',
    'vendedor.html',
    'css/vendedor.css',
    'js/vendedor-pos.js',
    'js/routes-service.js',
    'js/clients-service.js',
    'js/expenses-service.js',
    'js/config.js',
    'icon-192.png',
    'icon-512.png',
    'admin-icon-192.png',
    'admin-icon-512.png',
    'manifest.json',
    'manifest-admin.json',
    'login.html',
    'css/styles.css',
    'css/styles-part2.css',
    'js/inventory.js',
    'js/dashboard.js',
    'js/reports.js',
    'js/reports-part2.js',
    'js/admin-clients.js',
    'js/ui-sidebar.js',
    'js/main.js',
    'js/settings.js',
    'js/firebase-service.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Abriendo caché');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Borrando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
