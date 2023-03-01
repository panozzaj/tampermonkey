// ==UserScript==
// @name         LinkedIn
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=linkedin.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log('in LinkedIn script');

    function hideStuff() {
        const $ = window.$;
        // hide news
        //$('section#feed-news-module').hide();
        $('section.scaffold-layout__aside').hide();

        // Seems like they add whitespace in the classes every now and then?
        $('[class^="scaffold-layout__aside"]').hide();
        $('aside.right-rail').hide();

        // hide promoted posts
        $('div.feed-shared-update-v2').has('.update-components-actor__sub-description:contains("Promoted")').hide()
    }

    setTimeout(hideStuff, 500);
    setInterval(hideStuff, 1000);
})();
