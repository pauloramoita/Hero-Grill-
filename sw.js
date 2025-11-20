
// Service Worker para Hero Grill Self-service
// Necessário para PWA ser instalável

const CACHE_NAME = 'hero-grill-cache-v1';

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando...');
    self.skipWaiting(); // Força a ativação imediata
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Ativado');
    event.waitUntil(self.clients.claim()); // Controla as páginas imediatamente
});

self.addEventListener('fetch', (event) => {
    // Estratégia Network-First simples ou Pass-Through
    // Para garantir que o app sempre pegue dados novos, apenas repassamos a requisição.
    // Isso satisfaz o critério de ter um fetch handler para o PWA.
    event.respondWith(fetch(event.request));
});