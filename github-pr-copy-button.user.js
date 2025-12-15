// ==UserScript==
// @name         GitHub Universal Copy Button
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  A resilient script that adds a copy button to classic and modern GitHub views (PR, Issue, Project).
// @author       You
// @match        https://github.com/*/*/pull/*
// @match        https://github.com/*/*/issues/*
// @match        https://github.com/*/*/projects/*
// @match        https://github.com/orgs/*/projects/*
// @grant        none
// ==/UserScript==

// Copies the issue / PR description and issue number to the clipboard
// Example: "My Issue" (#1234)

;(function () {
  'use strict'
  console.log('GitHub Copy Button Script: Initializing...')

  let pollingTimer = null

  const baseButtonStyle = `
    background: none; border: 1px solid transparent; cursor: pointer;
    display: inline-flex; align-items: center;
    color: var(--fgColor-muted, #656d76); vertical-align: middle;
    border-radius: 6px; transition: all 0.2s;
  `

  const addHoverListeners = (button) => {
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--bgColor-neutral-muted, #f6f8fa)'
      button.style.borderColor = 'var(--borderColor-neutral-muted, #d0d7de)'
    })
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent'
      button.style.borderColor = 'transparent'
    })
  }

  const copyIcon = `<svg class="copy-icon" aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>`
  const checkIcon = `<svg class="check-icon" aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="#1a7f37"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>`

  // Truncates text with ellipsis in the middle if too long
  const truncateMiddle = (text, maxLen) => {
    if (text.length <= maxLen) return text
    const half = Math.floor((maxLen - 3) / 2)
    return text.slice(0, half) + '...' + text.slice(-half)
  }

  // Creates a button with copy icon and label text
  const createCopyButton = (copyText, displayText, ariaLabel) => {
    const button = document.createElement('button')
    button.className = 'custom-copy-button'
    button.setAttribute('aria-label', ariaLabel)
    button.style.cssText =
      baseButtonStyle +
      'padding: 2px 6px; margin-left: 4px; font-size: 12px; gap: 4px;'
    button.innerHTML = `
      <span class="copy-icon-wrapper">${copyIcon}</span>
      <span class="check-icon-wrapper" style="display: none;">${checkIcon}</span>
      <span class="button-label">${displayText}</span>
    `
    addHoverListeners(button)
    button.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      await navigator.clipboard.writeText(copyText)
      button.querySelector('.copy-icon-wrapper').style.display = 'none'
      button.querySelector('.check-icon-wrapper').style.display = 'inline-flex'
      setTimeout(() => {
        button.querySelector('.copy-icon-wrapper').style.display = 'inline-flex'
        button.querySelector('.check-icon-wrapper').style.display = 'none'
      }, 2000)
    })
    return button
  }

  // Try to add buttons for a specific view configuration
  // Returns true if buttons were added, false otherwise
  const tryAddButtons = (titleSelector, numberSelector, buttonClass) => {
    const titleElement = document.querySelector(titleSelector)
    const numberElement = document.querySelector(numberSelector)

    if (!titleElement || !numberElement) return false

    // Check if buttons already exist for this specific view
    const parent = numberElement.parentNode
    if (parent.querySelector(`.${buttonClass}`)) return true // Already exists

    const title = titleElement.textContent.trim()
    const number = numberElement.textContent.trim()
    const numericPart = number.replace(/\D/g, '')
    const fullCopyText = `"${title}" (${number})`

    // Create and insert the number button right after the number element
    const numberButton = createCopyButton(
      numericPart,
      numericPart,
      'Copy issue number'
    )
    numberButton.classList.add(buttonClass + '-number')
    parent.insertBefore(numberButton, numberElement.nextSibling)

    // Create and insert the full copy button after the number button
    const fullDisplayText = truncateMiddle(fullCopyText, 40)
    const fullButton = createCopyButton(
      fullCopyText,
      fullDisplayText,
      'Copy title and number'
    )
    fullButton.classList.add(buttonClass)
    parent.insertBefore(fullButton, numberButton.nextSibling)

    console.log(`GitHub Copy Button Script: Added buttons for ${buttonClass}`)
    return true
  }

  const addCopyButtons = () => {
    let anyButtonAdded = false

    // --- Attempt 1: "Classic" GitHub View ---
    anyButtonAdded =
      tryAddButtons(
        '.js-issue-title',
        '.gh-header-title .f1-light.color-fg-muted',
        'custom-copy-button-classic'
      ) || anyButtonAdded

    // --- Attempt 2: "Modern" GitHub View ---
    const modernNumberSelector =
      document.querySelector('[data-testid="issue-title"] + span') ||
      document.querySelector('a[data-hovercard-url*="/issues/"]')
    if (modernNumberSelector) {
      anyButtonAdded =
        tryAddButtons(
          '[data-testid="issue-title"]',
          modernNumberSelector.matches('[data-testid="issue-title"] + span')
            ? '[data-testid="issue-title"] + span'
            : 'a[data-hovercard-url*="/issues/"]',
          'custom-copy-button-modern'
        ) || anyButtonAdded
    }

    // --- Attempt 3: "Sticky Header" View (scrolled projects page) ---
    anyButtonAdded =
      tryAddButtons(
        '[data-testid="issue-title-sticky"]',
        '[class*="StickyHeaderTitle-module__issueNumberText"]',
        'custom-copy-button-sticky'
      ) || anyButtonAdded

    // Stop polling once we've added at least one button
    if (anyButtonAdded && pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  const observer = new MutationObserver(addCopyButtons)
  observer.observe(document.body, { childList: true, subtree: true })

  pollingTimer = setInterval(addCopyButtons, 250)
})()
