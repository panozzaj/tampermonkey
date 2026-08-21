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
// @run-at       document-start
// ==/UserScript==

;(function () {
  'use strict'

  // Register g p override at document-start, before GitHub's hotkey system loads.
  let lastGTime = 0
  document.addEventListener(
    'keydown',
    (e) => {
      const tag = e.target.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        e.target.isContentEditable
      )
        return

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        lastGTime = Date.now()
        return
      }

      if (e.key === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (Date.now() - lastGTime < 1000) {
          lastGTime = 0
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          const match = window.location.pathname.match(/^\/([^/]+\/[^/]+)/)
          if (match) {
            window.location.href = `/${match[1]}/pulls`
          }
        }
      }
    },
    true
  )

  const initCopyButton = () => {
    console.log('GitHub Copy Button Script: Initializing...')

    let pollingTimer = null
    let injected = false
    let lastUrl = window.location.href

    const copyIcon = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>`

    const checkIcon = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="#1a7f37"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>`

    const findNumberElement = (container) => {
      if (!container) return null
      const elements = container.querySelectorAll('span, a')
      for (const el of elements) {
        if (/^#\d+$/.test(el.textContent.trim())) return el
      }
      return null
    }

    const getBranchName = () => {
      if (!window.location.pathname.includes('/pull/')) return null
      const branchEls = document.querySelectorAll(
        '[data-component="BranchName"]'
      )
      if (branchEls.length >= 2) {
        const text = branchEls[1].textContent.trim()
        const colonIdx = text.indexOf(':')
        return colonIdx >= 0 ? text.substring(colonIdx + 1) : text
      }
      return null
    }

    const getIssueInfo = () => {
      let title, number

      // New GitHub UI: h1 with data-component="PH_Title"
      const pageTitle = document.querySelector('h1[data-component="PH_Title"]')
      if (pageTitle) {
        const titleSpan = pageTitle.querySelector('.markdown-title')
        let numberEl = findNumberElement(pageTitle)
        if (!numberEl) {
          const titleSuffix = pageTitle.parentElement?.querySelector(
            '[class*="titleSuffix"]'
          )
          if (titleSuffix) numberEl = findNumberElement(titleSuffix)
        }
        if (titleSpan && numberEl) {
          title = titleSpan.textContent.trim()
          number = numberEl.textContent.trim()
          return {
            title,
            number,
            numericPart: number.replace(/\D/g, ''),
            branchName: getBranchName(),
          }
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
        return {
          title,
          number,
          numericPart: number.replace(/\D/g, ''),
          branchName: getBranchName(),
        }
      }

      // Try classic view
      const classicTitle = document.querySelector('.js-issue-title')
      const classicNumber = document.querySelector(
        '.gh-header-title .f1-light.color-fg-muted'
      )
      if (classicTitle && classicNumber) {
        title = classicTitle.textContent.trim()
        number = classicNumber.textContent.trim()
        return {
          title,
          number,
          numericPart: number.replace(/\D/g, ''),
          branchName: getBranchName(),
        }
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
          return {
            title,
            number,
            numericPart: num,
            branchName: getBranchName(),
          }
        }
      }

      return null
    }

    const truncateMiddle = (text, maxLen) => {
      if (text.length <= maxLen) return text
      const half = Math.floor((maxLen - 3) / 2)
      return text.slice(0, half) + '...' + text.slice(-half)
    }

    // --- Modal copy UI ---

    let modalOverlay = null
    let modalKeyHandler = null

    const kbdStyle = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border: 1px solid var(--borderColor-default, #d0d7de);
      border-radius: 5px;
      background: var(--bgColor-muted, #f6f8fa);
      color: var(--fgColor-muted, #656d76);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", monospace;
      font-size: 11px;
      font-weight: 500;
      line-height: 1;
      box-shadow: inset 0 -1px 0 var(--borderColor-default, #d0d7de);
    `

    const closeModal = () => {
      if (modalOverlay) {
        modalOverlay.remove()
        modalOverlay = null
      }
      if (modalKeyHandler) {
        document.removeEventListener('keydown', modalKeyHandler, true)
        modalKeyHandler = null
      }
    }

    const doCopy = async (value, row) => {
      await navigator.clipboard.writeText(value)
      const check = row.querySelector('.row-check')
      const label = row.querySelector('.row-label')
      if (check && label) {
        label.style.display = 'none'
        check.style.display = 'inline-flex'
      }
      setTimeout(closeModal, 400)
    }

    const openModal = () => {
      closeModal()

      const info = getIssueInfo()
      if (!info) return

      const options = []

      // 1: quoted title + number
      options.push({
        keys: ['1'],
        value: `"${info.title}" (${info.number})`,
      })

      // 2: branch name (PR only)
      if (info.branchName) {
        options.push({
          keys: ['b', '2'],
          value: info.branchName,
        })
      }

      // 3: number (plain), # copies with #
      options.push({
        keys: ['#', 'n', info.branchName ? '3' : '2'],
        value: info.numericPart,
        altCopies: { '#': info.number },
      })

      // 4: title
      options.push({
        keys: ['t', info.branchName ? '4' : '3'],
        value: info.title,
      })

      // u: URL (hidden, keyboard-only)
      const currentUrl = window.location.href
      const hiddenOptions = [{ keys: ['u'], value: currentUrl }]

      // Build modal
      modalOverlay = document.createElement('div')
      modalOverlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.4);
      `

      const card = document.createElement('div')
      card.style.cssText = `
        background: var(--bgColor-default, #ffffff);
        border: 1px solid var(--borderColor-default, #d0d7de);
        border-radius: 12px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
        padding: 12px 0;
        min-width: 400px;
        max-width: 700px;
      `

      const keyMap = {}

      options.forEach((opt) => {
        const row = document.createElement('button')
        row.style.cssText = `
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 8px 16px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          color: var(--fgColor-default, #1f2328);
          white-space: nowrap;
        `

        row.addEventListener('mouseenter', () => {
          row.style.backgroundColor = 'var(--bgColor-neutral-muted, #f6f8fa)'
        })
        row.addEventListener('mouseleave', () => {
          row.style.backgroundColor = 'transparent'
        })

        const keysHtml = opt.keys
          .map((k) => `<span style="${kbdStyle}">${k}</span>`)
          .join('')

        const keysContainer = `<span style="display: inline-flex; gap: 3px; min-width: 90px; justify-content: flex-end;">${keysHtml}</span>`

        const displayText = truncateMiddle(opt.value, 60)
        const needsTooltip = opt.value.length > 60

        row.innerHTML = `${keysContainer}<span class="row-label" style="margin-left: 8px;">${displayText}</span><span class="row-check" style="margin-left: 8px; display: none;">${checkIcon}</span>`
        if (needsTooltip) row.title = opt.value

        row.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          doCopy(opt.value, row)
        })

        opt.keys.forEach((k) => {
          keyMap[k] = { value: opt.altCopies?.[k] || opt.value, row }
        })

        card.appendChild(row)
      })

      hiddenOptions.forEach((opt) => {
        opt.keys.forEach((k) => {
          keyMap[k] = { value: opt.value, row: null }
        })
      })

      modalOverlay.appendChild(card)
      document.body.appendChild(modalOverlay)

      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal()
      })

      modalKeyHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          closeModal()
          return
        }

        const tag = e.target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          e.target.isContentEditable
        )
          return

        const entry = keyMap[e.key]
        if (entry) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          if (entry.row) {
            doCopy(entry.value, entry.row)
          } else {
            navigator.clipboard.writeText(entry.value)
            closeModal()
          }
        }
      }
      document.addEventListener('keydown', modalKeyHandler, true)
    }

    // --- Inject copy button ---

    const injectCopyButton = () => {
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

      if (injected) {
        if (document.querySelector('.custom-copy-btn-wrapper')) return
        injected = false
        if (!pollingTimer) {
          pollingTimer = setInterval(injectCopyButton, 250)
        }
      }

      let numberEl = null
      let anchorEl = null

      // New GitHub UI
      const pageTitle = document.querySelector('h1[data-component="PH_Title"]')
      if (pageTitle) {
        numberEl = findNumberElement(pageTitle)
        if (!numberEl) {
          const titleSuffix = pageTitle.parentElement?.querySelector(
            '[class*="titleSuffix"]'
          )
          if (titleSuffix) numberEl = findNumberElement(titleSuffix)
        }
        anchorEl =
          numberEl?.closest(
            '[class*="HeaderViewer-module__issueNumberContainer"]'
          ) || numberEl
      }

      // data-testid approach
      if (!numberEl) {
        const modernTitle = document.querySelector(
          '[data-testid="issue-title"]'
        )
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

      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        openModal()
      })

      wrapper.appendChild(btn)
      anchorEl.after(wrapper)

      console.log('GitHub Copy Button Script: Injected copy button')
    }

    // 'c' shortcut to open copy modal (only when not typing in an input)
    document.addEventListener('keydown', (e) => {
      if (modalOverlay) return
      if (e.key !== 'c' || e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        e.target.isContentEditable
      )
        return
      e.preventDefault()
      e.stopPropagation()
      openModal()
    })

    const observer = new MutationObserver(injectCopyButton)
    observer.observe(document.body, { childList: true, subtree: true })
    pollingTimer = setInterval(injectCopyButton, 250)
  }

  if (document.body) {
    initCopyButton()
  } else {
    document.addEventListener('DOMContentLoaded', initCopyButton)
  }
})()
