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

;(function () {
  console.log('in wunderground script')
  ;('use strict')
  const $ = window.$

  function hideStuff() {
    // use whole screen for hourly forecast table
    $('.has-sidebar').removeClass('has-sidebar')
    $('.region-sidebar').hide()

    // hide ads
    $('ad-wx-ws').hide()
    $('ad-wx-mid-300-var').hide()
    $('ad-wx-mid-leader').hide()

    // bottom ad content
    $('lib-video-promo').hide()
    $('lib-cat-six-latest-article').hide()
  }

  $('body').keypress(function (e) {
    // Check if the target is an input, in which case the user is probably typing
    if ($(e.target).is('input, textarea, [contenteditable="true"]')) {
      return
    }

    if (e.key === '>' || e.key === '.') {
      $('button[aria-label="Next Day"]').click()
    } else if (e.key === '<' || e.key === ',') {
      $('button[aria-label="Previous Day"]').click()
    } else if (e.key === 'd' || e.key === 'w') {
      // d = daily
      // w = weekly
      $('a span:contains("10-Day")').click()
    } else if (e.key === 'h') {
      $('a span:contains("Hourly")').click()
    }
  })

  setInterval(hideStuff, 250)
})()
