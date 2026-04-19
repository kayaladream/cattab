// public/sw.js
const CACHE_NAME = 'cattab-background-v1';

// 安装阶段：立刻接管网页
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  //  核心逻辑：只要是请求 /background/ 目录下的图片或视频
  if (url.pathname.startsWith('/background/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // 1. 先去保险箱里找找看有没有
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse; // 如果有，直接从 C 盘返回，0毫秒秒开！
        }

        // 2. 如果保险箱里没有，就老老实实去网络下载
        const networkResponse = await fetch(event.request);
        
        // 3. 下载成功后，把完整的视频/图片复印一份，锁进保险箱，留给下次用
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      })
    );
  }
});
