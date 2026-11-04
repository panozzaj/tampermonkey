// ==UserScript==
// @name         Statuspage Eastern Time
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Shows Eastern timezone times next to UTC times on Atlassian Statuspage sites
// @author       You
// @match        https://status.*/*
// @match        https://*.statuspage.io/*
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  const MONTHS = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  }

  function convertTimestamps() {
    document.querySelectorAll('small').forEach((small) => {
      if (small.querySelector('.et-time')) return

      const text = small.textContent.trim()
      const match = text.match(
        /^([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{2}):(\d{2})\s+UTC$/
      )
      if (!match) return

      const [, monthStr, day, hours, minutes] = match
      const month = MONTHS[monthStr]
      if (month === undefined) return

      const statusDay = small.closest('.status-day')
      let year = new Date().getFullYear()
      if (statusDay) {
        const yearVar = statusDay.querySelector('.date var[data-var="year"]')
        if (yearVar) year = parseInt(yearVar.textContent, 10)
      }

      const utcDate = new Date(
        Date.UTC(year, month, parseInt(day), parseInt(hours), parseInt(minutes))
      )

      const etParts = utcDate.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      })

      const etDay = parseInt(
        utcDate.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          day: 'numeric',
        }),
        10
      )
      const sameDay = etDay === parseInt(day)

      let label
      if (sameDay) {
        label = utcDate.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZoneName: 'short',
        })
      } else {
        label = etParts
      }

      const span = document.createElement('span')
      span.className = 'et-time'
      span.style.cssText = 'opacity: 0.7; margin-left: 6px;'
      span.textContent = `(${label})`
      small.appendChild(span)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', convertTimestamps)
  } else {
    convertTimestamps()
  }

  new MutationObserver(convertTimestamps).observe(document.body, {
    childList: true,
    subtree: true,
  })
})()
