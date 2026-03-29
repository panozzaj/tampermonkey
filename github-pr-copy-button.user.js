// ==UserScript==
// @name         GitHub Universal Copy Button
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Adds a dropdown copy button next to PR/issue numbers for copying various identifiers.
// @author       You
// @match        https://github.com/*/*/pull/*
// @match        https://github.com/*/*/issues/*
// @match        https://github.com/*/*/projects/*
// @match        https://github.com/orgs/*/projects/*
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'
  console.log('GitHub Copy Button Script: Initializing...')

  let pollingTimer = null
  let injected = false
  let lastUrl = window.location.href

  const copyIcon = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>`

  const checkIcon = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="#1a7f37"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>`

  const getIssueInfo = () => {
    let title, number

    // New GitHub UI: h1 with data-component="PH_Title"
    const pageTitle = document.querySelector('h1[data-component="PH_Title"]')
    if (pageTitle) {
      const titleSpan = pageTitle.querySelector('.markdown-title')
      // Number span is sibling of title; .fgColor-muted class was removed
      const numberSpan = titleSpan?.nextElementSibling
      if (
        titleSpan &&
        numberSpan &&
        numberSpan.textContent.trim().startsWith('#')
      ) {
        title = titleSpan.textContent.trim()
        number = numberSpan.textContent.trim()
        return { title, number, numericPart: number.replace(/\D/g, '') }
      }
    }

    // Try data-testid selectors
    const modernTitle = document.querySelector('[data-testid="issue-title"]')
    const modernNumber = document.querySelector(
      '[data-testid="issue-title"] + span'
    )
    if (modernTitle && modernNumber) {
      title = modernTitle.textContent.trim()
      number = modernNumber.textContent.trim()
      return { title, number, numericPart: number.replace(/\D/g, '') }
    }

    // Try classic view
    const classicTitle = document.querySelector('.js-issue-title')
    const classicNumber = document.querySelector(
      '.gh-header-title .f1-light.color-fg-muted'
    )
    if (classicTitle && classicNumber) {
      title = classicTitle.textContent.trim()
      number = classicNumber.textContent.trim()
      return { title, number, numericPart: number.replace(/\D/g, '') }
    }

    // Fallback: parse from URL and document title
    const urlMatch = window.location.pathname.match(/\/(pull|issues)\/(\d+)/)
    if (urlMatch) {
      const num = urlMatch[2]
      // Document title format: "Title by author · Pull Request #123 · org/repo"
      const docTitle = document.title
      const titleMatch = docTitle.match(/^(.+?)(?:\s+by\s+|·)/)
      if (titleMatch) {
        title = titleMatch[1].trim()
        number = `#${num}`
        return { title, number, numericPart: num }
      }
    }

    return null
  }

  const truncateMiddle = (text, maxLen) => {
    if (text.length <= maxLen) return text
    const half = Math.floor((maxLen - 3) / 2)
    return text.slice(0, half) + '...' + text.slice(-half)
  }

  const buildDropdownItems = (dropdown) => {
    while (dropdown.firstChild) dropdown.removeChild(dropdown.firstChild)

    const info = getIssueInfo()
    const currentUrl = window.location.href
    const options = [{ value: currentUrl }]
    if (info) {
      options.push(
        { value: info.numericPart },
        { value: info.number },
        { value: info.title },
        { value: `"${info.title}" (${info.number})` }
      )
    }

    options.forEach((opt) => {
      const item = document.createElement('button')
      item.className = 'custom-copy-dropdown-item'
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        font-size: 14px;
        color: var(--fgColor-default, #1f2328);
        white-space: nowrap;
      `
      const displayText = truncateMiddle(opt.value, 50)
      const needsTooltip = opt.value.length > 50
      item.innerHTML = `<span class="item-label">${displayText}</span><span class="item-check" style="margin-left: auto; display: none;">${checkIcon}</span>`
      if (needsTooltip) item.title = opt.value

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'var(--bgColor-neutral-muted, #f6f8fa)'
      })
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent'
      })
      item.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        await navigator.clipboard.writeText(opt.value)
        const check = item.querySelector('.item-check')
        check.style.display = 'block'
        setTimeout(() => {
          check.style.display = 'none'
          dropdown.style.display = 'none'
        }, 1000)
      })
      dropdown.appendChild(item)
    })
  }

  const injectCopyButton = () => {
    // Reset injection state when URL changes (SPA navigation, side panel open/close)
    const currentUrl = window.location.href
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl
      const existing = document.querySelector('.custom-copy-btn-wrapper')
      if (existing) existing.remove()
      injected = false
      if (!pollingTimer) {
        pollingTimer = setInterval(injectCopyButton, 250)
      }
    }

    if (injected) return

    // Find the number span next to the title
    let numberEl = null
    let anchorEl = null

    // New GitHub UI
    const pageTitle = document.querySelector('h1[data-component="PH_Title"]')
    if (pageTitle) {
      const titleEl = pageTitle.querySelector('.markdown-title')
      numberEl = titleEl?.nextElementSibling
      if (numberEl && !numberEl.textContent.trim().startsWith('#')) {
        numberEl = null
      }
      anchorEl = numberEl
    }

    // data-testid approach
    if (!numberEl) {
      const modernTitle = document.querySelector('[data-testid="issue-title"]')
      if (modernTitle) {
        numberEl = modernTitle.nextElementSibling
        anchorEl = numberEl
      }
    }

    // Classic view
    if (!numberEl) {
      numberEl = document.querySelector(
        '.gh-header-title .f1-light.color-fg-muted'
      )
      anchorEl = numberEl
    }

    if (!anchorEl) return

    injected = true
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }

    // Create the copy button
    const wrapper = document.createElement('span')
    wrapper.className = 'custom-copy-btn-wrapper'
    wrapper.style.cssText =
      'position: relative; display: inline-flex; align-items: center; vertical-align: middle; margin-left: 4px;'

    const btn = document.createElement('button')
    btn.className = 'btn-octicon'
    btn.setAttribute('aria-label', 'Copy')
    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--fgColor-muted, #656d76);
      border-radius: 6px;
    `
    btn.innerHTML = copyIcon

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = 'var(--bgColor-neutral-muted, #f6f8fa)'
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = 'transparent'
    })

    const dropdown = document.createElement('div')
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: var(--bgColor-default, #ffffff);
      border: 1px solid var(--borderColor-default, #d0d7de);
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
      z-index: 100;
      min-width: 350px;
      padding: 4px 0;
      display: none;
    `

    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      buildDropdownItems(dropdown)
      const isVisible = dropdown.style.display === 'block'
      dropdown.style.display = isVisible ? 'none' : 'block'
      if (!isVisible) {
        // Pick the side with more room
        dropdown.style.left = '0'
        dropdown.style.right = 'auto'
        const rect = dropdown.getBoundingClientRect()
        if (rect.right > window.innerWidth) {
          dropdown.style.left = 'auto'
          dropdown.style.right = '0'
        }
      }
    })

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        dropdown.style.display = 'none'
      }
    })

    wrapper.appendChild(btn)
    wrapper.appendChild(dropdown)
    anchorEl.after(wrapper)

    console.log('GitHub Copy Button Script: Injected copy button')
  }

  const observer = new MutationObserver(injectCopyButton)
  observer.observe(document.body, { childList: true, subtree: true })
  pollingTimer = setInterval(injectCopyButton, 250)
})()
