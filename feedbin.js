// ==UserScript==
// @name         Feedbin
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://feedbin.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=feedbin.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('in tampermonkey script: feedbin');

    // https://gist.github.com/GlauberF/d8278ce3aa592389e6e3d4e758e6a0c2
    function simulateKey (keyCode, type, modifiers) {
        var evtName = (typeof(type) === "string") ? "key" + type : "keydown";
        var modifier = (typeof(modifiers) === "object") ? modifier : {};

        var event = document.createEvent("HTMLEvents");
        event.initEvent(evtName, true, false);
        event.keyCode = keyCode;

        for (var i in modifiers) {
            event[i] = modifiers[i];
        }

        console.log(`Simulating key: ${keyCode}`);

        document.dispatchEvent(event);
    }

    const $ = window.jQuery;

    function navigateArticle(direction) {
        console.log('direction: ', direction);

        const isArticlePaneFocused = $('.entry-column.selected').length > 0;
        const isArticleListPaneFocused = $('.entries-column.selected').length > 0;

        if (isArticlePaneFocused) {
            console.log('isArticlePaneFocused');
            // Go to middle pane
            simulateKey(72); // 'h'
            setTimeout(() => {
                // Move up or down
                simulateKey(direction === 'next' ? 74 : 75); // 'j' or 'k'
                setTimeout(() => {
                    // Go back to article pane
                    simulateKey(76); // 'l'
                }, 50);
            }, 50);
        } else if (isArticleListPaneFocused) {
            console.log('isArticleListPaneFocused');
            // Just move up or down
            simulateKey(direction === 'next' ? 74 : 75); // 'j' or 'k'
        } else {
            console.log('neither is recognized as focused');
        }
    }

    function scrollContentHalfPage(key) {
        const halfPagePresses = 20;
        if ($('.entry-column.selected').length > 0) {
            // only want to scroll if the content section is active
            // (otherwise we scroll down many articles)
            for (var i = 0; i < halfPagePresses; i++) {
                setTimeout(function() {
                    simulateKey(key);
                }, i * 3);
            }
        }
    }

    $('body').keydown(function(e) {
        // never mind, these are also usable with shift+j and shift+k
        if (e.key === 'd') { // scroll down half page
            scrollContentHalfPage(40); // down arrow
        } else if (e.key === 'u') { // scroll up half page
            scrollContentHalfPage(38); // up arrow
        } else if (e.key === 'n') {
            navigateArticle('next');
        } else if (e.key === 'p') {
            navigateArticle('previous');
        }
    });
})();
