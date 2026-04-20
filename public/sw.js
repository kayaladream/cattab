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

// 2. 🌟 第二步：保险箱里没有！开始“影分身”静默偷家
  if (!activeDownloads.has(urlKey)) {
    activeDownloads.add(urlKey);

    // 🌟 创建一个带延迟的后台下载任务，让出前 3 秒的宝贵网速给前台视频播放！
    const bgFetchPromise = new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const bgRequest = new Request(urlKey, { headers: new Headers(request.headers) });
          bgRequest.headers.delete('Range'); // 撕掉切片头，要完整的
          
          const response = await fetch(bgRequest);
          if (response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(urlKey, response.clone());
            console.log(`后台静默缓存完毕，下次绝对秒开: ${urlKey}`);
          }
        } catch (err) {
          console.warn('后台缓存失败', err);
        } finally {
          activeDownloads.delete(urlKey); // 无论成败，解除标记
          resolve();
        }
      }, 3000); // 🕒 延迟 3 秒钟！
    });

    // event.waitUntil 保证大管家在等待这 3 秒时，不会被浏览器强制休眠
    event.waitUntil(bgFetchPromise);
  }
  
  // 3. 立刻放行浏览器的当前请求！绝不阻挡！
  return fetch(request);
