// ==UserScript==
// @name         Nextdoor
// @namespace    http://tampermonkey.net/
// @version      2024-09-29
// @description  try to take over the world!
// @author       You
// @match        https://nextdoor.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nextdoor.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

;(function () {
  "use strict"

  console.log("in custom script")
  const $ = window.$

  function hidePostsContainingText(regex) {
    const $posts = $('span[data-testid="feed-item-visibility-tracker"] span')
    $posts
      .filter(function () {
        const text = $(this).text()
        return regex.test(text)
      })
      .hide()
  }

  function hidePostsTitled(title) {
    const $posts = $('span[data-testid="feed-item-visibility-tracker"] span')
    $posts.has(`h2:contains('${title}')`).hide()
  }

  function hideStuff() {
    // hide ad sidebar
    $(
      ".hidden-xs.hidden-sm.col-md-12.col-lg-4.info-bar-container.with-navbar"
    ).hide()

    const $posts = $('span[data-testid="feed-item-visibility-tracker"] span')

    // hide promoted posts
    $posts.has('div span:contains("Sponsored")').hide()

    // remove animal-related posts
    hidePostsContainingText(/\bcat\b/i)
    hidePostsContainingText(/\bdog\b/i)

    // remove things I don't care about much
    hidePostsContainingText(/\bColts\b/)
    hidePostsContainingText(/\btickets?\b/)
    hidePostsContainingText(/\bmedicare\b/i)
    hidePostsContainingText(/\bmedicaid\b/i)
    hidePostsContainingText(/\bgarage sale\b/i)
    hidePostsContainingText(/\byard sale\b/i)
    hidePostsContainingText(/\boutage\b/i)

    // hide listings
    hidePostsTitled("Items for sale near you")
    hidePostsTitled("New free listings")
    hidePostsTitled("New listings for you")
  }

  setInterval(hideStuff, 500)
})()
