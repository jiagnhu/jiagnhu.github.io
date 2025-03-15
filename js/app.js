// 检查浏览器是否支持Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 注册Service Worker
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker 注册成功，作用域：', registration.scope);
                updateCacheStatus();
                
                // 添加消息监听器，接收Service Worker发送的消息
                navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data && event.data.type === 'SYNC_COMPLETED') {
                        console.log('收到同步完成消息：', event.data.message);
                        // 刷新页面以显示最新状态
                        loadNotes();
                    }
                });
                
                // 检测Service Worker更新
                registration.addEventListener('updatefound', () => {
                    // 当发现新的Service Worker时
                    const newWorker = registration.installing;
                    console.log('发现新版本的Service Worker');
                    
                    newWorker.addEventListener('statechange', () => {
                        // 当新的Service Worker安装完成时
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // 显示更新提示
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Service Worker 注册失败：', error);
                document.getElementById('cache').textContent = '未启用';
                document.getElementById('cache-status').classList.add('not-cached');
            });
            
        // 如果页面已被控制，则监听控制它的Service Worker的变化
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service Worker已更新并接管页面');
            });
        }
    });
} else {
    // 获取浏览器版本信息
    const userAgent = navigator.userAgent;

    console.warn('当前浏览器不支持Service Worker');
    // 使用IndexedDB降级方案
    if (window.indexedDB && window.initFallbackCache) {
        console.log('启用IndexedDB资源缓存降级方案');
        window.addEventListener('load', () => {
            // 初始化IndexedDB资源缓存
            window.initFallbackCache();
        });
    } else {
        console.warn('当前浏览器不支持IndexedDB，无法启用降级方案');
    }
}

// 更新网络状态显示
function updateOnlineStatus() {
    const status = document.getElementById('status');
    const statusContainer = document.getElementById('online-status');
    
    if (navigator.onLine) {
        status.textContent = '在线';
        statusContainer.classList.remove('offline');
        statusContainer.classList.add('online');
    } else {
        status.textContent = '离线';
        statusContainer.classList.remove('online');
        statusContainer.classList.add('offline');
    }
}

// 更新缓存状态显示
async function updateCacheStatus() {
    const cacheStatus = document.getElementById('cache');
    const cacheContainer = document.getElementById('cache-status');
    
    try {
        // 检查是否有缓存
        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
            cacheStatus.textContent = '已启用';
            cacheContainer.classList.remove('not-cached');
            cacheContainer.classList.add('cached');
        } else {
            cacheStatus.textContent = '未启用';
            cacheContainer.classList.remove('cached');
            cacheContainer.classList.add('not-cached');
        }
    } catch (error) {
        console.error('检查缓存状态失败：', error);
        cacheStatus.textContent = '未知';
        cacheContainer.classList.remove('cached');
        cacheContainer.classList.add('not-cached');
    }
}

// 监听网络状态变化
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// 页面加载时检查网络状态
document.addEventListener('DOMContentLoaded', () => {
    updateOnlineStatus();
    
    // 设置保存笔记按钮事件
    const saveButton = document.getElementById('save-note');
    const noteInput = document.getElementById('note-input');
    
    saveButton.addEventListener('click', () => {
        const noteText = noteInput.value.trim();
        if (noteText) {
            saveNote(noteText);
            noteInput.value = '';
        }
    });
    
    // 加载已保存的笔记
    loadNotes();
});

// 保存笔记
async function saveNote(text) {
    try {
        const db = await openDB();
        const note = {
            text: text,
            timestamp: Date.now(),
            synced: navigator.onLine ? 1 : 0 // 如果在线，标记为已同步
        };
        
        await db.add('notes', note);
        
        // 更新笔记列表
        loadNotes();
        
        // 如果在线，尝试立即同步
        if (navigator.onLine) {
            syncNotes();
        } else if ('serviceWorker' in navigator && 'SyncManager' in window) {
            // 如果离线且支持后台同步，注册同步任务
            const registration = await navigator.serviceWorker.ready;
            try {
                await registration.sync.register('sync-notes');
                console.log('后台同步已注册');
            } catch (error) {
                console.error('注册后台同步失败：', error);
            }
        }
    } catch (error) {
        console.error('保存笔记失败：', error);
    }
}

// 加载笔记
async function loadNotes() {
    try {
        const db = await openDB();
        const notes = await db.getAll('notes');
        
        const notesList = document.getElementById('notes');
        notesList.innerHTML = '';
        
        if (notes.length === 0) {
            notesList.innerHTML = '<li>暂无笔记</li>';
            return;
        }
        
        // 按时间倒序排列
        notes.sort((a, b) => b.timestamp - a.timestamp);
        
        notes.forEach(note => {
            const li = document.createElement('li');
            li.textContent = note.text;
            
            // 添加同步状态指示
            if (!note.synced) {
                li.style.borderLeft = '3px solid #f8d7da';
                li.title = '等待同步';
            }
            
            notesList.appendChild(li);
        });
    } catch (error) {
        console.error('加载笔记失败：', error);
    }
}

// 同步笔记到服务器
async function syncNotes() {
    // 注意：这里只是示例，实际应用中需要实现真正的API调用
    console.log('尝试同步笔记到服务器...');
    
    try {
        const db = await openDB();
        const unsyncedNotes = await db.getAllFromIndex('notes', 'synced', false);
        console.log('unsyncedNotes', unsyncedNotes)
        
        if (unsyncedNotes.length === 0) return;
        
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
        
        // 重新加载笔记列表以更新UI
        loadNotes();
        
        console.log('笔记同步完成');
    } catch (error) {
        console.error('同步笔记失败：', error);
    }
}