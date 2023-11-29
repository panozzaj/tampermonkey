// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.amazon.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @require      http://code.jquery.com/jquery-latest.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log('here in script');
    const $ = window.jQuery;

    function hideStuff() {
        // drastically simplify home page by removing all content
        const location = window.location.href;
        if (location === 'https://www.amazon.com/' || location === 'https://www.amazon.com/ref=nav_logo') {
            $('#pageContent').html("<div style='min-height: 1000px'>&nbsp;</div>");
        }

        // says where it's shipping to. don't care until checkout
        $('#nav-global-location-slot').hide();

        // change language. it's always English for me
        $('#icp-nav-flyout').hide();

        // sign up for credit card banner
        $('#sc-new-upsell').hide();

        // recommended items in cart
        $('#cart-item-recs').hide();

        // top navbar. I only typically use search so not useful to me
        $('#nav-main').hide();

        // urgency countdown timer (inside navbar)
        //$('.nav-swm-countdown-wrapper').hide();

        // recommendations based on history / gift recommendations
        $('#rhf').hide();

        // recommendations in search results popover
        $('.cards_carousel_widget-suggestion').hide();

        // "trending" searches in search results popover
        $('.s-suggestion-trending-container').hide();

        // recent searches in search results popover
        $('.s-suggestion-container').filter(function() {
            return $(this).find('.s-recentSearchDistinct').length > 0;
        }).hide();

        /* product details page */

        // hide various ads
        $('#percolate-ui-ilm_feature_div').hide();
        $('#amsDetailRight_feature_div').hide();
        $('#heroQuickPromo_feature_div').hide();
        $('#cr-ADPlaceholder').hide();

        // subnav, doesn't add much for me
        $('#nav-progressive-subnav').hide();

        // "Inspiration from this brand"
        $('#postsSameBrandCard_feature_div').hide();
    }

    setTimeout(hideStuff, 100);
    setTimeout(hideStuff, 300);
    setInterval(hideStuff, 500);
})();
