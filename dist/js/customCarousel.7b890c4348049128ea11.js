(()=>{function e(t){return e="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},e(t)}function t(e,t){for(var o=0;o<t.length;o++){var i=t[o];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,n(i.key),i)}}function n(t){var n=function(t,n){if("object"!=e(t)||!t)return t;var o=t[Symbol.toPrimitive];if(void 0!==o){var i=o.call(t,n||"default");if("object"!=e(i))return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===n?String:Number)(t)}(t,"string");return"symbol"==e(n)?n:n+""}var o=function(){return e=function e(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.container=t,this.slides=n.slides||[],this.currentIndex=0,this.videoElements=[],this.init()},(n=[{key:"init",value:function(){var e=this;this.carouselContainer=this.container.querySelector(".carousel-container2"),this.indicatorsContainer=this.container.querySelector(".carousel-indicators"),this.slides.forEach((function(t,n){var o=document.createElement("div");o.className="carousel-slide",o.style.backgroundImage="url(".concat(t.poster,")"),o.style.backgroundSize="cover",o.style.backgroundPosition="center",o.style.backgroundRepeat="no-repeat";var i=document.createElement("video");i.className="carousel-video",i.src=t.src,i.poster=t.poster,i.playsInline=!0,i.controls=!1,i.preload="none",i["webkit-playsinline"]=!1,i.addEventListener("ended",(function(){return e.handleVideoEnded()})),o.appendChild(i),e.carouselContainer.appendChild(o),e.videoElements.push(i);var r=document.createElement("div");r.className="carousel-indicator",0===n&&r.classList.add("active"),r.addEventListener("click",(function(){return e.goToSlide(n)})),e.indicatorsContainer.appendChild(r)}))}},{key:"playCurrentVideo",value:function(){this.videoElements[this.currentIndex].play()}},{key:"pauseCurrentVideo",value:function(){this.videoElements[this.currentIndex].pause()}},{key:"handleVideoEnded",value:function(){var e;this.currentIndex<this.slides.length-1?this.nextSlide():(e=document.getElementById("next-page-modal"))&&e.classList.add("show")}},{key:"updateCarousel",value:function(){var e=this;this.carouselContainer.style.transform="translateX(-".concat(100*this.currentIndex,"%)"),this.indicatorsContainer.querySelectorAll(".carousel-indicator").forEach((function(t,n){t.classList.toggle("active",n===e.currentIndex)}))}},{key:"goToSlide",value:function(e){e<0||e>=this.slides.length||(this.pauseCurrentVideo(),this.currentIndex=e,this.updateCarousel(),this.playCurrentVideo())}},{key:"prevSlide",value:function(){this.currentIndex>0&&this.goToSlide(this.currentIndex-1)}},{key:"nextSlide",value:function(){this.currentIndex<this.slides.length-1&&this.goToSlide(this.currentIndex+1)}}])&&t(e.prototype,n),o&&t(e,o),Object.defineProperty(e,"prototype",{writable:!1}),e;var e,n,o}();document.addEventListener("DOMContentLoaded",(function(){var e=document.querySelector(".carousel"),t=new o(e,{slides:[{src:"video/1.mp4",poster:"video/cover-1.webp"},{src:"video/2.mp4",poster:"video/cover-2.webp"},{src:"video/3.mp4",poster:"video/cover-3.webp"},{src:"video/4.mp4",poster:"video/cover-4.webp"}]});!function(e){var t=document.getElementById("modal-confirm"),n=document.getElementById("modal-cancel");t&&t.addEventListener("click",(function(){window.location.href="offline.html"}));n&&n.addEventListener("click",(function(){var t;(t=document.getElementById("next-page-modal"))&&t.classList.remove("show"),e&&"function"==typeof e.goToSlide&&e.goToSlide(0)}))}(t),function(e){var t=document.querySelector(".btn-start"),n=document.querySelector(".page-full"),o=document.querySelector(".carousel-section");t&&t.addEventListener("click",(function(){n&&(n.style.opacity="0",setTimeout((function(){n.style.display="none"}),500)),o&&(o.style.display="block"),e&&"function"==typeof e.goToSlide&&e.goToSlide(0)}))}(t)}))})();