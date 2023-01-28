// ==UserScript==
// @name         New Userscript
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

    console.log('in tampermonkey scriupt: feedbin');

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

        document.dispatchEvent(event);
    }

    const $ = window.jQuery;

    function scrollContentHalfPage(key) {
        const halfPagePresses = 25;
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
        if (e.key === 'd') { // scroll down half page
            scrollContentHalfPage(40); // down arrow
            return false;
        } else if (e.key === 'u') { // scroll up half page
            scrollContentHalfPage(38); // up arrow
            return false;
        }
    });
})();
