// IndexedDB数据库操作

// 打开数据库连接
function openDB() {
    return new Promise((resolve, reject) => {
        // 打开名为'offline-notes'的数据库，版本为1
        const request = indexedDB.open('offline-notes', 1);
        
        // 数据库升级事件（首次创建或版本更新时触发）
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // 如果'notes'对象仓库不存在，则创建
            if (!db.objectStoreNames.contains('notes')) {
                // 创建notes对象仓库，使用自动生成的键
                const store = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
                
                // 创建索引，用于快速查找未同步的笔记
                store.createIndex('synced', 'synced', { unique: false });
                
                console.log('数据库结构初始化完成');
            }
        };
        
        // 数据库打开成功
        request.onsuccess = (event) => {
            const db = event.target.result;
            
            // 为数据库对象添加常用方法，简化操作
            db.add = (storeName, data) => {
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(storeName, 'readwrite');
                    const store = transaction.objectStore(storeName);
                    const request = store.add(data);
                    
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            };
            
            db.getAll = (storeName) => {
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(storeName, 'readonly');
                    const store = transaction.objectStore(storeName);
                    const request = store.getAll();
                    
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            };
            
            db.getAllFromIndex = (storeName, indexName, value) => {
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(storeName, 'readonly');
                    const store = transaction.objectStore(storeName);
                    const index = store.index(indexName);
                    
                    // 处理布尔值和其他非有效键值类型
                    // IndexedDB的键不能是布尔值，需要将布尔值转换为数字（0或1）
                    let request;
                    if (value === true) {
                        request = index.getAll(IDBKeyRange.only(1));
                    } else if (value === false) {
                        request = index.getAll(IDBKeyRange.only(0));
                    } else {
                        request = index.getAll(value);
                    }
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            };
            
            resolve(db);
        };
        
        // 数据库打开失败
        request.onerror = (event) => {
            console.error('打开数据库失败:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 导出数据库操作函数
// 检测环境，在Service Worker中使用self，在window环境中使用window
if (typeof self !== 'undefined' && typeof self.ServiceWorkerGlobalScope !== 'undefined') {
    self.openDB = openDB;
} else if (typeof window !== 'undefined') {
    window.openDB = openDB;
}