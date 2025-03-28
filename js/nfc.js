// NFC功能实现
// 使用Web NFC API，仅支持Android Chrome 81+
const enableNFCModule = true;
// 检查浏览器是否支持NFC
function isNfcSupported() {
    return 'NDEFReader' in window;
}

// NFC状态对象
const nfcStatus = {
    supported: false,
    enabled: false,
    message: '检查中...',
    lastTagRead: null
};

// 初始化NFC功能
async function initNFC() {
    // 更新NFC状态显示
    updateNfcStatusUI();
    
    // 检查浏览器是否支持NFC
    if (!isNfcSupported()) {
        nfcStatus.supported = false;
        nfcStatus.message = '当前浏览器不支持NFC功能';
        updateNfcStatusUI();
        return;
    }
    
    nfcStatus.supported = true;
    nfcStatus.message = 'NFC可用，等待扫描...';
    updateNfcStatusUI();
    
    try {
        // 创建NDEFReader实例
        const ndef = new NDEFReader();
        
        // 添加事件监听器
        ndef.addEventListener('reading', ({ message, serialNumber }) => {
            console.log(`NFC标签读取成功，序列号: ${serialNumber}`);
            handleNfcReading(message, serialNumber);
        });
        
        ndef.addEventListener('readingerror', () => {
            console.error('NFC标签读取失败');
            nfcStatus.message = 'NFC标签读取失败，请重试';
            updateNfcStatusUI();
        });
        
        // 开始扫描NFC标签
        await ndef.scan();
        nfcStatus.enabled = true;
        nfcStatus.message = 'NFC扫描已启动，请将NFC标签靠近设备';
        updateNfcStatusUI();
        
        console.log('NFC扫描已启动');
    } catch (error) {
        console.error('NFC扫描启动失败:', error);
        nfcStatus.enabled = false;
        
        // 处理不同类型的错误
        if (error.name === 'NotAllowedError') {
            nfcStatus.message = 'NFC权限被拒绝，请在浏览器设置中允许NFC访问';
        } else if (error.name === 'NotSupportedError') {
            nfcStatus.message = '设备不支持NFC或NFC未启用';
        } else {
            nfcStatus.message = `NFC初始化失败: ${error.message}`;
        }
        
        updateNfcStatusUI();
    }
}

// 处理NFC读取事件
function handleNfcReading(message, serialNumber) {
    // 存储最后读取的标签信息
    nfcStatus.lastTagRead = {
        serialNumber,
        timestamp: new Date(),
        records: []
    };
    
    // 解析NDEF消息记录
    for (const record of message.records) {
        console.log('记录类型:', record.recordType);
        console.log('MIME类型:', record.mediaType);
        
        let recordData = {
            type: record.recordType,
            mediaType: record.mediaType,
            data: null
        };
        
        // 根据记录类型处理数据
        if (record.recordType === 'text') {
            // 文本记录
            const textDecoder = new TextDecoder();
            recordData.data = textDecoder.decode(record.data);
        } else if (record.recordType === 'url') {
            // URL记录
            const textDecoder = new TextDecoder();
            recordData.data = textDecoder.decode(record.data);
        } else if (record.mediaType && record.mediaType.startsWith('application/json')) {
            // JSON数据
            const textDecoder = new TextDecoder();
            try {
                recordData.data = JSON.parse(textDecoder.decode(record.data));
            } catch (e) {
                recordData.data = textDecoder.decode(record.data);
            }
        } else {
            // 其他类型的数据，以十六进制显示
            recordData.data = Array.from(new Uint8Array(record.data))
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' ');
        }
        
        nfcStatus.lastTagRead.records.push(recordData);
    }
    
    // 更新UI显示
    nfcStatus.message = `已读取NFC标签，序列号: ${serialNumber}`;
    updateNfcStatusUI();
    
    // 显示NFC标签内容
    displayNfcTagContent();
    
    // 如果需要，可以在这里添加自定义业务逻辑
    // 例如：验证标签ID、处理特定格式的数据等
}

