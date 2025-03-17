//@ts-nocheck
// IndexedDB资源缓存降级方案
// 当浏览器不支持Service Worker时使用
// 缓存版本号
const CACHE_VERSION2 = '1.0';
const RESOURCES_STORE = 'cached-resources';
const RESOURCES_DB = 'offline-resources-v' + CACHE_VERSION2;

// 从sw.js中复制的需要缓存的资源列表
const CACHE_ASSETS2 = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/db.js',
  '/js/fallback.js',
  '/js/update-notification.js',
  '/manifest.json',
  // 图标资源
  '/images/icons/g10.png',
  '/images/icons/icon-512x512.png',
  '/images/icons/b1.png',
  '/images/icons/icon-192x192.png',
  // 图片资源
  '/images/a1.jpg',
  '/images/a2.jpg',
  '/images/a3.jpg',
  '/images/a4.jpg',
  // 视频资源
  '/video/1.mp4',
  '/video/2.mp4',
  '/video/3.mp4',
  '/video/4.mp4',
  '/video/live.mp4',
  '/video/cover-1.jpg',
  '/video/cover-2.jpg',
  '/video/cover-3.jpg',
  '/video/cover-4.jpg',
  // 轮播组件资源
  'js/swiper-bundle.min.js',
  'css/swiper-bundle.min.css',
];

// 打开资源缓存数据库
function openResourcesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RESOURCES_DB, 1);
    
    // 数据库升级事件（首次创建或版本更新时触发）
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 如果资源存储对象仓库不存在，则创建
      if (!db.objectStoreNames.contains(RESOURCES_STORE)) {
        // 创建资源存储对象仓库，使用URL作为键
        const store = db.createObjectStore(RESOURCES_STORE, { keyPath: 'url' });
        
        // 创建索引，用于快速查找资源
        store.createIndex('url', 'url', { unique: true });
        
        console.log('资源缓存数据库结构初始化完成');
      }
    };
    
    // 数据库打开成功
    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };
    
    // 数据库打开失败
    request.onerror = (event) => {
      console.error('打开资源缓存数据库失败:', event.target.error);
      reject(event.target.error);
    };
  });
}

// 检查资源是否已存在于缓存中
async function isResourceCached(url) {
  try {
    const db = await openResourcesDB();
    const transaction = db.transaction(RESOURCES_STORE, 'readonly');
    const store = transaction.objectStore(RESOURCES_STORE);
    
    // 查询资源
    const resource = await new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
    
    return !!resource; // 如果资源存在，返回true，否则返回false
  } catch (error) {
    console.error(`检查资源缓存状态失败: ${url}`, error);
    return false;
  }
}

