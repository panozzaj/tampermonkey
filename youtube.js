// ==UserScript==
// @name         YouTube
// @namespace    http://tampermonkey.net/
// @version      2024-09-16
// @description  try to take over the world!
// @author       You
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('here in userscript');

    // Add styles to hide reels/shorts
    GM_addStyle(`
        ytd-reel-shelf-renderer,
        ytd-rich-shelf-renderer[is-shorts],
        ytd-reel-shelf-renderer[is-shorts] {
            display: none !important;
        }
    `);

    // Log to console to confirm script execution
    console.log('YouTube Hide Reels script has been applied');
})();