// 更新NFC状态UI
function updateNfcStatusUI() {
    const nfcStatusElement = document.getElementById('nfc-status');
    if (!nfcStatusElement) return;
    
    const statusSpan = nfcStatusElement.querySelector('span');
    if (!statusSpan) return;
    
    statusSpan.textContent = nfcStatus.message;
    
    // 更新状态样式
    nfcStatusElement.classList.remove('nfc-supported', 'nfc-not-supported', 'nfc-enabled');
    
    if (!nfcStatus.supported) {
        nfcStatusElement.classList.add('nfc-not-supported');
    } else if (nfcStatus.enabled) {
        nfcStatusElement.classList.add('nfc-enabled');
    } else {
        nfcStatusElement.classList.add('nfc-supported');
    }
}

// 显示NFC标签内容
function displayNfcTagContent() {
    const nfcContentElement = document.getElementById('nfc-content');
    if (!nfcContentElement || !nfcStatus.lastTagRead) return;
    
    // 清空现有内容
    nfcContentElement.innerHTML = '';
    
    // 创建标签信息元素
    const tagInfo = document.createElement('div');
    tagInfo.className = 'nfc-tag-info';
    tagInfo.innerHTML = `
        <h3>NFC标签信息</h3>
        <p><strong>序列号:</strong> ${nfcStatus.lastTagRead.serialNumber}</p>
        <p><strong>读取时间:</strong> ${nfcStatus.lastTagRead.timestamp.toLocaleString()}</p>
    `;
    
    // 创建记录列表
    const recordsList = document.createElement('div');
    recordsList.className = 'nfc-records-list';
    
    if (nfcStatus.lastTagRead.records.length > 0) {
        const recordsTitle = document.createElement('h3');
        recordsTitle.textContent = '标签内容';
        recordsList.appendChild(recordsTitle);
        
        const recordsContainer = document.createElement('div');
        recordsContainer.className = 'records-container';
        
        nfcStatus.lastTagRead.records.forEach((record, index) => {
            const recordItem = document.createElement('div');
            recordItem.className = 'record-item';
            
            let recordContent = `
                <div class="record-header">记录 ${index + 1}</div>
                <div class="record-body">
                    <p><strong>类型:</strong> ${record.type}</p>
            `;
            
            if (record.mediaType) {
                recordContent += `<p><strong>MIME类型:</strong> ${record.mediaType}</p>`;
            }
            
            recordContent += `<p><strong>数据:</strong> `;
            
            // 根据数据类型显示不同的内容
            if (typeof record.data === 'object') {
                recordContent += `</p><pre>${JSON.stringify(record.data, null, 2)}</pre>`;
            } else {
                recordContent += `${record.data}</p>`;
            }
            
            recordContent += `</div>`;
            recordItem.innerHTML = recordContent;
            
            recordsContainer.appendChild(recordItem);
        });
        
        recordsList.appendChild(recordsContainer);
    } else {
        const noRecords = document.createElement('p');
        noRecords.textContent = '标签中没有NDEF记录';
        recordsList.appendChild(noRecords);
    }
    
    // 添加到内容区域
    nfcContentElement.appendChild(tagInfo);
    nfcContentElement.appendChild(recordsList);
    
    // 显示内容区域
    nfcContentElement.style.display = 'block';
}

// 导出函数
window.nfcUtils = {
    init: initNFC,
    isSupported: isNfcSupported,
    getStatus: () => ({ ...nfcStatus })
};

// 当DOM加载完成后自动初始化NFC（如果需要）
document.addEventListener('DOMContentLoaded', () => {
    if (enableNFCModule) {
         // 检查是否有NFC状态显示元素
        const nfcStatusElement = document.getElementById('nfc-status');
        if (nfcStatusElement) {
            // 自动初始化NFC
            initNFC();
            // 初始化NFC功能的代码
            console.log('NFC模块已启用');
        } else {
            console.warn('找不到NFC状态显示元素');
        }
    } else {
        console.warn('NFC模块未启用');
    }
   
});