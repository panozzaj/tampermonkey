// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        *.airbrake.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=airbrake.io
// @require https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

;(function () {
  "use strict"

  console.log("in airbrake tampermonkey script")

  $("body").keypress(function (e) {
    // go to next occurrence
    if (e.key === "<" || e.key === ",") {
      const button = document.querySelector(
        ".occurrence-header button.btn i.glyphicon.glyphicon-angle-left"
      )
      if (button && button.parentNode) {
        button.parentNode.click()
      }
    } else if (e.key === ">" || e.key === ".") {
      const button = document.querySelector(
        ".occurrence-header button.btn i.glyphicon.glyphicon-angle-right"
      )
      if (button && button.parentNode) {
        button.parentNode.click()
      }
    }
  })
})()
