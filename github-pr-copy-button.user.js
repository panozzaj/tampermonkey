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
  "use strict"
  console.log("GitHub Copy Button Script: Initializing...")

  let pollingTimer = null

  const addCopyButton = () => {
    // If button is already on the page, our work is done.
    if (document.querySelector(".custom-copy-button")) {
      if (pollingTimer) clearInterval(pollingTimer)
      return
    }

    let titleElement, numberElement, insertionTarget

    // --- Attempt 1: Find elements for the "Classic" GitHub View ---
    titleElement = document.querySelector(".js-issue-title")
    numberElement = document.querySelector(
      ".gh-header-title .f1-light.color-fg-muted"
    )

    // If that combination failed, reset and try the modern view.
    if (!titleElement || !numberElement) {
      // --- Attempt 2: Find elements for the "Modern" GitHub View ---
      titleElement = document.querySelector('[data-testid="issue-title"]')
      // This handles both the linked number in side-panes and the text number in full-page views.
      numberElement =
        document.querySelector('a[data-hovercard-url*="/issues/"]') ||
        document.querySelector('[data-testid="issue-title"] + span')
    }

    // After trying all methods, check if we have what we need.
    if (titleElement && numberElement) {
      insertionTarget = numberElement.parentNode
    } else {
      return // No known element combination found. Page might still be loading.
    }

    console.log("GitHub Copy Button Script: Elements found! Adding the button.")

    const title = titleElement.textContent.trim()
    const number = numberElement.textContent.trim()
    const copyText = `"${title}" (${number})`

    const button = document.createElement("button")
    button.className = "custom-copy-button"
    button.setAttribute("aria-label", "Copy title and number")
    button.style.cssText = `
            background: none; border: 1px solid transparent; cursor: pointer; padding: 3px 8px;
            margin-left: 8px; display: inline-flex; align-items: center;
            color: var(--fgColor-muted, #656d76); vertical-align: middle; border-radius: 6px; transition: all 0.2s;
        `
    button.innerHTML = `
            <svg class="copy-icon" aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>
            <svg class="check-icon" style="display: none;" aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="#1a7f37"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>
        `
    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = "var(--bgColor-neutral-muted, #f6f8fa)"
      button.style.borderColor = "var(--borderColor-neutral-muted, #d0d7de)"
    })
    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "transparent"
      button.style.borderColor = "transparent"
    })
    button.addEventListener("click", async (e) => {
      e.preventDefault()
      e.stopPropagation()
      await navigator.clipboard.writeText(copyText)
      const copyIcon = button.querySelector(".copy-icon")
      const checkIcon = button.querySelector(".check-icon")
      copyIcon.style.display = "none"
      checkIcon.style.display = "block"
      setTimeout(() => {
        copyIcon.style.display = "block"
        checkIcon.style.display = "none"
      }, 2000)
    })

    insertionTarget.insertBefore(button, numberElement.nextSibling)
    if (pollingTimer) clearInterval(pollingTimer)
  }

  const observer = new MutationObserver(addCopyButton)
  observer.observe(document.body, { childList: true, subtree: true })

  pollingTimer = setInterval(addCopyButton, 250)
})()
