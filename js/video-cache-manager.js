// 视频缓存管理器
// 用于优化弱网环境下的视频加载和播放体验

class VideoCacheManager {
    constructor() {
        // 初始化IndexedDB数据库
        this.dbName = 'video-cache-db';
        this.storeName = 'video-cache-store';
        this.db = null;
        this.initDB();
        
        // 网络状态监听
        this.isOnline = navigator.onLine;
        this.networkQuality = 'unknown'; // 'good', 'medium', 'poor'
        this.setupNetworkListeners();
        
        // 视频预加载队列
        this.preloadQueue = [];
        this.isPreloading = false;
        
        // 视频元数据信息
        this.videoMetadata = {};
    }
    
    // 初始化IndexedDB数据库
    initDB() {
        // 添加重试机制
        let retryCount = 0;
        const maxRetries = 3;
        const retryInterval = 500; // 毫秒
        
        const attemptInitDB = () => {
            console.log(`[VideoCacheManager] 尝试初始化数据库 (${retryCount + 1}/${maxRetries + 1})`);
            
            const request = indexedDB.open(this.dbName, 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建视频缓存对象仓库
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('[VideoCacheManager] 数据库结构初始化完成');
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('[VideoCacheManager] 数据库连接成功');
                
                // 监听数据库连接关闭事件
                this.db.onclose = () => {
                    console.warn('[VideoCacheManager] 数据库连接意外关闭，尝试重新连接');
                    this.db = null;
                    // 重新初始化数据库
                    setTimeout(() => this.initDB(), 500);
                };
                
                // 监听数据库版本变更事件
                this.db.onversionchange = () => {
                    console.warn('[VideoCacheManager] 数据库版本变更，关闭当前连接');
                    this.db.close();
                    this.db = null;
                };
                
                // 清理过期缓存
                this.cleanExpiredCache();
                
                // 处理可能在数据库初始化期间积累的预加载队列
                if (this.preloadQueue.length > 0 && !this.isPreloading) {
                    this.processPreloadQueue();
                }
            };
            
            request.onerror = (event) => {
                console.error('[VideoCacheManager] 数据库连接失败:', event.target.error);
                
                // 如果还有重试次数，则尝试重新初始化
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.warn(`[VideoCacheManager] 将在 ${retryInterval}ms 后重试初始化数据库`);
                    setTimeout(attemptInitDB, retryInterval);
                } else {
                    console.error('[VideoCacheManager] 数据库初始化失败，已达到最大重试次数');
                }
            };
            
            request.onblocked = (event) => {
                console.warn('[VideoCacheManager] 数据库操作被阻塞，可能有其他标签页正在使用此数据库');
            };
        };
        
