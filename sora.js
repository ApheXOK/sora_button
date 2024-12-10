// ==UserScript==
// @name         Sora Video Downloader
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Utility to download source videos from Sora with error handling
// @match        https://*.sora.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js
// @resource     toastrCSS https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_cookie
// @grant        GM_download
// @grant        GM_getResourceText
// ==/UserScript==

(function () {
  "use strict";

  GM_addStyle(GM_getResourceText("toastrCSS"));

  toastr.options = {
    closeButton: false,
    debug: false,
    newestOnTop: false,
    progressBar: false,
    positionClass: "toast-top-right",
    preventDuplicates: false,
    onclick: null,
    showDuration: "300",
    hideDuration: "1000",
    timeOut: "5000",
    extendedTimeOut: "1000",
    showEasing: "swing",
    hideEasing: "linear",
    showMethod: "fadeIn",
    hideMethod: "fadeOut",
  };

  const showToast = (type, message, title = "") => {
    if (typeof toastr === "undefined") {
      console.error("Toastr library not loaded.");
      return;
    }
    toastr[type](message, title);
  };

  // Get cookies from the current domain
  const getCookies = async (url) => {
    try {
      const cookies = await new Promise((resolve, reject) =>
        GM_cookie.list({ url }, (cookies, error) =>
          error ? reject(new Error(error)) : resolve(cookies)
        )
      );

      return cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
    } catch (error) {
      console.error("Error getting cookies:", error);
      throw error;
    }
  };

  const getToken = async () => {
    const storedToken = localStorage.getItem("sora_access_token");
    if (storedToken) return storedToken;

    try {
      const cookies = await getCookies(document.URL);
      if (!cookies) throw new Error("Could not retrieve cookies");

      return await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://sora.com/api/auth/session",
          headers: { Cookie: cookies },
          onload: ({ status, responseText }) => {
            if (status !== 200) {
              reject(new Error(`HTTP error ${status}`));
            }
            const { accessToken } = JSON.parse(responseText);
            if (!accessToken) throw new Error("No access token found");

            localStorage.setItem("sora_access_token", accessToken);
            resolve(accessToken);
          },
          onerror: (error) => reject(error),
        });
      });
    } catch (error) {
      showToast("error", "Authentication failed. Please try again.");
      throw error;
    }
  };

  const createDownloadButton = () => {
    const button = document.createElement("button");
    button.className = "sora-download-btn";
    button.setAttribute("title", "Download Video");
    button.style.cssText = `
          position: absolute;
          top: 10px;
          left: 60px;
          width: 30px;
          height: 30px;
          z-index: 100;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
      `;
    button.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"></circle>
              <path fill="currentColor" fill-rule="evenodd" d="M12 7.1a.9.9 0 0 1 .9.9v4l-.05 1.9 1.514-1.536a.9.9 0 0 1 1.272 1.272l-3 3a.9.9 0 0 1-1.272 0l-3-3a.9.9 0 0 1 1.272-1.272L11.15 13.9 11.1 12V8a.9.9 0 0 1 .9-.9" clip-rule="evenodd"></path>
          </svg>`;
    return button;
  };

  const downloadVideo = async (id) => {
    try {
      const token = await getToken();
      const fullUrl = `https://sora.com/backend/generations/${id}`;

      GM_xmlhttpRequest({
        method: "GET",
        url: fullUrl,
        headers: { Authorization: `Bearer ${token}` },
        onload: ({ status, responseText }) => {
          if (status !== 200) {
            showToast("error", `HTTP error ${status}`);
            return;
          }

          const { url, title } = JSON.parse(responseText);
          if (!url) {
            showToast("error", "No video URL found.");
            return;
          }

          showToast("success", `Download with ${url}`)

          const filename = (title || `sora_video_${Date.now()}`) + ".mp4";
          GM_download({
            url,
            name: filename,
            saveAs: false,
            onload: () =>
              showToast("success", "DONE!"),
            onerror: (error) =>
              showToast("error", `Download failed: ${error.message}`),
          });
        },
        onerror: () => {
          document.body.removeChild(loadingAlert);
          showToast("error", "Failed to retrieve video information.");
        },
      });
    } catch (error) {
      showToast("error", `Unexpected error: ${error.message}`);
    }
  };

  const addButtonToVideoPage = () => {
    const navElement = document.querySelector(
      "body > main > div > div:nth-child(2) > div > div.flex.gap-0\\.5.justify-start.pl-1.tablet\\:pl-2"
    );

    if (!navElement || navElement.querySelector(".sora-download-btn")) return;

    const button = createDownloadButton();
    const currentUrl = window.location.href;
    const match = currentUrl.match(/\/g\/(gen_[a-zA-Z0-9]+)/);

    if (match) {
      const videoId = match[1];
      button.addEventListener("click", () => downloadVideo(videoId));
      navElement.appendChild(button);
    }
  };

  const addButtonsToExplorePage = () => {
    document.querySelectorAll("div[data-index]").forEach((container) => {
      if (container.querySelector(".sora-download-btn")) return;

      const videoLink = container.querySelector("a");
      const href = videoLink?.getAttribute("href");

      if (!href) return;

      const button = createDownloadButton();
      const match = href.match(/\/g\/(gen_[a-zA-Z0-9]+)/);

      if (match) {
        const videoId = match[1];
        button.addEventListener("click", () => downloadVideo(videoId));
        container.appendChild(button);
      }
    });
  };

  const init = () => {
    const currentUrl = window.location.href;

    if (/https:\/\/sora\.com\/g\/.*/.test(currentUrl)) {
      addButtonToVideoPage();
    } else if (/https:\/\/sora\.com\/explore\/.*/.test(currentUrl)) {
      addButtonsToExplorePage();
    }

    const observer = new MutationObserver(() => {
      if (/https:\/\/sora\.com\/g\/.*/.test(currentUrl)) {
        addButtonToVideoPage();
      } else if (/https:\/\/sora\.com\/explore\/.*/.test(currentUrl)) {
        addButtonsToExplorePage();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  window.addEventListener("load", init);
})();
