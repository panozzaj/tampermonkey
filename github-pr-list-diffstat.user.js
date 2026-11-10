// ==UserScript==
// @name         GitHub PR List Diffstat
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Shows +/- line counts split into code, tests, and docs on GitHub pull request lists, and highlights your own username and approved PRs.
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
    /* Fixed sizes keep the grids aligned between rows, whatever the width of
       the comment count that follows. */
    .pr-diffstat-slot { min-width: 400px; }
    .pr-diffstat {
      position: relative;
      flex: none;
      align-self: center;
      display: grid;
      grid-template-columns: 5ch 7ch 7ch calc(5ch + 12px) 7ch 7ch;
      column-gap: 6px;
      width: 318px;
      margin-right: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      line-height: 18px;
      white-space: nowrap;
      text-align: right;
    }
    .pr-diffstat-label {
      color: var(--fgColor-muted, #656d76);
      text-align: left;
    }
    .pr-diffstat-label:nth-child(6n + 4) { padding-left: 12px; }
    .pr-diffstat-add { color: var(--fgColor-success, #1a7f37); }
    .pr-diffstat-del { color: var(--fgColor-danger, #d1242f); }
    .pr-diffstat-total { font-weight: 700; }
    .pr-diffstat-zero { opacity: 0.35; }
    .pr-diffstat-has-more {
      text-decoration: underline dotted;
      text-underline-offset: 2px;
    }
    .pr-diffstat-pending {
      display: block;
      color: var(--fgColor-muted, #656d76);
      text-align: left;
    }
    /* Opens to the left because rows clip anything below them. */
    .pr-diffstat[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      top: 50%;
      right: 100%;
      transform: translateY(-50%);
      margin-right: 8px;
      z-index: 100;
      padding: 4px 8px;
      border-radius: 6px;
      color: var(--fgColor-onEmphasis, #fff);
      background: var(--bgColor-emphasis, #25292e);
      font-weight: 400;
      text-align: left;
    }
    /* Narrow rows: stack the four categories in one column, then hide the
       badge when even that would squeeze the title. Queries the row's width
       rather than the viewport's, so side panels count too. */
    .pr-diffstat-row { container-type: inline-size; }
    @container (max-width: 820px) {
      .pr-diffstat-slot { min-width: 200px; }
      .pr-diffstat {
        grid-template-columns: 5ch 7ch 7ch;
        width: auto;
      }
      .pr-diffstat-label:nth-child(6n + 4) { padding-left: 0; }
    }
    @container (max-width: 520px) {
      .pr-diffstat-slot { min-width: 0; }
      .pr-diffstat { display: none; }
    }
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

  // Checked in order, so a snapshot under spec/ counts as generated, and a
  // markdown fixture under test/ counts as tests. Anything else is code.
  const GENERATED_PATH =
    /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|gemfile\.lock|uv\.lock|poetry\.lock|cargo\.lock|composer\.lock|go\.sum)$|(^|\/)db\/(schema\.rb|structure\.sql)$|(^|\/)(vendor|node_modules|dist)\/|\.min\.(js|css)$|\.map$|\.snap$/i
  const TESTS_PATH =
    /(^|\/)(specs?|tests?|__tests__|__mocks__|e2e|cypress)\/|[._-](test|spec)\.[^/]+$|(^|\/)test_[^/]+\.py$/i
  const DOCS_PATH =
    /(^|\/)docs?\/|\.(md|mdx|rst|adoc)$|(^|\/)(readme|changelog|license|contributing)(\.[^/]*)?$/i

  const categorize = (path) => {
    if (GENERATED_PATH.test(path)) return 'generated'
    if (TESTS_PATH.test(path)) return 'tests'
    if (DOCS_PATH.test(path)) return 'docs'
    return 'code'
  }

  // file_tree leaves out linesAdded/linesDeleted on files where they're zero.
  // Its per-file counts add up to the PR's total, even with hundreds of files.
  const summarize = (diffs) => {
    const stats = {}
    for (const key of ['total', 'code', 'tests', 'docs', 'generated']) {
      stats[key] = { added: 0, deleted: 0 }
    }
    for (const { path, linesAdded = 0, linesDeleted = 0 } of diffs) {
      for (const key of ['total', categorize(path)]) {
        stats[key].added += linesAdded
        stats[key].deleted += linesDeleted
      }
    }
    return stats
  }

  // localStorage cache of summarize()'s result plus the head sha, shown
  // immediately on render. An open PR is refetched only when its head SHA
  // changes (or is unknown); merged/closed PRs never change. Entries written
  // before the code/tests/docs split have no .total, so they count as misses.
  const readCache = (prUrl) => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY_PREFIX + prUrl))
      return cached?.total ? cached : null
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
      // Same endpoint the PR page uses for its file tree. Authenticated by the
      // session cookie.
      fetch(`${prUrl}/page_data/file_tree`, { headers: JSON_HEADERS })
        .then((res) => {
          if (!res.ok) throw new Error(`file_tree ${res.status} for ${prUrl}`)
          return res.json()
        })
        .then((json) => {
          if (!Array.isArray(json.diffs)) {
            throw new Error(`file_tree has no diffs for ${prUrl}`)
          }
          return summarize(json.diffs)
        })
        .then(resolve, reject)
        .finally(() => {
          activeFetches--
          runQueue()
        })
    }
  }

  // PR URL -> Promise<summarize() result>, one fetch per PR per page load (rows
  // re-render often).
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

  const statSpan = (className, text) => {
    const span = document.createElement('span')
    span.className = className
    span.textContent = text
    return span
  }

  // A label, then right-aligned added and deleted counts. A zero count is
  // dimmed, or left blank if the whole category is empty.
  const statCells = (key, { added, deleted }, labelClass = '') => {
    const weight = key === 'total' ? ' pr-diffstat-total' : ''
    const empty = !added && !deleted
    const count = (kind, sign, value) =>
      statSpan(
        `pr-diffstat-${kind}${weight}${value ? '' : ' pr-diffstat-zero'}`,
        empty ? '' : `${sign}${value.toLocaleString()}`
      )
    return [
      statSpan(
        `pr-diffstat-label${weight}${labelClass}${empty ? ' pr-diffstat-zero' : ''}`,
        key
      ),
      count('add', '+', added),
      count('del', '−', deleted),
    ]
  }

  const renderDiffstat = (badge, stats) => {
    const { added, deleted } = stats.generated
    const hasGenerated = added > 0 || deleted > 0
    badge.className = 'pr-diffstat'
    if (hasGenerated) {
      badge.dataset.tooltip = `total includes generated +${added.toLocaleString()} −${deleted.toLocaleString()}`
    } else {
      delete badge.dataset.tooltip
    }
    badge.replaceChildren(
      ...statCells(
        'total',
        stats.total,
        hasGenerated ? ' pr-diffstat-has-more' : ''
      ),
      ...statCells('code', stats.code),
      ...statCells('tests', stats.tests),
      ...statCells('docs', stats.docs)
    )
  }

  // The column holding the comment count. It's there even when a PR has no
  // comments. Its class names are hashed, so find it by its grid area.
  const metadataColumn = (row) =>
    [...row.children].find((child) =>
      getComputedStyle(child).gridArea.startsWith('metadata')
    )

  let warnedNoColumn = false
  const addDiffstat = (row, titleLink) => {
    if (row.querySelector('.pr-diffstat')) return

    const column = metadataColumn(row)
    if (!column) {
      if (!warnedNoColumn) {
        console.warn('GitHub PR List Diffstat: no metadata column in row', row)
        warnedNoColumn = true
      }
      return
    }

    const prUrl = titleLink.href.replace(/[?#].*$/, '')
    const badge = document.createElement('div')
    row.classList.add('pr-diffstat-row')
    column.classList.add('pr-diffstat-slot')
    column.prepend(badge)

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
        return fetchDiffstat(prUrl).then((stats) => {
          writeCache(prUrl, { ...stats, sha })
          renderDiffstat(badge, stats)
        })
      })
      .catch((err) => {
        console.warn('GitHub PR List Diffstat:', err)
        if (cached) return
        badge.textContent = '?'
        badge.dataset.tooltip = String(err)
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
