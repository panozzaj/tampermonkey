// ==UserScript==
// @name         GitHub Universal Copy Button
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Enhances the GitHub copy button with a dropdown menu for copying various identifiers.
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

  const checkIcon = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="#1a7f37"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>`

  // Get issue/PR info from the page
  const getIssueInfo = () => {
    let title, number

    // Try modern view first
    const modernTitle = document.querySelector('[data-testid="issue-title"]')
    const modernNumber = document.querySelector(
      '[data-testid="issue-title"] + span'
    )
    if (modernTitle && modernNumber) {
      title = modernTitle.textContent.trim()
      number = modernNumber.textContent.trim()
      return { title, number, numericPart: number.replace(/\D/g, '') }
    }

    // Try sticky header
    const stickyTitle = document.querySelector(
      '[data-testid="issue-title-sticky"]'
    )
    const stickyNumber = document.querySelector(
      '[class*="StickyHeaderTitle-module__issueNumberText"]'
    )
    if (stickyTitle && stickyNumber) {
      title = stickyTitle.textContent.trim()
      number = stickyNumber.textContent.trim()
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

    return null
  }

  // Truncate text with ellipsis in the middle
  const truncateMiddle = (text, maxLen) => {
    if (text.length <= maxLen) return text
    const half = Math.floor((maxLen - 3) / 2)
    return text.slice(0, half) + '...' + text.slice(-half)
  }

  // Create dropdown menu
  const createDropdownMenu = (copyButton) => {
    const dropdown = document.createElement('div')
    dropdown.className = 'custom-copy-dropdown'
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      right: 0;
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
      if (needsTooltip) {
        item.title = opt.value
      }

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

        // Show checkmark alongside the label
        const check = item.querySelector('.item-check')
        check.style.display = 'block'

        setTimeout(() => {
          check.style.display = 'none'
          dropdown.style.display = 'none'
        }, 1000)
      })

      dropdown.appendChild(item)
    })

    return dropdown
  }

  // Enhance a copy button with dropdown
  const enhanceCopyButton = (copyButton, tooltip) => {
    if (copyButton.dataset.enhanced) return false
    copyButton.dataset.enhanced = 'true'

    // Update the tooltip text to just "Copy"
    if (tooltip) {
      tooltip.setAttribute('aria-label', 'Copy')
      tooltip.textContent = 'Copy'
    }

    // Create wrapper for positioning
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position: relative; display: inline-block;'

    // Insert wrapper
    copyButton.parentNode.insertBefore(wrapper, copyButton)
    wrapper.appendChild(copyButton)

    // Create and add dropdown
    const dropdown = createDropdownMenu(copyButton)
    wrapper.appendChild(dropdown)

    // Toggle dropdown on click
    copyButton.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()

      // Refresh issue info when opening - rebuild dropdown content
      while (dropdown.firstChild) {
        dropdown.removeChild(dropdown.firstChild)
      }
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
        if (needsTooltip) {
          item.title = opt.value
        }
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

      const isVisible = dropdown.style.display === 'block'
      dropdown.style.display = isVisible ? 'none' : 'block'
    })

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        dropdown.style.display = 'none'
      }
    })

    console.log('GitHub Copy Button Script: Enhanced copy button with dropdown')
    return true
  }

  const enhanceCopyButtons = () => {
    let anyEnhanced = false

    // Find all copy buttons with the "Copy link" tooltip
    // These are IconButtons with a sibling tooltip that says "Copy link"
    const tooltips = document.querySelectorAll(
      '[aria-label="Copy link"], span[id]:not([data-enhanced-tooltip])'
    )

    tooltips.forEach((tooltip) => {
      // Check if this is a "Copy link" tooltip
      if (
        tooltip.getAttribute('aria-label') === 'Copy link' ||
        tooltip.textContent === 'Copy link'
      ) {
        // Find the associated button
        const labelledById = tooltip.id
        let copyButton = null

        if (labelledById) {
          copyButton = document.querySelector(
            `button[aria-labelledby="${labelledById}"]`
          )
        }

        // Also try finding button right before this tooltip
        if (!copyButton && tooltip.previousElementSibling) {
          const prev = tooltip.previousElementSibling
          if (
            prev.tagName === 'BUTTON' &&
            prev.querySelector('.octicon-copy')
          ) {
            copyButton = prev
          }
        }

        if (copyButton && !copyButton.dataset.enhanced) {
          anyEnhanced = enhanceCopyButton(copyButton, tooltip) || anyEnhanced
          tooltip.dataset.enhancedTooltip = 'true'
        }
      }
    })

    // Stop polling once we've enhanced at least one button
    if (anyEnhanced && pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  const observer = new MutationObserver(enhanceCopyButtons)
  observer.observe(document.body, { childList: true, subtree: true })

  pollingTimer = setInterval(enhanceCopyButtons, 250)
})()
