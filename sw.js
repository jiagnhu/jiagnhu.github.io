// 导入数据库操作函数
importScripts('/js/db.js');

// 缓存版本号，更改此值将触发Service Worker更新
const CACHE_VERSION = '3.2.8';
const CACHE_NAME = 'offline-h5-v' + CACHE_VERSION;
const OFFLINE_URL = 'offline.html';

// 需要缓存的资源列表
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/db.js',
  '/js/update-notification.js',
  '/manifest.json',
  '/favicon.ico',
  // 图标资源
  '/images/icons/g10.png',
  '/images/icons/icon-512x512.png',
  '/images/icons/b1.png',
  '/images/icons/icon-192x192.png',
  // 视频资源
  '/video/1.mp4',
  '/video/2.mp4',
  '/video/3.mp4',
  '/video/4.mp4',
  '/video/cover-1.jpg',
  '/video/cover-2.jpg',
  '/video/cover-3.jpg',
  '/video/cover-4.jpg',
  // 轮播组件资源
  'js/swiper-bundle.min.js',
  'css/swiper-bundle.min.css',
];

// Service Worker 安装事件
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安装');
  
  // 强制激活当前版本的 Service Worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 缓存资源');
        // 预缓存关键资源
        return cache.addAll(CACHE_ASSETS);
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
  
  // 网络优先策略 - 适用于API请求和静态资源
  // 根据用户需求，所有资源都使用网络优先策略
  networkFirstStrategy(event);
});

// 缓存优先策略
function cacheFirstStrategy(event) {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 如果在缓存中找到响应，则返回缓存的版本
        if (cachedResponse) {
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