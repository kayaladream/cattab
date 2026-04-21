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
    if (!rangeHeader) return cachedResponse; // 图片会在这里瞬间返回

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
      setTimeout(async () => {
        try {
          const bgRequest = new Request(urlKey, { headers: new Headers(request.headers) });
          bgRequest.headers.delete('Range'); 
          
          const response = await fetch(bgRequest);
          if (response.status === 200) {
            const blob = await response.blob();
            const safeHeaders = new Headers(response.headers);
            safeHeaders.delete('Content-Encoding'); // 洗掉压缩标记
            safeHeaders.delete('Content-Length');   // 洗掉长度校验

            await cache.put(urlKey, new Response(blob, {
              status: 200,
              headers: safeHeaders
            }));
            console.log(`Service Worker 缓存完成: ${urlKey}`);
          }
        } catch (err) {
          console.warn('Service Worker 缓存失败', err);
        } finally {
          activeDownloads.delete(urlKey);
          resolve();
        }
      }, 15000); 
    });

    event.waitUntil(bgFetchPromise);
  }
  
  return fetch(request);
}
