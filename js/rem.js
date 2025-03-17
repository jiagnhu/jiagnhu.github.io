// 基准大小
const baseSize = 52;

// 设置 rem 函数
function setRem() {
    // 当前页面宽度相对于 375 宽的缩放比例，可根据自己需要修改
    const scale = document.documentElement.clientWidth / 375;
    // 设置页面根节点字体大小（"Math.min(scale, 2)" 指最高放大比例为2，可根据实际业务需求调整）
    document.documentElement.style.fontSize = baseSize * Math.min(scale, 2) + 'px';
}

// 初始化
setRem();

// 监听窗口变化
let timer, timer2;
window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(setRem, 300);

    clearTimeout(timer2);
    timer2 = setTimeout(setViewHeight, 300);
});

// 监听页面显示隐藏
window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        clearTimeout(timer);
        timer = setTimeout(setRem, 300);
    }
});

// 监听移动端浏览器工具栏显示/隐藏
window.addEventListener('orientationchange', () => {
  clearTimeout(timer2);
  timer2 = setTimeout(setViewHeight, 300);
});

// 动态设置视口高度
function setViewHeight() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setViewHeight();

