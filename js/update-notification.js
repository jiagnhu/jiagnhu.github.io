// 更新提示相关功能

// 显示更新提示
function showUpdateNotification() {
    // 检查是否已经显示了更新提示
    if (document.getElementById('update-notification')) {
        return;
    }
    
    // 创建更新提示元素
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <p>发现新版本！</p>
            <div class="update-actions">
                <button id="update-now">立即更新</button>
                <button id="update-later">稍后更新</button>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 添加样式
    if (!document.getElementById('update-notification-style')) {
        const style = document.createElement('style');
        style.id = 'update-notification-style';
        style.textContent = `
            .update-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #4285f4;
                color: white;
                padding: 15px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                animation: slide-in 0.3s ease-out;
            }
            
            @keyframes slide-in {
                from { transform: translateY(100px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .update-content p {
                margin: 0 0 10px 0;
                font-weight: bold;
            }
            
            .update-actions {
                display: flex;
                gap: 10px;
            }
            
            .update-actions button {
                padding: 8px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            }
            
            #update-now {
                background-color: white;
                color: #4285f4;
            }
            
            #update-later {
                background-color: transparent;
                color: white;
                border: 1px solid white;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 添加事件监听器
    document.getElementById('update-now').addEventListener('click', () => {
        // 刷新页面以应用新版本
        window.location.reload();
    });
    
    document.getElementById('update-later').addEventListener('click', () => {
        // 隐藏提示
        notification.remove();
    });
}

// 导出函数
window.showUpdateNotification = showUpdateNotification;