// 缓存单个资源
async function cacheResource(url) {
  try {
    // 首先检查资源是否已经缓存
    const isCached = await isResourceCached(url);
    if (isCached) {
      console.log(`资源已存在于缓存中，跳过: ${url}`);
      return true;
    }
    
    // 获取资源
    const response = await fetch(url, { cache: 'no-store' });
    if (!response || !response.ok) {
      throw new Error(`获取资源失败: ${url}`);
    }
    
    // 克隆响应并转换为Blob
    const responseClone = response.clone();
    const blob = await responseClone.blob();
    
    // 保存到IndexedDB
    const db = await openResourcesDB();
    const transaction = db.transaction(RESOURCES_STORE, 'readwrite');
    const store = transaction.objectStore(RESOURCES_STORE);
    
    // 创建资源对象
    const resource = {
      url: url,
      data: blob,
      timestamp: Date.now(),
      headers: {}
    };
    
    // 保存响应头信息
    response.headers.forEach((value, key) => {
      resource.headers[key] = value;
    });
    
    // 存储资源
    await new Promise((resolve, reject) => {
      const request = store.put(resource);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
    
    console.log(`资源已缓存: ${url}`);
    return true;
  } catch (error) {
    console.error(`缓存资源失败: ${url}`, error);
    return false;
  }
}

// 预缓存所有资源
async function precacheResources() {
  console.log('开始预缓存资源...');
  let successCount = 0;
  
  for (const url of CACHE_ASSETS2) {
    try {
      // 构建完整URL
      const fullUrl = new URL(url, window.location.origin).href;
      const success = await cacheResource(fullUrl);
      if (success) successCount++;
    } catch (error) {
      console.error(`预缓存资源失败: ${url}`, error);
    }
  }
  
  console.log(`预缓存完成，成功: ${successCount}/${CACHE_ASSETS2.length}`);
  return successCount;
}

// 从缓存获取资源
async function getResourceFromCache(url) {
  try {
    const db = await openResourcesDB();
    const transaction = db.transaction(RESOURCES_STORE, 'readonly');
    const store = transaction.objectStore(RESOURCES_STORE);
    
    // 查询资源
    const resource = await new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
    
    if (!resource) {
      return null;
    }
    
    // 创建响应对象
    const headers = new Headers();
    for (const [key, value] of Object.entries(resource.headers)) {
      headers.append(key, value);
    }
    
    // 从Blob创建响应
    const response = new Response(resource.data, {
      headers: headers,
      status: 200,
      statusText: 'OK'
    });
    
    return response;
  } catch (error) {
    console.error(`从缓存获取资源失败: ${url}`, error);
    return null;
  }
}

// 检查网络状态并在离线时重定向到离线页面
function checkOfflineAndRedirect() {
  // 如果当前不在线且当前页面不是离线页面
  if (!navigator.onLine && !window.location.pathname.includes('/offline.html')) {
    console.log('检测到网络离线状态，重定向到离线页面');
    // 保存当前URL，以便在恢复网络连接后返回
    sessionStorage.setItem('lastOnlinePage', window.location.href);
    // 保存离线检测时间戳
    sessionStorage.setItem('offlineDetectedTime', Date.now());
    // 重定向到离线页面
    window.location.href = '/offline.html';
    return true;
  }
  return false;
}

// 定期检查网络状态
function setupPeriodicNetworkCheck() {
  // 每10秒检查一次网络状态
  setInterval(() => {
    if (!navigator.onLine) {
      // 如果当前不在线，检查是否需要重定向
      checkOfflineAndRedirect();
    } else if (window.location.pathname.includes('/offline.html')) {
      // 如果在离线页面但网络已恢复，返回之前的页面
      const lastPage = sessionStorage.getItem('lastOnlinePage');
      if (lastPage) {
        console.log('网络已恢复，返回上一个在线页面:', lastPage);
        window.location.href = lastPage;
      } else {
        // 如果没有保存的页面，返回首页
        window.location.href = '/';
      }
    }
  }, 10000);
}

// 拦截网络请求
function setupFetchInterceptor() {
  // 保存原始fetch函数
  const originalFetch = window.fetch;
  
  // 检查是否需要重定向到离线页面
  if (checkOfflineAndRedirect()) {
    return; // 如果已重定向，不需要继续设置拦截器
  }
  
  // 替换fetch函数
  window.fetch = async function(input, init) {
    const request = input instanceof Request ? input : new Request(input);
    const url = request.url;
    
    // 检查网络状态
    if (!navigator.onLine) {
      // 如果是HTML请求，尝试重定向到离线页面
      if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
        checkOfflineAndRedirect();
      }
    }
    
    // 只处理GET请求
    if (request.method !== 'GET') {
      return originalFetch(input, init);
    }
    
    // 跳过跨域请求
    if (!url.startsWith(window.location.origin)) {
      return originalFetch(input, init);
    }
    
    try {
      // 网络优先策略 - 适用于API请求
      if (url.includes('/api/')) {
        try {
          // 尝试从网络获取
          const networkResponse = await originalFetch(input, init);
          // 缓存响应
          if (networkResponse && networkResponse.ok) {
            const clonedResponse = networkResponse.clone();
            cacheResource(url, clonedResponse);
          }
          return networkResponse;
        } catch (error) {
          // 网络失败时，尝试从缓存获取
          const cachedResponse = await getResourceFromCache(url);
          if (cachedResponse) {
            return cachedResponse;
          }
          throw error;
        }
      }
      
      // 缓存优先策略 - 适用于静态资源
      // 先尝试从缓存获取
      const cachedResponse = await getResourceFromCache(url);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 缓存中没有，从网络获取
      try {
        const networkResponse = await originalFetch(input, init);
        // 缓存响应
        if (networkResponse && networkResponse.ok) {
          const clonedResponse = networkResponse.clone();
          cacheResource(url, clonedResponse);
        }
        return networkResponse;
      } catch (error) {
        // 如果是HTML请求，返回离线页面
        if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
          const offlineResponse = await getResourceFromCache('/offline.html');
          if (offlineResponse) {
            return offlineResponse;
          }
        }
        throw error;
      }
    } catch (error) {
      console.error('请求拦截器错误:', error);
      return originalFetch(input, init);
    }
  };
  
  console.log('网络请求拦截器已设置');
}

