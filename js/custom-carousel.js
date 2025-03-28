class VideoCarousel {
  constructor(container, options = {}) {
      this.container = container;
      this.slides = options.slides || [];
      this.currentIndex = 0;
      this.videoElements = [];
      
      this.init();
  }
  
  init() {
      this.carouselContainer = this.container.querySelector('.carousel-container2');
      // this.prevBtn = this.container.querySelector('.carousel-control.prev');
      // this.nextBtn = this.container.querySelector('.carousel-control.next');
      this.indicatorsContainer = this.container.querySelector('.carousel-indicators');

      // 创建幻灯片和指示器
      this.slides.forEach((slide, index) => {
          // 创建视频元素
          const slideElement = document.createElement('div');
          slideElement.className = 'carousel-slide';
          
          const video = document.createElement('video');
          video.className = 'carousel-video';
          video.src = slide.src;
          video.poster = slide.poster;
          video.playsInline = true;
          video.controls = false;
          video.preload = 'none';
          
          video['webkit-playsinline'] = false;
          
          // 监听视频结束事件
          video.addEventListener('ended', () => this.handleVideoEnded());
          slideElement.appendChild(video);
          
          this.carouselContainer.appendChild(slideElement);
          this.videoElements.push(video);

          // 创建指示器
          const indicator = document.createElement('div');
          indicator.className = 'carousel-indicator';
          if (index === 0) indicator.classList.add('active');
          indicator.addEventListener('click', () => this.goToSlide(index));
          this.indicatorsContainer.appendChild(indicator);
      });

      // 初始化第一个视频
      // this.playCurrentVideo();

      // 事件监听
      // this.prevBtn.addEventListener('click', () => this.prevSlide());
      // this.nextBtn.addEventListener('click', () => this.nextSlide());
  }

  playCurrentVideo() {
      this.videoElements[this.currentIndex].play();
  }

  pauseCurrentVideo() {
      this.videoElements[this.currentIndex].pause();
  }

  handleVideoEnded() {
      if (this.currentIndex < this.slides.length - 1) {
          this.nextSlide();
      } else {
          showModal();
      }
  }

  updateCarousel() {
      const slideWidth = 100;
      this.carouselContainer.style.transform = `translateX(-${this.currentIndex * slideWidth}%)`;

      // 更新指示器
      const indicators = this.indicatorsContainer.querySelectorAll('.carousel-indicator');
      indicators.forEach((indicator, index) => {
          indicator.classList.toggle('active', index === this.currentIndex);
      });
  }

  goToSlide(index) {
      if (index < 0 || index >= this.slides.length) return;

      // 暂停当前视频
      this.pauseCurrentVideo();
      
      this.currentIndex = index;
      this.updateCarousel();
      this.playCurrentVideo();
  }

  prevSlide() {
      if (this.currentIndex > 0) {
          this.goToSlide(this.currentIndex - 1);
      }
  }

  nextSlide() {
      if (this.currentIndex < this.slides.length - 1) {
          this.goToSlide(this.currentIndex + 1);
      }
  }
}

// 使用示例
document.addEventListener('DOMContentLoaded', () => {
  const carouselElement = document.querySelector('.carousel');

  const carousel = new VideoCarousel(carouselElement, {
      slides: [
          {
              src: 'video/1.mp4',
              poster: 'video/cover-1.webp'
          },
          {
              src: 'video/2.mp4',
              poster: 'video/cover-2.webp'
          },
          {
              src: 'video/3.mp4',
              poster: 'video/cover-3.webp'
          },
          {
            src: 'video/4.mp4',
            poster: 'video/cover-4.webp'
        }
      ]
  });
  // 初始化模态框事件
  initModalEvents(carousel);
  // 初始化开始按钮事件
  initStartButtonEvent(carousel);
});

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


function initModalEvents(carousel) {
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
          // 播放第一个视频
          // 播放第一个视频，确保carousel存在
          if (carousel && typeof carousel.goToSlide === 'function') {
              carousel.goToSlide(0);
          } else {
              console.warn('Carousel对象不存在或goToSlide方法不可用');
          }
      });
  }
}

// 初始化开始按钮事件
function initStartButtonEvent(carousel) {
  const startBtn = document.querySelector('.btn-start');
  const pageFull = document.querySelector('.page-full');
  const carouselSection = document.querySelector('.carousel-section');

  if (startBtn) {
      startBtn.addEventListener('click', () => {
          if (pageFull) {
              pageFull.style.opacity = '0';
              setTimeout(() => {
                  pageFull.style.display = 'none';
              }, 500);
          }
          if (carouselSection) {
              carouselSection.style.display = 'block';
          }
          console.log('开始按钮被点击', carousel);
          // 播放第一个视频，确保carousel存在
          if (carousel && typeof carousel.goToSlide === 'function') {
              carousel.goToSlide(0);
          } else {
              console.warn('Carousel对象不存在或goToSlide方法不可用');
          }
      });
  }
}