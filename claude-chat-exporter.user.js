// ==UserScript==
// @name         Claude Chat Exporter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Export Claude conversations to markdown. Click the Export button next to Share.
// @author       Anthony Panozzo, Claude (Opus 4.5)
// @match        https://claude.ai/new
// @match        https://claude.ai/chat/*
// @match        https://claude.ai/share/*
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  function downloadMarkdown(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  function getConversationTitle() {
    // Title is in the chat title button's truncate div
    const titleEl = document.querySelector(
      'button[data-testid="chat-title-button"] .truncate'
    )
    if (titleEl?.textContent?.trim()) {
      const title = titleEl.textContent.trim()
      if (title !== 'Claude' && !title.includes('New conversation')) {
        return title
      }
    }
    return 'Claude Conversation'
  }

  function sanitizeFilename(title) {
    return title
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
      .substring(0, 100)
  }

  function htmlToMarkdown(element) {
    // Convert HTML content to markdown
    let markdown = ''

    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return ''
      }

      const tag = node.tagName.toLowerCase()
      const children = Array.from(node.childNodes).map(processNode).join('')

      switch (tag) {
        case 'p':
          return children + '\n\n'
        case 'br':
          return '\n'
        case 'strong':
        case 'b':
          return `**${children}**`
        case 'em':
        case 'i':
          return `*${children}*`
        case 'code':
          if (node.parentElement?.tagName.toLowerCase() === 'pre') {
            return children
          }
          return `\`${children}\``
        case 'pre':
          const codeBlock = node.querySelector('code')
          const lang = codeBlock?.className?.match(/language-(\w+)/)?.[1] || ''
          const code = codeBlock?.textContent || node.textContent
          return `\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`
        case 'h1':
          return `## ${children}\n\n`
        case 'h2':
          return `### ${children}\n\n`
        case 'h3':
          return `#### ${children}\n\n`
        case 'h4':
          return `##### ${children}\n\n`
        case 'h5':
          return `###### ${children}\n\n`
        case 'h6':
          return `###### ${children}\n\n`
        case 'ul':
          return (
            '\n' +
            Array.from(node.children)
              .map((li) => `- ${processNode(li).trim()}`)
              .join('\n') +
            '\n\n'
          )
        case 'ol':
          return (
            '\n' +
            Array.from(node.children)
              .map((li, i) => `${i + 1}. ${processNode(li).trim()}`)
              .join('\n') +
            '\n\n'
          )
        case 'li':
          return children
        case 'a':
          const href = node.getAttribute('href')
          return href ? `[${children}](${href})` : children
        case 'blockquote':
          return (
            children
              .trim()
              .split('\n')
              .map((line) => `> ${line}`)
              .join('\n') + '\n\n'
          )
        case 'hr':
          return '\n---\n\n'
        case 'div':
        case 'span':
          return children
        default:
          return children
      }
    }

    markdown = processNode(element)

    // Clean up extra newlines
    return markdown.replace(/\n{3,}/g, '\n\n').trim()
  }

  function extractConversation() {
    const messages = []

    // Find message turn containers using data-test-render-count
    // Each turn (human or Claude) is wrapped in a div with this attribute
    const turnContainers = document.querySelectorAll('[data-test-render-count]')

    turnContainers.forEach((turn) => {
      // Check if this is a human message
      const userMessage = turn.querySelector('[data-testid="user-message"]')
      if (userMessage) {
        const userText = userMessage.innerText?.trim() || ''
        if (userText) {
          messages.push({ type: 'human', content: userText })
        }
        return
      }

      // Check if this is a Claude response
      const claudeResponse = turn.querySelector('.font-claude-response')
      if (claudeResponse) {
        // Find ALL standard-markdown sections within this turn
        // They can be deeply nested, so don't restrict with :scope > div >
        const standardMarkdowns = turn.querySelectorAll('.standard-markdown')

        // Combine all sections into one response
        // Use a Set to dedupe (sometimes there are duplicate elements)
        const seenContent = new Set()
        const combinedParts = []

        standardMarkdowns.forEach((md) => {
          const markdown = htmlToMarkdown(md)
          // Skip empty or duplicate content
          if (markdown && !seenContent.has(markdown)) {
            seenContent.add(markdown)
            combinedParts.push(markdown)
          }
        })

        if (combinedParts.length > 0) {
          messages.push({ type: 'claude', content: combinedParts.join('\n\n') })
        }
      }
    })

    return messages
  }

  function buildMarkdown(title, messages) {
    let markdown = `# ${title}\n\n`

    for (const msg of messages) {
      if (msg.type === 'human') {
        markdown += `## Human\n\n${msg.content}\n\n---\n\n`
      } else {
        markdown += `## Claude\n\n${msg.content}\n\n---\n\n`
      }
    }

    return markdown
  }

  async function startExport(button) {
    const originalText = button.textContent
    button.textContent = 'Exporting...'
    button.disabled = true

    try {
      await delay(100)

      const title = getConversationTitle()
      const messages = extractConversation()

      if (messages.length === 0) {
        alert(
          'No messages found to export. The page structure may have changed.'
        )
        return
      }

      const markdown = buildMarkdown(title, messages)
      const filename = `${sanitizeFilename(title)}.md`
      downloadMarkdown(markdown, filename)

      button.textContent = 'Exported!'
      setTimeout(() => {
        button.textContent = originalText
        button.disabled = false
      }, 2000)

      console.log(
        `Claude Chat Exporter: Exported ${messages.length} messages to ${filename}`
      )
    } catch (error) {
      console.error('Claude Chat Exporter: Export failed:', error)
      alert(`Export failed: ${error.message}`)
      button.textContent = originalText
      button.disabled = false
    }
  }

  let lastUrl = location.href

  function addExportButton() {
    // Find the Share button container
    const shareButton = document.querySelector(
      'button[data-testid="wiggle-controls-actions-share"]'
    )

    if (!shareButton) {
      return
    }

    const container = shareButton.parentElement

    // Check if button already exists in THIS container
    if (container.querySelector('.claude-export-button')) {
      return
    }

    // Create export button matching Share button style
    const button = document.createElement('button')
    button.className =
      'claude-export-button inline-flex items-center justify-center relative shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none font-base-bold border-0.5 relative overflow-hidden transition duration-100 backface-hidden h-8 rounded-md px-3 min-w-[4rem] active:scale-[0.985] whitespace-nowrap !text-xs Button_secondary__Teecd'
    button.type = 'button'
    button.textContent = 'Export'
    button.title =
      'Export conversation to Markdown (added by Claude Chat Exporter userscript)'

    button.addEventListener('click', () => startExport(button))

    // Insert before Share button
    container.insertBefore(button, shareButton)
  }

  function handleUrlChange() {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      // Remove any stale export buttons
      document
        .querySelectorAll('.claude-export-button')
        .forEach((btn) => btn.remove())
      // Re-add after a short delay to let the new page render
      setTimeout(addExportButton, 100)
      setTimeout(addExportButton, 500)
      setTimeout(addExportButton, 1000)
    }
  }

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault()
      const button = document.querySelector('.claude-export-button')
      if (button) {
        startExport(button)
      } else {
        // Fallback
        const title = getConversationTitle()
        const messages = extractConversation()
        if (messages.length > 0) {
          const markdown = buildMarkdown(title, messages)
          const filename = `${sanitizeFilename(title)}.md`
          downloadMarkdown(markdown, filename)
        }
      }
    }
  })

  // Initialize with mutation observer
  const observer = new MutationObserver(() => {
    handleUrlChange()
    addExportButton()
  })
  observer.observe(document.body, { childList: true, subtree: true })

  // Also listen for popstate (back/forward navigation)
  window.addEventListener('popstate', handleUrlChange)

  // Try immediately and on delays
  addExportButton()
  setTimeout(addExportButton, 1000)
  setTimeout(addExportButton, 3000)

  console.log(
    'Claude Chat Exporter loaded. Use the Export button or Ctrl+Shift+E.'
  )
})()
