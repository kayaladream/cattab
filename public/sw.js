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

  // 已有缓存，直接返回（支持 Range 请求）
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

  // 未缓存，启动后台缓存（带延迟）
  if (!activeDownloads.has(urlKey)) {
    activeDownloads.add(urlKey);

    // 启动延迟：视频 3 秒，图片 1.5 秒
    const isVideo = urlKey.endsWith('.mp4');
    const startDelay = isVideo ? 3000 : 1500;

    const bgFetchPromise = new Promise((resolve) => {
      setTimeout(async () => {
        const startTime = Date.now(); // 记录真正开始下载的时间点
        try {
          const bgRequest = new Request(urlKey, { headers: new Headers(request.headers) });
          bgRequest.headers.delete('Range'); // 完整下载，不传 Range

          const response = await fetch(bgRequest);
          if (response.status === 200) {
            const blob = await response.blob();
            const safeHeaders = new Headers(response.headers);
            safeHeaders.delete('Content-Encoding');
            safeHeaders.delete('Content-Length');

            const cache = await caches.open(CACHE_NAME);
            await cache.put(urlKey, new Response(blob, {
              status: 200,
              headers: safeHeaders
            }));

            const elapsed = Date.now() - startTime; // 实际下载+缓存耗时
            console.log(`ServiceWorker缓存完成: ${urlKey} (耗时: ${elapsed}ms)`);
          }
        } catch (err) {
          console.warn('ServiceWorker缓存失败', err);
        } finally {
          activeDownloads.delete(urlKey);
          resolve();
        }
      }, startDelay);
    });

    event.waitUntil(bgFetchPromise);
  }

  // 缓存未命中时，仍然从网络直接获取本次请求
  return fetch(request);
}
