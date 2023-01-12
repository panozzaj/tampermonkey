// ==UserScript==
// @name         Kroger
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.kroger.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kroger.com
// @require https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

/* globals $ */

(function() {
    'use strict';

    // make original price easier to read (by default it is crossed out)
    const style = document.createElement('style');
    style.innerHTML = 's.kds-Price-original { text-decoration: none !important; }';


    function hideStuff() {
        const $ = window.$;
        // hide ads
        $('.espot-image').hide();
        document.head.appendChild(style);
    }

    setTimeout(hideStuff, 500);
    setInterval(hideStuff, 1000);
})();
