// ==UserScript==
// @name         Weather Underground
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.wunderground.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wunderground.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

(function() {
    console.log('in wunderground script');
    'use strict';
    const $ = window.$;

    // use whole screen for hourly forecast table
    function hideStuff() {
        $('.has-sidebar').removeClass('has-sidebar');
    }

    $("body").keypress(function(e) {
        if (e.key === '>' || e.key === '.') {
            $('button[aria-label="Next Day"]').click();
        } else if (e.key === '<' || e.key === ',') {
            $('button[aria-label="Previous Day"]').click();
        } else if (e.key === 'd') {
            $('a span:contains("10-Day")').click();
        } else if (e.key === 'h') {
            $('a span:contains("Hourly")').click();
        }
    });

    setTimeout(hideStuff, 500);
    setTimeout(hideStuff, 1000);
    setTimeout(hideStuff, 1500);

    // Your code here...
})();