// 设置网络状态监听器
function setupNetworkListeners() {
  // 网络恢复在线时的处理
  window.addEventListener('online', () => {
    console.log('网络已恢复连接');
    // 更新UI显示
    updateNetworkStatusUI(true);
    
    // 如果当前在离线页面，且有保存的上一个在线页面，则返回该页面
    if (window.location.pathname.includes('/offline.html')) {
      const lastPage = sessionStorage.getItem('lastOnlinePage');
      if (lastPage) {
        console.log('返回上一个在线页面:', lastPage);
        window.location.href = lastPage;
      } else {
        // 如果没有保存的页面，返回首页
        window.location.href = '/';
      }
    }
    
    // 网络恢复后，检查是否需要更新缓存
    checkAndUpdateCache();
  });
  
  // 网络断开连接时的处理
  window.addEventListener('offline', () => {
    console.log('网络已断开连接');
    // 更新UI显示
    updateNetworkStatusUI(false);
    // 检查是否需要重定向到离线页面
    checkOfflineAndRedirect();
  });
  
  // 页面加载时立即检查网络状态
  updateNetworkStatusUI(navigator.onLine);
  
  // 设置定期检查
  setupPeriodicNetworkCheck();
}

// 更新网络状态UI
function updateNetworkStatusUI(isOnline) {
  const status = document.getElementById('status');
  const statusContainer = document.getElementById('online-status');
  
  if (status && statusContainer) {
    if (isOnline) {
      status.textContent = '在线';
      statusContainer.classList.remove('offline');
      statusContainer.classList.add('online');
    } else {
      status.textContent = '离线';
      statusContainer.classList.remove('online');
      statusContainer.classList.add('offline');
    }
  }
}

// 网络恢复后检查并更新缓存
async function checkAndUpdateCache() {
  try {
    // 检查是否已有缓存
    const hasCached = await checkCachedResources();
    if (!hasCached) {
      console.log('网络恢复后检测到无缓存，开始缓存资源...');
      updateCacheStatusForFallback(null, '正在缓存...');
      const cachedCount = await precacheResources();
      updateCacheStatusForFallback(cachedCount > 0);
    }
  } catch (error) {
    console.error('网络恢复后更新缓存失败:', error);
  }
}

// 初始化降级方案
async function initFallbackCache() {
  try {
    console.log('初始化IndexedDB资源缓存降级方案...');
    
    // 立即更新缓存状态为"正在缓存..."
    updateCacheStatusForFallback(null, '正在缓存...');
    
    // 设置网络状态监听器
    setupNetworkListeners();
    
    // 设置网络请求拦截器
    setupFetchInterceptor();
    
    // 检查是否已有缓存资源
    const hasCachedResources = await checkCachedResources();
    
    // 如果已经有缓存资源且不是首次加载，则不重复缓存
    let cachedCount = 0;
    if (!hasCachedResources || sessionStorage.getItem('firstLoad') !== 'false') {
      // 预缓存资源
      cachedCount = await precacheResources();
      // 标记非首次加载
      sessionStorage.setItem('firstLoad', 'false');
    } else {
      console.log('已存在缓存资源，跳过预缓存步骤');
      cachedCount = 1; // 确保显示已缓存状态
    }
    
    // 更新缓存状态显示
    updateCacheStatusForFallback(cachedCount > 0);
    
    console.log('IndexedDB资源缓存降级方案初始化完成');
  } catch (error) {
    console.error('初始化IndexedDB资源缓存降级方案失败:', error);
    updateCacheStatusForFallback(false);
  }
}

// 检查是否已有缓存资源
async function checkCachedResources() {
  try {
    const db = await openResourcesDB();
    const transaction = db.transaction(RESOURCES_STORE, 'readonly');
    const store = transaction.objectStore(RESOURCES_STORE);
    
    // 获取资源数量
    const countRequest = store.count();
    const count = await new Promise((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = (e) => reject(e.target.error);
    });
    
    return count > 0;
  } catch (error) {
    console.error('检查缓存资源失败:', error);
    return false;
  }
}

// 更新缓存状态显示（针对降级方案）
function updateCacheStatusForFallback(isCached, customText) {
  const cacheStatus = document.getElementById('cache');
  const cacheContainer = document.getElementById('cache-status');
  
  if (cacheStatus && cacheContainer) {
    if (isCached === null && customText) {
      // 显示自定义文本（如"正在缓存..."）
      cacheStatus.textContent = customText;
      cacheContainer.classList.remove('cached');
      cacheContainer.classList.remove('not-cached');
      cacheContainer.classList.add('caching');
    } else if (isCached) {
      // 显示已缓存状态
      cacheStatus.textContent = '已缓存（降级模式）';
      cacheContainer.classList.remove('not-cached');
      cacheContainer.classList.remove('caching');
      cacheContainer.classList.add('cached');
    } else {
      // 显示未缓存状态
      cacheStatus.textContent = '缓存失败（降级模式）';
      cacheContainer.classList.remove('cached');
      cacheContainer.classList.remove('caching');
      cacheContainer.classList.add('not-cached');
    }
  }
}

// 导出函数
window.initFallbackCache = initFallbackCache;