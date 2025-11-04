// ==UserScript==
// @name         Feedbin
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://feedbin.com/
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=feedbin.com
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// ==/UserScript==

;(function () {
  'use strict'

  console.log('testing single quotes now')
  var test = 'should become single quotes'

  // https://gist.github.com/GlauberF/d8278ce3aa592389e6e3d4e758e6a0c2
  function simulateKey(keyCode, type, modifiers) {
    var evtName = typeof type === 'string' ? 'key' + type : 'keydown'
    var modifier = typeof modifiers === 'object' ? modifier : {}

    var event = document.createEvent('HTMLEvents')
    event.initEvent(evtName, true, false)
    event.keyCode = keyCode

    for (var i in modifiers) {
      event[i] = modifiers[i]
    }

    console.log(`Simulating key: ${keyCode}`)

    document.dispatchEvent(event)
  }

  const $ = window.jQuery

  function navigateArticle(direction) {
    console.log('[Custom Nav] ========== START ==========')
    console.log('[Custom Nav] direction:', direction)

    // Find currently selected article
    const currentArticle = document.querySelector('.entry-summary.selected')

    if (!currentArticle) {
      console.log('[Custom Nav] No article currently selected')
      return
    }

    const currentTitle =
      currentArticle.querySelector('.title')?.textContent || 'Unknown'
    console.log('[Custom Nav] Current article:', currentTitle)

    // Get all articles (li.entry-summary)
    const allArticles = Array.from(
      document.querySelectorAll('li.entry-summary')
    )
    const currentIndex = allArticles.indexOf(currentArticle)

    console.log(
      '[Custom Nav] Current index:',
      currentIndex,
      '/ Total articles:',
      allArticles.length
    )

    // Find next/previous visible article
    let targetArticle = null
    // Fix: handle both 'next'/'prev' AND 'previous'
    let step = direction === 'next' ? 1 : -1

    for (
      let i = currentIndex + step;
      i >= 0 && i < allArticles.length;
      i += step
    ) {
      const article = allArticles[i]
      const displayStyle = window.getComputedStyle(article).display
      const isVisible = displayStyle !== 'none'

      console.log(
        `[Custom Nav] Article ${i}: computed="${displayStyle}", visible=${isVisible}`
      )

      if (isVisible) {
        targetArticle = article
        const targetTitle =
          article.querySelector('.title')?.textContent || 'Unknown'
        console.log('[Custom Nav] ✓ Found target article:', targetTitle)
        break
      }
    }

    if (targetArticle) {
      console.log('[Custom Nav] Clicking target article')
      // Click the link inside the article, not the li element
      const link = targetArticle.querySelector('a.entry-summary-link')
      if (link) {
        link.click()
        targetArticle.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      } else {
        console.warn('[Custom Nav] Could not find link inside article')
      }
    } else {
      console.log('[Custom Nav] ✗ No more visible articles in that direction')
    }

    console.log('[Custom Nav] ========== END ==========')
  }

  function scrollContentHalfPage(key) {
    const halfPagePresses = 20
    if ($('.entry-column.selected').length > 0) {
      // only want to scroll if the content section is active
      // (otherwise we scroll down many articles)
      // TODO: if you move to the articles pane after pressing this
      // but before it finishes, you'll move down the articles.
      // Could check within the timeout handler or cancel the timeouts if
      // the articles section is selected.
      for (var i = 0; i < halfPagePresses; i++) {
        setTimeout(function () {
          simulateKey(key)
        }, i * 3)
      }
    }
  }

  function scrollToTop() {
    if (isArticlePaneFocused()) {
      const articlePane = document.querySelector('.entry-column.selected')
      if (!articlePane) return
      const contentContainer = articlePane.querySelector('.entry-content')
      if (contentContainer) contentContainer.scrollTop = 0
      articlePane.scrollTop = 0
      window.scrollTop = 0
    }
  }

  function scrollToBottom() {
    if (isArticlePaneFocused()) {
      const articlePane = document.querySelector('.entry-column.selected')
      if (!articlePane) return
      const contentContainer = articlePane.querySelector('.entry-content')
      if (contentContainer)
        contentContainer.scrollTop = contentContainer.scrollHeight
      articlePane.scrollTop = articlePane.scrollHeight
      window.scrollTop = document.body.scrollHeight
    }
  }

  function isArticlePaneFocused() {
    return $('.entry-column.selected').length > 0
  }

  function isArticleListPaneFocused() {
    return $('.entries-column.selected').length > 0
  }

  $('body').keydown(function (e) {
    if (e.key === 'l') {
      // Check if left nav (feeds column) is currently selected
      const feedsColumnFocused = $('.feeds-column.selected').length > 0

      if (feedsColumnFocused) {
        console.log(
          '[Key l] Pressed from left nav, will check article selection after switch'
        )
        // Let Feedbin handle 'l' to switch to article list, then check selection
        setTimeout(() => {
          const currentArticle = document.querySelector(
            '.entry-summary.selected'
          )
          if (currentArticle) {
            const isCurrentVisible =
              window.getComputedStyle(currentArticle).display !== 'none'

            if (!isCurrentVisible) {
              console.log(
                '[Key l] Selected article is hidden, selecting first visible'
              )
              const allArticles = Array.from(
                document.querySelectorAll('li.entry-summary')
              )
              const firstVisible = allArticles.find(
                (article) => window.getComputedStyle(article).display !== 'none'
              )

              if (firstVisible) {
                const link = firstVisible.querySelector('a.entry-summary-link')
                if (link) {
                  link.click()
                }
              }
            }
          }
        }, 100)
        // Let Feedbin handle 'l' normally to switch to article list
        return
      }

      // Intercept 'l' to open first visible article instead of potentially hidden one
      const articleFocused = isArticlePaneFocused()
      if (!articleFocused) {
        console.log('[Key l] Intercepting to find first visible article')

        // Check if current article is hidden
        const currentArticle = document.querySelector('.entry-summary.selected')
        if (currentArticle) {
          const isCurrentVisible =
            window.getComputedStyle(currentArticle).display !== 'none'

          if (!isCurrentVisible) {
            console.log(
              '[Key l] Current article is hidden, finding first visible'
            )
            e.preventDefault()
            e.stopPropagation()

            // Find first visible article
            const allArticles = Array.from(
              document.querySelectorAll('li.entry-summary')
            )
            const firstVisible = allArticles.find(
              (article) => window.getComputedStyle(article).display !== 'none'
            )

            if (firstVisible) {
              const link = firstVisible.querySelector('a.entry-summary-link')
              if (link) {
                link.click()
                // Small delay, then press 'l' to open article pane
                setTimeout(() => {
                  simulateKey(76) // 'l'
                }, 50)
              }
            }
            return
          }
        }
      }
      // Otherwise let Feedbin handle 'l' normally
    } else if (e.key === 'j' || e.key === 'k') {
      const articleFocused = isArticlePaneFocused()
      console.log(`[Key ${e.key}] Article pane focused: ${articleFocused}`)

      // Only let Feedbin handle j/k when article pane is focused (for scrolling)
      // Otherwise intercept to skip hidden articles
      if (!articleFocused) {
        console.log('[Key] Intercepting for custom navigation')
        e.preventDefault()
        e.stopPropagation()
        navigateArticle(e.key === 'j' ? 'next' : 'prev')
        return
      } else {
        console.log('[Key] Letting Feedbin handle it for article scrolling')
        // Let Feedbin handle it normally for scrolling in article
      }
    } else if (e.key === 'g' && !e.shiftKey) {
      scrollToTop()
    } else if (e.key === 'G') {
      scrollToBottom()
    } else if (e.key === 'd') {
      scrollContentHalfPage(40)
    } else if (e.key === 'u') {
      scrollContentHalfPage(38)
    } else if (e.key === 'n') {
      navigateArticle('next')
    } else if (e.key === 'p') {
      navigateArticle('prev')
    }
  })

  // Utility function to decode HTML entities (fixing &amp; → & issue)
  function decodeHTML(html) {
    let textArea = document.createElement('textarea')
    textArea.innerHTML = html
    return textArea.value
  }

  // Utility function to strip query parameters AFTER resolving the final URL
  function cleanURL(url) {
    try {
      let parsedUrl = new URL(url)
      let cleanedUrl = parsedUrl.origin + parsedUrl.pathname // Strip all query params
      console.log(`[Feedbin Enhanced Sharing] Cleaned final URL: ${cleanedUrl}`)
      return cleanedUrl
    } catch (e) {
      console.error('[Feedbin Enhanced Sharing] Invalid URL:', url)
      return url
    }
  }

  // Function to resolve Substack redirects correctly
  function resolveSubstackRedirect(
    substackUrl,
    postTitle,
    callback,
    depth = 0
  ) {
    if (depth > 3) {
      console.warn('[Feedbin Enhanced Sharing] Too many redirects, aborting.')
      callback(cleanURL(substackUrl), postTitle)
      return
    }

    // Decode any HTML-escaped characters (fix &amp; issue)
    substackUrl = decodeHTML(substackUrl)
    console.log(
      `[Feedbin Enhanced Sharing] Resolving Substack redirect (Attempt ${depth + 1}): ${substackUrl}`
    )

    GM_xmlhttpRequest({
      method: 'GET',
      url: substackUrl,
      onload: function (response) {
        let html = response.responseText

        // Check for a Location redirect header
        let redirectUrl = response.finalUrl
        if (redirectUrl && redirectUrl !== substackUrl) {
          console.log(
            `[Feedbin Enhanced Sharing] Redirect detected: ${redirectUrl}`
          )
          resolveSubstackRedirect(redirectUrl, postTitle, callback, depth + 1)
          return
        }

        // Extract canonical URL if available
        let canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/i)
        if (canonicalMatch) {
          let finalUrl = canonicalMatch[1]
          console.log(
            `[Feedbin Enhanced Sharing] Extracted canonical URL: ${finalUrl}`
          )
          callback(cleanURL(finalUrl), postTitle)
          return
        }

        // If no canonical URL, return the last visited URL
        console.warn(
          '[Feedbin Enhanced Sharing] No canonical URL found, using last resolved URL.'
        )
        callback(cleanURL(substackUrl), postTitle)
      },
      onerror: function () {
        console.error(
          '[Feedbin Enhanced Sharing] Error following Substack redirect:',
          substackUrl
        )
        callback(cleanURL(substackUrl), postTitle)
      },
    })
  }

  // Function to resolve the correct post URL from Feedbin newsletters or normal posts
  function resolveFinalURL(feedbinUrl, callback) {
    console.log(
      `[Feedbin Enhanced Sharing] Resolving final URL for: ${feedbinUrl}`
    )

    GM_xmlhttpRequest({
      method: 'GET',
      url: feedbinUrl,
      onload: function (response) {
        let html = response.responseText

        // Extract possible title and URL from newsletters
        let linkMatch = html.match(
          /<h1 class="post-title[^>]*>\s*<a href="([^"]+)"/i
        )
        let titleMatch = html.match(
          /<h1 class="post-title[^>]*>\s*<a [^>]*>([^<]+)<\/a>/i
        )

        if (linkMatch && titleMatch) {
          let finalUrl = decodeHTML(linkMatch[1]) // Fix &amp; → &
          let postTitle = titleMatch[1].trim()

          console.log(
            `[Feedbin Enhanced Sharing] Extracted from newsletter - Title: "${postTitle}", URL: ${finalUrl}`
          )

          // If the link is a Substack redirect, resolve it
          if (finalUrl.includes('substack.com/app-link/')) {
            resolveSubstackRedirect(finalUrl, postTitle, callback)
          } else {
            callback(cleanURL(finalUrl), postTitle)
          }
          return
        }
      },
      onerror: function () {
        console.error('[Feedbin Enhanced Sharing] Error fetching:', feedbinUrl)
        callback(cleanURL(feedbinUrl), 'Interesting post')
      },
    })
  }

  // Function to modify and open the Buffer share link
  function processShareLink(target) {
    let shareUrl = new URL(target.href)
    let originalUrl = decodeURIComponent(shareUrl.searchParams.get('url'))

    console.log(`[Feedbin Enhanced Sharing] Original Share URL: ${originalUrl}`)

    if (originalUrl.includes('newsletters.feedbinusercontent.com')) {
      console.log(
        '[Feedbin Enhanced Sharing] Detected Feedbin newsletter redirect, resolving...'
      )
      resolveFinalURL(originalUrl, function (finalUrl, postTitle) {
        let newShareUrl = `http://bufferapp.com/add?url=${encodeURIComponent(finalUrl)}&text=${encodeURIComponent('Interesting post: ' + postTitle)}`
        console.log(
          `[Feedbin Enhanced Sharing] Opening new share URL: ${newShareUrl}`
        )

        GM_openInTab(newShareUrl, {
          active: true,
          insert: true,
          setParent: true,
        })
      })
    } else {
      let cleanedUrl = cleanURL(originalUrl)
      let postTitle = $('.entry-inner .entry-header h1').text()
      console.log(`[Feedbin Enhanced Sharing] cleanedUrl: ${cleanedUrl}`)
      let newShareUrl = `http://bufferapp.com/add?url=${encodeURIComponent(cleanedUrl)}&text=${encodeURIComponent('Interesting post: ' + postTitle)}`
      console.log(
        `[Feedbin Enhanced Sharing] Opening new share URL: ${newShareUrl}`
      )
      GM_openInTab(newShareUrl, { active: true, insert: true, setParent: true })
    }
  }

  // Intercept clicks on the Buffer share button
  document.body.addEventListener('click', function (event) {
    let target = event.target.closest('a[data-behavior="share_popup"]')
    if (target) {
      event.preventDefault()
      event.stopPropagation()
      processShareLink(target)
    }
  })

  // Intercept keyboard shortcut "1" for sharing
  document.addEventListener('keydown', function (event) {
    if (event.key === '1' && !event.ctrlKey && !event.metaKey) {
      let target = document.querySelector('a[data-keyboard-shortcut="1"]')
      if (target) {
        event.preventDefault()
        processShareLink(target)
      }
    }
  })
})()
