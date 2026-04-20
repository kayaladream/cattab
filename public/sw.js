// public/sw.js
const CACHE_NAME = 'cattab-background-v4'; 
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
    // 把整个 event 传给大管家，让他能使用延迟任务
    event.respondWith(handleMediaRequest(event));
  }
});

async function handleMediaRequest(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_NAME);
  const urlKey = request.url.split('?')[0]; 

  // 1. 去保险箱找找有没有
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

  // 2. 如果没有，开始后台延迟偷家
  if (!activeDownloads.has(urlKey)) {
    activeDownloads.add(urlKey);

    const bgFetchPromise = new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const bgRequest = new Request(urlKey, { headers: new Headers(request.headers) });
          bgRequest.headers.delete('Range'); 
          
          const response = await fetch(bgRequest);
          if (response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(urlKey, response.clone());
            console.log(`后台静默缓存完毕，下次绝对秒开: ${urlKey}`);
          }
        } catch (err) {
          console.warn('后台缓存失败', err);
        } finally {
          activeDownloads.delete(urlKey);
          resolve();
        }
      }, 3000); // 延迟 3 秒下载，把初期的网速全留给前台视频！
    });

    event.waitUntil(bgFetchPromise);
  }
  
  // 3. 立刻放行浏览器当前的视频请求，一毫秒都不阻拦
  return fetch(request);
}
