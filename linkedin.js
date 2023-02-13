// ==UserScript==
// @name         LinkedIn
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.linkedin.com/feed/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=linkedin.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function hideStuff() {
        const $ = window.$;
        // hide news
        $('section #feed-news-module').hide();
    }

    setTimeout(hideStuff, 500);
    setInterval(hideStuff, 1000);
})();
