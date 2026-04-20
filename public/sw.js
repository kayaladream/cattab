// public/sw.js
//  升级版本号，强制浏览器更新管家的策略
const CACHE_NAME = 'cattab-background-v3'; 

// 记录正在后台下载的视频，防止重复下载
const activeDownloads = new Set();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 清理掉之前可能存坏的 v1, v2 缓存
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
    event.respondWith(handleMediaRequest(event.request));
  }
});

async function handleMediaRequest(request) {
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
    activeDownloads.add(urlKey); // 标记一下，防止发 4 次请求

    const bgRequest = new Request(urlKey, { headers: new Headers(request.headers) });
    bgRequest.headers.delete('Range');

    fetch(bgRequest).then(async (response) => {
      if (response.status === 200) {
        await cache.put(urlKey, response.clone());
        console.log(`后台静默缓存完成，已锁入保险箱: ${urlKey}`);
      }
    }).catch(err => console.warn('后台缓存失败', err))
      .finally(() => activeDownloads.delete(urlKey)); // 下完了解除标记
  }

  return fetch(request);
}
