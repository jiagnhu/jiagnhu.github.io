//@ts-nocheck
// 轮播功能实现
let videoSwiper; // 全局变量，用于在其他函数中访问视频轮播实例

document.addEventListener('DOMContentLoaded', () => {
    // 初始化视频轮播
    initVideoCarousel();
    
    // 初始化模态框事件
    initModalEvents();
});


// 初始化视频轮播
function initVideoCarousel() {
    videoSwiper = new Swiper('.video-carousel', {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: false, // 设置为false，以便检测最后一个视频
        pagination: {
            el: '.swiper-pagination-video',
            clickable: true,
        },
        navigation: {
            nextEl: '.swiper-button-next-video',
            prevEl: '.swiper-button-prev-video',
        },
        on: {
            slideChange: function () {
                // 暂停所有视频
                const videos = document.querySelectorAll('.video-carousel video');
                videos.forEach(video => {
                    video.pause();
                });
                
                // 自动播放当前幻灯片的视频
                const currentVideo = videos[videoSwiper.activeIndex];
                if (currentVideo) {
                    currentVideo.currentTime = 0; // 从头开始播放
                    currentVideo.play().catch(e => console.log('自动播放失败:', e));
                }
            }
        }
    });
    
    // 为所有视频添加ended事件监听器
    setupVideoEndedListeners();
}

// 视频点击播放/暂停功能
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'VIDEO') {
        if (e.target.paused) {
            e.target.play();
        } else {
            e.target.pause();
        }
    }
});

// 设置视频结束事件监听器
function setupVideoEndedListeners() {
    const videos = document.querySelectorAll('.video-carousel video');
    const totalVideos = videos.length;
    
    videos.forEach((video, index) => {
        video.addEventListener('ended', () => {
            // 检查是否是最后一个视频
            if (index === totalVideos - 1) {
                // 显示模态框
                showModal();
            } else {
                // 不是最后一个视频，切换到下一个
                videoSwiper.slideNext();
            }
        });
    });
    
    // 自动播放第一个视频
    if (videos.length > 0) {
        // 确保视频是静音的，以绕过浏览器自动播放限制
        videos[0].muted = true;
        
        // 尝试播放视频
        const playPromise = videos[0].play();
        
        // 处理播放承诺
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // 自动播放成功
                console.log('第一个视频自动播放成功');
            }).catch(e => {
                console.log('自动播放失败:', e);
                // 尝试再次播放，有些浏览器需要用户交互后才能播放
                document.addEventListener('click', function autoPlayAfterInteraction() {
                    videos[0].play();
                    document.removeEventListener('click', autoPlayAfterInteraction);
                }, { once: true });
            });
        }
    }
}

// 显示模态框
function showModal() {
    const modal = document.getElementById('next-page-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

// 隐藏模态框
function hideModal() {
    const modal = document.getElementById('next-page-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 初始化模态框事件
function initModalEvents() {
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            // 跳转到下一个页面，这里假设是offline.html
            window.location.href = 'offline.html';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // 隐藏模态框
            hideModal();
            // 重置视频轮播到第一个视频
            videoSwiper.slideTo(0);
            // 播放第一个视频
            const firstVideo = document.querySelector('.video-carousel video');
            if (firstVideo) {
                firstVideo.currentTime = 0;
                firstVideo.play().catch(e => console.log('自动播放失败:', e));
            }
        });
    }
}