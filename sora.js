// ==UserScript==
// @name         Sora
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Utility to get the source video on Sora
// @match        https://*.sora.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    function addButtonsToVideos() {
        const videoContainers = document.querySelectorAll('div[data-index]');

        videoContainers.forEach((container, index) => {
            if (container.querySelector('.custom-button')) return;

            const button = document.createElement('button');
            button.className = 'custom-button';
            button.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                width: 20px;
                height: 20px;
                z-index: 100;
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                border: none;
                padding: 0;
                border-radius: 5px;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="h-[18px] w-[18px]">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"></circle>
                    <path fill="currentColor" fill-rule="evenodd" d="M12 7.1a.9.9 0 0 1 .9.9v4l-.05 1.9 1.514-1.536a.9.9 0 1 1 1.272 1.272l-3 3a.9.9 0 0 1-1.272 0l-3-3a.9.9 0 0 1 1.272-1.272L11.15 13.9 11.1 12V8a.9.9 0 0 1 .9-.9" clip-rule="evenodd"></path>
                </svg>
            `;

            button.addEventListener('click', () => {
                const videoElement = container.querySelector('video');
                if (videoElement) {
                    const videoSrc = videoElement.getAttribute('src');
                    if (videoSrc) {
                        window.open(videoSrc, '_blank');
                    } else {
                        alert('Video source not found!');
                    }
                } else {
                    alert('Video element not found!');
                }
            });

            container.appendChild(button);
        });
    }



    window.addEventListener('load', () => {
        addButtonsToVideos();
        const observer = new MutationObserver(() => {
            addButtonsToVideos();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    });
})();
