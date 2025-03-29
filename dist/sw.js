// @ts-nocheck
// 导入数据库操作函数
importScripts('/dist/js/db.d864342bf7d967d0e0b8.js');

// 创建BroadcastChannel实例用于发送缓存进度消息
const cacheChannel = new BroadcastChannel('cache-progress-channel');

// 缓存版本号，更改此值将触发Service Worker更新
const CACHE_VERSION = '3.5.1';
const CACHE_NAME = 'offline-h5-v' + CACHE_VERSION;
const OFFLINE_URL = 'offline.html';
// 需要缓存的资源列表
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/dist/images/cover-1.c430d792c7407caf1834.webp',
  '/dist/images/editor-star.f0be85a46f7d80ed0910.gif',
  '/manifest.json',
  '/favicon.ico',
  '/sw.js',
  '/images/btn-start.webp',
  '/images/editor-star.gif',
  '/images/icons/b1.webp',
  '/images/icons/g10.webp',
  '/video/1.mp4',
  '/video/2.mp4',
  '/video/3.mp4',
  '/video/4.mp4',
  '/video/cover-1.webp',
  '/video/cover-2.webp',
  '/video/cover-3.webp',
  '/video/cover-4.webp',
  '/index.html',
  '/offline.html',
  '/dist/js/rem.e28b7c510f9f88cb9315.js',
  '/dist/js/main.f108999031cca5dd34dc.js',
  '/dist/js/db.d864342bf7d967d0e0b8.js',
  '/dist/js/customCarousel.7b890c4348049128ea11.js',
  '/dist/js/nfc.ed538ba699de1ce2cbb2.js',
  '/dist/js/updateNotification.5070a4861c46d80d1b1d.js',
  '/dist/css/styles.26817d5264d65738108c.css',
  '/dist/js/styles.31d6cfe0d16ae931b73c.js',
];

// Service Worker 安装事件
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安装');
  console.time('安装Service');
  
  // 强制激活当前版本的 Service Worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 开始缓存资源');
        
        // 计算缓存进度
        const totalAssets = CACHE_ASSETS.length;
        let cachedCount = 0;
        
        // 使用Promise.all和map来跟踪每个资源的缓存进度
        return Promise.all(
          CACHE_ASSETS.map(url => {
            return cache.add(url).then(() => {
              cachedCount++;
              const progress = Math.round((cachedCount / totalAssets) * 100);
              // 使用BroadcastChannel发送缓存进度消息
              cacheChannel.postMessage({
                type: 'CACHE_PROGRESS',
                progress: progress,
                cachedCount: cachedCount,
                totalAssets: totalAssets,
                url
              });
              
              // 当所有资源缓存完成时
              if (cachedCount === totalAssets) {
                console.log('[Service Worker] 缓存完成: 100%');
              }
            }).catch(err => {
              console.error(`[Service Worker] 缓存资源失败: ${url}`, err);

              // 即使某个资源缓存失败，仍然计算进度
              cachedCount++;
              const progress = Math.round((cachedCount / totalAssets) * 100);
              console.log(`[Service Worker] 缓存进度: ${progress}% (${cachedCount}/${totalAssets}) - 有错误`);
            });
          })
        );
      })
      .catch(err => {
        console.error('[Service Worker] 缓存资源失败:', err);
      })
  );
});

// Service Worker 激活事件
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 激活');
  
  // 清理旧版本缓存
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 确保立即接管所有页面
      console.timeEnd('安装Service');
      return self.clients.claim();
      
    })
  );
});

// 网络请求拦截
self.addEventListener('fetch', (event) => {
  // 跳过不需要缓存的请求
  if (event.request.method !== 'GET') return;
  
  // 跳过跨域请求
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  const url = event.request.url;
  
  // 根据资源类型选择不同的缓存策略
  if (url.includes('/api/')) {
    // API请求使用网络优先策略
    networkFirstStrategy(event);
  } else if (
    url.includes('.mp4') || 
    url.includes('.webp') || 
    url.includes('.css') || 
    url.includes('.js') || 
    url.includes('.ico') || 
    url.includes('.gif') ||
    url.includes('/images/') ||
    url.includes('/video/') ||
    url.endsWith('/')
  ) {
    // 静态资源使用缓存优先策略
    cacheFirstStrategy(event);
  } else {
    console.log('[Service Worker] 其他资源:', url);
    // 其他资源使用网络优先策略
    networkFirstStrategy(event);
  }
});

// 缓存优先策略
function cacheFirstStrategy(event) {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 如果在缓存中找到响应，则返回缓存的版本
        if (cachedResponse) {
          const url = event.request.url;
          return cachedResponse;
        }
        
        // 否则尝试从网络获取
        return fetch(event.request)
          .then((networkResponse) => {
            // 检查是否收到有效响应
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // 克隆响应 - 因为响应是流，只能使用一次
            const responseToCache = networkResponse.clone();
            
            // 将新资源添加到缓存
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
              
            return networkResponse;
          })
          .catch(() => {
            // 如果网络请求失败且请求的是HTML文档，返回离线页面
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
}

// 网络优先策略
function networkFirstStrategy(event) {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 收到网络响应后，将其缓存
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        return networkResponse;
      })
      .catch(() => {
        // 网络失败时，尝试从缓存获取
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // 如果缓存中也没有，且请求的是HTML，返回离线页面
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
}

// 后台同步事件
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  }
});

// 同步笔记数据
async function syncNotes() {
  try {
    // 从IndexedDB获取未同步的笔记
    const db = await openDB();
    const unsyncedNotes = await db.getAllFromIndex('notes', 'synced', false);
    
    if (unsyncedNotes.length === 0) return;
    
    // 尝试将笔记同步到服务器
    // 注意：这里只是示例，实际应用中需要实现真正的API调用
    console.log('[Service Worker] 同步笔记数据', unsyncedNotes);
    
    // 模拟API调用成功
    // 在实际应用中，这里应该是真正的API调用
    // const response = await fetch('/api/notes/sync', {
    //   method: 'POST',
    //   headers: {'Content-Type': 'application/json'},
    //   body: JSON.stringify(unsyncedNotes)
    // });
    // if (!response.ok) throw new Error('同步失败');
    
    // 更新已同步的笔记状态
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    for (const note of unsyncedNotes) {
      note.synced = 1;
      store.put(note);
    }
    await tx.done;
    
    console.log('[Service Worker] 笔记同步完成');
    
    // 通知所有客户端刷新页面
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        message: '笔记同步完成'
      });
    });
  } catch (error) {
    console.error('[Service Worker] 同步笔记失败：', error);
  }
}