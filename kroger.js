// ==UserScript==
// @name         Kroger
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.kroger.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kroger.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

/* globals $ */

(function() {
    'use strict';
    console.log('in Kroger userscript')

    // make original price easier to read (by default it is crossed out)
    const style = document.createElement('style');

    // note: using /* */ style comments in CSS is necessary!
    style.innerHTML = `
      /* don't strike out standard price (hard to read) */
      s.kds-Price-original {
        text-decoration: none !important;
      }

      /* display details of coupons on cart page */
      .SavingsZone--text {
        -webkit-line-clamp: unset !important;
      }
    `

    const $ = window.$;

    // https://stackoverflow.com/questions/8746882/jquery-contains-selector-uppercase-and-lower-case-issue
    $.expr[':'].icontains = function(a, i, m) {
        return $(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
    };

    function hideStuff() {
        // hide ads
        $('.espot-image').remove();

        // more ads. the class has periods in it, so escape per
        // https://stackoverflow.com/questions/350292
        $('.AmpHocEsperanto\\.DynamicRender\\.autorotator').hide();
        $('.AmpHocEsperanto\\.DynamicRender\\.espot').hide();
        $('.AmpHocEsperanto\\.DynamicRender\\.toacontainer\\.espot').hide();
        $('div[data-testid="monetization/search-page-top"]').hide();

        // hide Snap EBT
        $('.text-positive-less-prominent:icontains(Snap)').hide();
        $('svg.text-positive-less-prominent').hide();

        if (!document.head.contains(style)) {
            console.log('appending style');
            document.head.appendChild(style);
        }
    }

    setInterval(hideStuff, 500);
})();
