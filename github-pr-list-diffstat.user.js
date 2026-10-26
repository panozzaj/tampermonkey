// ==UserScript==
// @name         GitHub PR List Diffstat
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Shows +/- line counts on GitHub pull request lists and highlights your own username and approved PRs.
// @author       You
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  const LIST_PATH = /^\/([^/]+\/[^/]+\/)?pulls(\/|$)/

  const MAX_CONCURRENT_FETCHES = 6
  const CACHE_KEY_PREFIX = 'pr-diffstat:'

  const STYLE = `
    .pr-diffstat {
      margin-left: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      white-space: nowrap;
    }
    .pr-diffstat-add { color: var(--fgColor-success, #1a7f37); }
    .pr-diffstat-del { color: var(--fgColor-danger, #d1242f); margin-left: 4px; }
    .pr-diffstat-pending { color: var(--fgColor-muted, #656d76); }
    .pr-own-login {
      font-weight: 600;
      background: var(--bgColor-attention-muted, #fff8c5);
      border-radius: 4px;
      padding: 0 3px;
    }
    .pr-approved {
      color: var(--fgColor-success, #1a7f37);
      background: var(--bgColor-success-muted, #dafbe1);
      border-radius: 4px;
      padding: 0 3px;
    }
  `

  // GitHub's internal JSON endpoints return 406 without these headers.
  const JSON_HEADERS = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'GitHub-Verified-Fetch': 'true',
  }

  // localStorage cache of { linesAdded, linesDeleted, linesChanged, sha },
  // shown immediately on render. An open PR is refetched only when its head
  // SHA changes (or is unknown); merged/closed PRs never change.
  const readCache = (prUrl) => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY_PREFIX + prUrl))
    } catch {
      return null
    }
  }
  const writeCache = (prUrl, diffstat) =>
    localStorage.setItem(CACHE_KEY_PREFIX + prUrl, JSON.stringify(diffstat))

  let activeFetches = 0
  const fetchQueue = []
  const runQueue = () => {
    while (activeFetches < MAX_CONCURRENT_FETCHES && fetchQueue.length) {
      const { prUrl, resolve, reject } = fetchQueue.shift()
      activeFetches++
      // Same endpoint the PR page uses for its header diffstat. Authenticated
      // by the session cookie.
      fetch(`${prUrl}/page_data/diffstat`, { headers: JSON_HEADERS })
        .then((res) => {
          if (!res.ok) throw new Error(`diffstat ${res.status} for ${prUrl}`)
          return res.json()
        })
        .then((json) => resolve(json.diffstat), reject)
        .finally(() => {
          activeFetches--
          runQueue()
        })
    }
  }

  // PR URL -> Promise<{ linesAdded, linesDeleted, linesChanged }>, one fetch
  // per PR per page load (rows re-render often).
  const inflight = new Map()
  const fetchDiffstat = (prUrl) => {
    if (!inflight.has(prUrl)) {
      const promise = new Promise((resolve, reject) => {
        fetchQueue.push({ prUrl, resolve, reject })
        runQueue()
      })
      promise.catch(() => inflight.delete(prUrl))
      inflight.set(prUrl, promise)
    }
    return inflight.get(prUrl)
  }

  // The list's route data includes each PR's head SHA. On the initial page
  // load it's embedded in the HTML; after client-side navigation, the same
  // URL returns it as JSON. Repo lists only; other lists (e.g. /pulls) yield
  // an empty map, which falls back to refetching open PRs every page load.
  const INITIAL_URL = location.href
  const headShasByListUrl = new Map()

  const extractHeadShas = (routeData) =>
    new Map(
      (routeData?.payload?.repoPullsDashboardContentRoute?.results || [])
        .filter((pr) => pr.permalink && pr.headSha)
        .map((pr) => [pr.permalink, pr.headSha])
    )

  // List URL -> Promise<Map<PR URL, head SHA>>
  const loadHeadShas = (listUrl) => {
    if (!headShasByListUrl.has(listUrl)) {
      const embedded =
        listUrl === INITIAL_URL &&
        document.querySelector(
          'react-app script[data-target="react-app.embeddedData"]'
        )
      const promise = (
        embedded
          ? Promise.resolve().then(() => JSON.parse(embedded.textContent))
          : fetch(listUrl, { headers: JSON_HEADERS }).then((res) =>
              res.ok ? res.json() : null
            )
      )
        .then(extractHeadShas)
        .catch((err) => {
          console.warn('GitHub PR List Diffstat: no head SHAs', err)
          return new Map()
        })
      headShasByListUrl.set(listUrl, promise)
    }
    return headShasByListUrl.get(listUrl)
  }

  const stateLabel = (row) =>
    row
      .querySelector('svg[aria-label$="pull request"]')
      ?.getAttribute('aria-label')

  const renderDiffstat = (badge, { linesAdded, linesDeleted }) => {
    badge.className = 'pr-diffstat'
    badge.removeAttribute('title')
    const add = document.createElement('span')
    add.className = 'pr-diffstat-add'
    add.textContent = `+${linesAdded.toLocaleString()}`
    const del = document.createElement('span')
    del.className = 'pr-diffstat-del'
    del.textContent = `−${linesDeleted.toLocaleString()}`
    badge.replaceChildren(add, del)
  }

  const addDiffstat = (row, titleLink) => {
    const anchor = row.querySelector('[data-testid="timestamp-container"]')
    if (!anchor || row.querySelector('.pr-diffstat')) return

    const prUrl = titleLink.href.replace(/[?#].*$/, '')
    const badge = document.createElement('span')
    anchor.after(badge)

    const cached = readCache(prUrl)
    if (cached) {
      renderDiffstat(badge, cached)
      const state = stateLabel(row)
      if (state === 'Merged pull request' || state === 'Closed pull request') {
        return
      }
    } else {
      badge.className = 'pr-diffstat pr-diffstat-pending'
      badge.textContent = '…'
    }

    loadHeadShas(location.href)
      .then((headShas) => {
        const sha = headShas.get(prUrl)
        if (cached && sha && cached.sha === sha) return
        return fetchDiffstat(prUrl).then((diffstat) => {
          writeCache(prUrl, { ...diffstat, sha })
          renderDiffstat(badge, diffstat)
        })
      })
      .catch((err) => {
        console.warn('GitHub PR List Diffstat:', err)
        if (cached) return
        badge.textContent = '?'
        badge.title = String(err)
      })
  }

  const highlightOwnLogin = (row, login) => {
    for (const link of row.querySelectorAll(
      '[data-testid="author-filter-link"]'
    )) {
      if (link.textContent.trim().toLowerCase() === login) {
        link.classList.add('pr-own-login')
      }
    }
  }

  // The review status is an unmarked <span>Approved</span> in the metadata
  // line, so match on text, skipping the title/labels area.
  const highlightApproved = (row) => {
    for (const span of row.querySelectorAll('span:not(:has(*))')) {
      if (
        span.textContent === 'Approved' &&
        !span.closest('[data-listview-item-title-container]')
      ) {
        span.classList.add('pr-approved')
      }
    }
  }

  const processList = () => {
    if (!LIST_PATH.test(location.pathname)) return

    const login = document
      .querySelector('meta[name="user-login"]')
      ?.content?.toLowerCase()
    for (const titleLink of document.querySelectorAll(
      'a[data-testid="listitem-title-link"][href*="/pull/"]'
    )) {
      const row = titleLink.closest('li')
      if (!row) continue

      if (login) highlightOwnLogin(row, login)
      highlightApproved(row)
      addDiffstat(row, titleLink)
    }
  }

  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.appendChild(style)

  // GitHub re-renders list rows on filter changes and client-side navigation,
  // so re-run on DOM changes (both steps are idempotent).
  let scheduled = false
  new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      processList()
    })
  }).observe(document.body, { childList: true, subtree: true })
  processList()
})()
