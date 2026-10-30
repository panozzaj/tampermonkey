// ==UserScript==
// @name         Claude Chat Exporter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Export Claude conversations to markdown. Adds Copy MD and Export buttons next to Share.
// @author       Anthony Panozzo, Claude (Opus 4.5)
// @match        https://claude.ai/*
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  const LOG_PREFIX = 'Claude Chat Exporter:'

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

  function sanitizeFilename(title) {
    return title
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
      .substring(0, 100)
  }

  async function fetchJson(url) {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) {
      throw new Error(`${response.status} fetching ${url}`)
    }
    return response.json()
  }

  async function getOrgId() {
    const fromCookie = document.cookie.match(/lastActiveOrg=([^;]+)/)?.[1]
    if (fromCookie) return fromCookie

    const orgs = await fetchJson('/api/organizations')
    const chatOrg = orgs.find((o) => o.capabilities?.includes('chat'))
    if (!chatOrg) throw new Error('Could not determine organization')
    return chatOrg.uuid
  }

  // Fetch the conversation from claude.ai's own API rather than scraping the
  // DOM: the transcript is virtualized (offscreen messages aren't rendered) and
  // the API returns the original markdown.
  async function fetchConversation() {
    const [, kind, id] = location.pathname.split('/')
    const params = 'rendering_mode=messages&render_all_tools=true'

    let url
    if (kind === 'chat' && id) {
      const orgId = await getOrgId()
      url = `/api/organizations/${orgId}/chat_conversations/${id}?tree=True&${params}`
    } else if (kind === 'share' && id) {
      url = `/api/chat_snapshots/${id}?${params}`
    } else {
      throw new Error('Not on a conversation page')
    }

    console.log(LOG_PREFIX, 'fetching', url)
    return fetchJson(url)
  }

  // With tree=True the API returns every branch (edits/retries). Walk from the
  // current leaf back to the root to get the branch being viewed.
  function currentBranch(conversation) {
    const messages = conversation.chat_messages || []
    const leafId = conversation.current_leaf_message_uuid
    const byId = new Map(messages.map((m) => [m.uuid, m]))
    if (!leafId || !byId.has(leafId)) return messages

    const branch = []
    for (let m = byId.get(leafId); m; m = byId.get(m.parent_message_uuid)) {
      branch.unshift(m)
    }
    return branch
  }

  function messageText(message) {
    const blocks = message.content || []
    const text = blocks
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text.trim())
      .join('\n\n')
    return text || (message.text || '').trim()
  }

  // Uploaded files (images, PDFs) only have names; text attachments and
  // pasted text include their content in extracted_content
  function attachmentsMarkdown(message) {
    const files = [...(message.files || []), ...(message.files_v2 || [])]
    const fileNames = [...new Set(files.map((f) => f.file_name))].filter(
      Boolean
    )

    let markdown = ''
    if (fileNames.length > 0) {
      markdown += `_Attachments: ${fileNames.join(', ')}_\n\n`
    }
    for (const attachment of message.attachments || []) {
      const name = attachment.file_name || 'Pasted text'
      const content = attachment.extracted_content || ''
      if (!content) {
        markdown += `_Attachment: ${name}_\n\n`
        continue
      }
      // Fence must be longer than any backtick run inside the content
      const longestRun = Math.max(
        0,
        ...(content.match(/`+/g) || []).map((run) => run.length)
      )
      const fence = '`'.repeat(Math.max(3, longestRun + 1))
      markdown +=
        `<details>\n<summary>${name}</summary>\n\n` +
        `${fence}\n${content.trim()}\n${fence}\n\n</details>\n\n`
    }
    return markdown
  }

  function buildMarkdown(conversation) {
    const title = conversation.name || 'Claude Conversation'
    let markdown = `# ${title}\n\n`
    let count = 0

    for (const message of currentBranch(conversation)) {
      const heading = message.sender === 'human' ? 'Human' : 'Claude'
      const text = messageText(message)
      const attachments = attachmentsMarkdown(message)
      if (!text && !attachments) continue

      markdown += `## ${heading}\n\n${attachments}`
      if (text) markdown += `${text}\n\n`
      markdown += '---\n\n'
      count++
    }

    if (count === 0) throw new Error('No messages found to export')
    return { title, markdown, count }
  }

  function flashButton(button, text) {
    const label = buttonLabel(button)
    const originalText = button.dataset.label
    label.textContent = text
    setTimeout(() => {
      label.textContent = originalText
      button.disabled = false
    }, 2000)
  }

  async function runAction(button, action) {
    button.disabled = true
    try {
      await action()
    } catch (error) {
      console.error(LOG_PREFIX, 'failed:', error)
      alert(`Claude Chat Exporter failed: ${error.message}`)
      flashButton(button, 'Failed')
    }
  }

  function startExport(button) {
    return runAction(button, async () => {
      const { title, markdown, count } = buildMarkdown(
        await fetchConversation()
      )
      const filename = `${sanitizeFilename(title)}.md`
      downloadMarkdown(markdown, filename)
      console.log(LOG_PREFIX, `exported ${count} messages to ${filename}`)
      flashButton(button, 'Exported!')
    })
  }

  function startCopy(button) {
    return runAction(button, async () => {
      // Hand the clipboard a promise so the write is tied to the click's user
      // activation even though the fetch happens afterwards.
      let count = 0
      const blobPromise = fetchConversation().then((conversation) => {
        const result = buildMarkdown(conversation)
        count = result.count
        return new Blob([result.markdown], { type: 'text/plain' })
      })
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': blobPromise }),
      ])
      console.log(LOG_PREFIX, `copied ${count} messages`)
      flashButton(button, 'Copied!')
    })
  }

  // Find the element whose text is the button's label, so it can be swapped
  // without disturbing the icon/paint spans inside a cloned button.
  function buttonLabel(button) {
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const hidden = node.parentElement.closest('[aria-hidden="true"]')
      if (node.textContent.trim() && !hidden) return node.parentElement
    }
    return button
  }

  // Icons are icon-font glyphs in aria-hidden spans; drop Share's icon
  function removeIcons(button) {
    button.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
      if (el.textContent.trim()) el.remove()
    })
  }

  // Clone the native Share button (and its wrappers) so ours match its styling
  function makeButton(shareWrapper, text, className, onClick) {
    const wrapper = shareWrapper.cloneNode(true)
    wrapper.classList.add(className)
    const button =
      wrapper.tagName === 'BUTTON' ? wrapper : wrapper.querySelector('button')
    button.removeAttribute('data-testid')
    button.removeAttribute('aria-haspopup')
    button.removeAttribute('aria-expanded')
    button.dataset.label = text
    removeIcons(button)
    buttonLabel(button).textContent = text
    button.title = `${text} conversation as Markdown (Claude Chat Exporter userscript)`
    button.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick(button)
    })
    return wrapper
  }

  function addButtons() {
    const shareButton = document.querySelector(
      'button[data-testid="wiggle-controls-actions-share"]'
    )
    if (!shareButton) return

    // Insert at the level of the actions group so we sit beside Share's wrapper
    const group =
      shareButton.closest('[data-testid="wiggle-controls-actions-group"]') ||
      shareButton.parentElement
    if (group.querySelector('.claude-export-button')) return

    let shareWrapper = shareButton
    while (shareWrapper.parentElement && shareWrapper.parentElement !== group) {
      shareWrapper = shareWrapper.parentElement
    }

    const copy = makeButton(
      shareWrapper,
      'Copy MD',
      'claude-copy-button',
      startCopy
    )
    const exportButton = makeButton(
      shareWrapper,
      'Export',
      'claude-export-button',
      startExport
    )
    group.insertBefore(copy, shareWrapper)
    group.insertBefore(exportButton, shareWrapper)
  }

  // Keyboard shortcut: Ctrl+Shift+E downloads
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault()
      const button = document.querySelector('button[data-label="Export"]')
      if (button) startExport(button)
    }
  })

  const observer = new MutationObserver(addButtons)
  observer.observe(document.body, { childList: true, subtree: true })
  addButtons()
})()