        // 开始初始化
        attemptInitDB();
    }
    
    // 设置网络状态监听
    setupNetworkListeners() {
        // 监听在线/离线状态
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.checkNetworkQuality();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.networkQuality = 'poor';
        });
        
        // 初始检测网络质量
        this.checkNetworkQuality();
    }
    
    // 检测网络质量
    checkNetworkQuality() {
        if (!this.isOnline) {
            this.networkQuality = 'poor';
            return;
        }
        
        // 使用小文件测速
        const startTime = Date.now();
        const testUrl = '/favicon.ico?_=' + startTime;
        
        fetch(testUrl)
            .then(response => response.blob())
            .then(blob => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // 根据响应时间判断网络质量
                if (duration < 300) {
                    this.networkQuality = 'good';
                } else if (duration < 1000) {
                    this.networkQuality = 'medium';
                } else {
                    this.networkQuality = 'poor';
                }
                
                console.log(`[VideoCacheManager] 网络质量: ${this.networkQuality} (${duration}ms)`);
            })
            .catch(error => {
                console.error('[VideoCacheManager] 网络检测失败:', error);
                this.networkQuality = 'poor';
            });
    }
    
    // 获取视频元数据
    async getVideoMetadata(videoUrl) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                const metadata = {
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight
                };
                
                // 缓存元数据
                this.videoMetadata[videoUrl] = metadata;
                
                resolve(metadata);
                video.remove();
            };
            
            video.onerror = (error) => {
                reject(error);
                video.remove();
            };
            
            video.src = videoUrl;
        });
    }
    
    // 预加载视频
    preloadVideo(videoUrl, priority = 1) {
        // 如果已经在预加载队列中，更新优先级
        const existingIndex = this.preloadQueue.findIndex(item => item.url === videoUrl);
        if (existingIndex !== -1) {
            this.preloadQueue[existingIndex].priority = Math.max(this.preloadQueue[existingIndex].priority, priority);
            // 根据优先级重新排序队列
            this.preloadQueue.sort((a, b) => b.priority - a.priority);
            return;
        }
        
        // 添加到预加载队列
        this.preloadQueue.push({
            url: videoUrl,
            priority: priority
        });
        
        // 根据优先级排序
        this.preloadQueue.sort((a, b) => b.priority - a.priority);
        
        // 开始预加载过程
        if (!this.isPreloading) {
            this.processPreloadQueue();
        }
    }
    
    // 处理预加载队列
    async processPreloadQueue() {
        if (this.preloadQueue.length === 0 || this.isPreloading) {
            return;
        }
        
        this.isPreloading = true;
        
        // 获取队列中优先级最高的视频
        const { url } = this.preloadQueue.shift();
        
        try {
            // 检查缓存中是否已存在
            const cachedVideo = await this.getFromCache(url);
            if (cachedVideo) {
                console.log(`[VideoCacheManager] 视频已缓存: ${url}`);
            } else {
                // 根据网络质量决定是否预加载
                if (this.networkQuality !== 'poor') {
                    console.log(`[VideoCacheManager] 开始预加载视频: ${url}`);
                    await this.fetchAndCacheVideo(url);
                } else {
                    console.log(`[VideoCacheManager] 网络质量差，跳过预加载: ${url}`);
                }
            }
        } catch (error) {
            console.error(`[VideoCacheManager] 预加载视频失败: ${url}`, error);
            // 即使当前视频预加载失败，也不影响队列中其他视频的处理
        } finally {
            this.isPreloading = false;
            
            // 继续处理队列中的下一个视频
            if (this.preloadQueue.length > 0) {
                // 使用setTimeout确保不会出现调用栈溢出
                setTimeout(() => this.processPreloadQueue(), 0);
            }
        }
    }
    
    // 获取缓存的视频
    getFromCache(url) {
        return new Promise((resolve, reject) => {
            // 检查数据库是否已初始化，如果未初始化则等待
            if (!this.db) {
                console.log(`[VideoCacheManager] 数据库尚未初始化，等待初始化完成: ${url}`);
                // 设置最大重试次数和间隔
                let retryCount = 0;
                const maxRetries = 5;
                const retryInterval = 300; // 毫秒
                
                const checkAndRetry = () => {
                    if (this.db) {
                        // 数据库已初始化，继续操作
                        console.log(`[VideoCacheManager] 数据库已初始化，继续操作: ${url}`);
                        this._getFromCacheInternal(url, resolve, reject);
                    } else if (retryCount < maxRetries) {
                        // 继续等待
                        retryCount++;
                        console.log(`[VideoCacheManager] 等待数据库初始化，重试 ${retryCount}/${maxRetries}`);
                        setTimeout(checkAndRetry, retryInterval);
                    } else {
                        // 超过最大重试次数
                        console.error(`[VideoCacheManager] 数据库初始化超时`);
                        reject(new Error('数据库初始化超时'));
                    }
                };
                
                // 开始重试
                setTimeout(checkAndRetry, retryInterval);
            } else {
                // 数据库已初始化，直接操作
                this._getFromCacheInternal(url, resolve, reject);
            }
        });
    }
    
    // 内部方法：从已初始化的数据库中获取缓存
    _getFromCacheInternal(url, resolve, reject) {
        try {
            const transaction = this.db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(url);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        } catch (error) {
            console.error(`[VideoCacheManager] 访问缓存数据库失败:`, error);
            reject(error);
        }
    }
    
    // 获取视频Blob URL
    async getVideoBlobUrl(url) {
        try {
            // 尝试从缓存获取
            const cachedVideo = await this.getFromCache(url);
            
            if (cachedVideo && cachedVideo.blob) {
                // 更新访问时间戳
                this.updateCacheTimestamp(url);
                // 返回缓存的Blob URL
                return URL.createObjectURL(cachedVideo.blob);
            }
            
            // 如果缓存中没有，则从网络获取并缓存
            if (this.isOnline) {
                const videoBlob = await this.fetchAndCacheVideo(url);
                return URL.createObjectURL(videoBlob);
            } else {
                throw new Error('离线状态且视频未缓存');
            }
        } catch (error) {
            console.error(`[VideoCacheManager] 获取视频Blob URL失败: ${url}`, error);
            // 失败时返回原始URL
            return url;
        }
    }
    
    // 从网络获取并缓存视频
    async fetchAndCacheVideo(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`网络请求失败: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            // 存入缓存
            await this.saveToCache(url, blob);
            
            return blob;
        } catch (error) {
            console.error(`[VideoCacheManager] 获取视频失败: ${url}`, error);
            throw error;
        }
    }
    
    // 保存视频到缓存
    saveToCache(url, blob) {
        return new Promise((resolve, reject) => {
            // 检查数据库是否已初始化，如果未初始化则等待
            if (!this.db) {
                console.log(`[VideoCacheManager] 数据库尚未初始化，等待初始化完成: ${url}`);
                // 设置最大重试次数和间隔
                let retryCount = 0;
                const maxRetries = 5;
                const retryInterval = 300; // 毫秒
                
                const checkAndRetry = () => {
                    if (this.db) {
                        // 数据库已初始化，继续操作
                        console.log(`[VideoCacheManager] 数据库已初始化，继续操作: ${url}`);
                        this._saveToCacheInternal(url, blob, resolve, reject);
                    } else if (retryCount < maxRetries) {
                        // 继续等待
                        retryCount++;
                        console.log(`[VideoCacheManager] 等待数据库初始化，重试 ${retryCount}/${maxRetries}`);
                        setTimeout(checkAndRetry, retryInterval);
                    } else {
                        // 超过最大重试次数
                        console.error(`[VideoCacheManager] 数据库初始化超时`);
                        reject(new Error('数据库初始化超时'));
                    }
                };
                
                // 开始重试
                setTimeout(checkAndRetry, retryInterval);
            } else {
                // 数据库已初始化，直接操作
                this._saveToCacheInternal(url, blob, resolve, reject);
            }
        });
    }
    
    // 内部方法：向已初始化的数据库中保存缓存
    _saveToCacheInternal(url, blob, resolve, reject) {
        try {
            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const cacheItem = {
                url: url,
                blob: blob,
                timestamp: Date.now(),
                size: blob.size
            };
            
            const request = store.put(cacheItem);
            
            request.onsuccess = () => {
                console.log(`[VideoCacheManager] 视频已缓存: ${url}`);
                resolve();
            };
            
            request.onerror = (event) => {
                console.error(`[VideoCacheManager] 缓存视频失败: ${url}`, event.target.error);
                reject(event.target.error);
            };
        } catch (error) {
            console.error(`[VideoCacheManager] 访问缓存数据库失败:`, error);
            reject(error);
        }
    }
    
    // 更新缓存时间戳
    updateCacheTimestamp(url) {
        if (!this.db) return;
        
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(url);
        
        request.onsuccess = (event) => {
            const data = event.target.result;
            if (data) {
                data.timestamp = Date.now();
                store.put(data);
            }
        };
    }
    
    // 清理过期缓存
    async cleanExpiredCache() {
        if (!this.db) return;
        
        try {
            // 获取所有缓存项
            const transaction = this.db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');
            const allCache = await new Promise((resolve, reject) => {
                const request = index.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            // 计算缓存总大小
            const totalSize = allCache.reduce((sum, item) => sum + (item.size || 0), 0);
            const maxCacheSize = 500 * 1024 * 1024; // 500MB 最大缓存大小
            
            // 如果总大小超过限制，删除最旧的缓存
            if (totalSize > maxCacheSize) {
                console.log(`[VideoCacheManager] 缓存总大小: ${totalSize / (1024 * 1024)}MB，开始清理...`);
                
                // 按时间戳排序
                allCache.sort((a, b) => a.timestamp - b.timestamp);
                
                let sizeToFree = totalSize - maxCacheSize * 0.7; // 释放到70%容量
                let freedSize = 0;
                
                const deleteTransaction = this.db.transaction(this.storeName, 'readwrite');
                const deleteStore = deleteTransaction.objectStore(this.storeName);
                
                for (const item of allCache) {
                    if (freedSize >= sizeToFree) break;
                    
                    deleteStore.delete(item.url);
                    freedSize += item.size || 0;
                    console.log(`[VideoCacheManager] 删除过期缓存: ${item.url}`);
                }
            }
        } catch (error) {
            console.error('[VideoCacheManager] 清理缓存失败:', error);
        }
    }
    
    // 根据网络质量获取适当的视频质量
    getAppropriateQuality(videoUrl) {
        // 这里可以实现根据网络质量返回不同质量的视频URL
        // 例如，可以在URL中添加质量参数，或者使用不同路径的视频文件
        
        if (!this.isOnline || this.networkQuality === 'poor') {
            // 低质量
            return videoUrl.replace(/\.mp4$/, '-low.mp4');
        } else if (this.networkQuality === 'medium') {
            // 中等质量
            return videoUrl.replace(/\.mp4$/, '-medium.mp4');
        } else {
            // 高质量
            return videoUrl;
        }
    }
}

// 创建全局实例
const videoCacheManager = new VideoCacheManager();

// 导出实例
window.videoCacheManager = videoCacheManager;