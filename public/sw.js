// public/sw.js
const CACHE_NAME = 'cattab-background-v1'; 
const activeDownloads = new Set();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('cattab-background-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/background/')) {
    event.respondWith(handleMediaRequest(event));
  }
});

async function handleMediaRequest(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_NAME);
  const urlKey = request.url.split('?')[0]; 

  const cachedResponse = await cache.match(urlKey, { ignoreSearch: true });

  if (cachedResponse) {
    const rangeHeader = request.headers.get('Range');
    
    if (!rangeHeader) return cachedResponse;

    const blob = await cachedResponse.blob();
    const totalSize = blob.size;
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
    
    return new Response(blob.slice(start, end + 1), {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start) + 1,
        'Content-Type': cachedResponse.headers.get('Content-Type') || 'video/mp4',
      }
    });
  }

  if (!activeDownloads.has(urlKey)) {
    activeDownloads.add(urlKey);

    const bgFetchPromise = new Promise((resolve) => {
      const isVideo = urlKey.endsWith('.mp4');
      const delayTime = isVideo ? 3000 : 0;

      setTimeout(async () => {
        try {
          const bgRequest = new Request(urlKey, { headers: new Headers(request.headers) });
          bgRequest.headers.delete('Range'); 
          
          const response = await fetch(bgRequest);
          if (response.status === 200) {
            const blob = await response.blob();
            const safeHeaders = new Headers(response.headers);
            safeHeaders.delete('Content-Encoding'); 
            safeHeaders.delete('Content-Length');   

            // 存入保险箱
            const cache = await caches.open(CACHE_NAME);
            await cache.put(urlKey, new Response(blob, {
              status: 200,
              headers: safeHeaders
            }));
            console.log(`ServiceWorker缓存完成: ${urlKey} (延迟: ${delayTime}ms)`);
          }
        } catch (err) {
          console.warn('ServiceWorker缓存失败', err);
        } finally {
          activeDownloads.delete(urlKey);
          resolve();
        }
      }, delayTime); 
    });

    event.waitUntil(bgFetchPromise);
  }
  
  return fetch(request);
}
