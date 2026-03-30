// ==UserScript==
// @name         Amazon Wishlist Price Scraper
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Extract book prices (list and used) from Amazon wishlist with library availability
// @author       You
// @match        https://www.amazon.com/hz/wishlist/ls/*
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  let isScrolling = false

  // Add buttons to trigger the scraper
  function addScraperButtons() {
    const container = document.createElement('div')
    container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            display: flex;
            gap: 10px;
            flex-direction: column;
        `

    // Test button (current page only)
    const testButton = document.createElement('button')
    testButton.textContent = '🧪 Test Extract (Current Page)'
    testButton.style.cssText = `
            padding: 10px 20px;
            background-color: #146eb4;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `
    testButton.addEventListener('click', () => extractWishlistData(false))

    // Full extract button (auto-scroll)
    const fullButton = document.createElement('button')
    fullButton.textContent = '📊 Extract All (Auto-scroll)'
    fullButton.style.cssText = `
            padding: 10px 20px;
            background-color: #ff9900;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `
    fullButton.addEventListener('click', () => extractWishlistData(true))

    container.appendChild(testButton)
    container.appendChild(fullButton)
    document.body.appendChild(container)
  }

  // Extract data from a single item
  function extractItemData(itemElement) {
    const data = {
      title: '',
      author: '',
      asin: '',
      listPrice: '',
      formats: [],
      libraryAvailable: false,
    }

    // Extract title
    const titleElement = itemElement.querySelector('a[id^="itemName_"]')
    if (titleElement) {
      data.title = titleElement.textContent.trim()
      const href = titleElement.getAttribute('href')
      const asinMatch = href ? href.match(/\/dp\/([A-Z0-9]{10})/) : null
      if (asinMatch) {
        data.asin = asinMatch[1]
      }
    }

    // Extract author
    const authorElement = itemElement.querySelector('#item-byline-')
    if (!authorElement) {
      const bylineElements = itemElement.querySelectorAll(
        '[id^="item-byline-"]'
      )
      if (bylineElements.length > 0) {
        data.author = bylineElements[0].textContent
          .replace(/^by\s*/i, '')
          .trim()
      }
    } else {
      data.author = authorElement.textContent.replace(/^by\s*/i, '').trim()
    }

    // Extract list price
    const priceElement = itemElement.querySelector('.a-price .a-offscreen')
    if (priceElement) {
      data.listPrice = priceElement.textContent.trim()
    }

    // Extract format options (used prices)
    const formatLinks = itemElement.querySelectorAll('a[href*="/dp/"]')
    const formatPrices = new Map()

    formatLinks.forEach((link) => {
      const text = link.textContent.trim()
      const priceMatch = text.match(/\$[\d,]+\.?\d*/)
      const formatMatch = text.match(
        /(Hardcover|Paperback|Kindle|Audio CD|Audible Audiobook|Mass Market Paperback|Board book|Library Binding)/i
      )

      if (priceMatch && formatMatch) {
        const format = formatMatch[1]
        const price = priceMatch[0]
        if (!formatPrices.has(format) || price < formatPrices.get(format)) {
          formatPrices.set(format, price)
        }
      }
    })

    // Look for format/price in the item details area
    const itemDetailsArea = itemElement.querySelector(
      '[class*="itemUsedAndNew"]'
    )
    if (itemDetailsArea) {
      const formatElements = itemDetailsArea.querySelectorAll('span, a')
      formatElements.forEach((el) => {
        const text = el.textContent.trim()
        const priceMatch = text.match(/\$[\d,]+\.?\d*/)
        const formatMatch = text.match(
          /(Hardcover|Paperback|Kindle|Audio CD|Audible Audiobook|Mass Market Paperback|Board book|Library Binding)/i
        )

        if (priceMatch && formatMatch) {
          const format = formatMatch[1]
          const price = priceMatch[0]
          if (!formatPrices.has(format) || price < formatPrices.get(format)) {
            formatPrices.set(format, price)
          }
        }
      })
    }

    formatPrices.forEach((price, format) => {
      data.formats.push({ format, price })
    })

    // Check for library extension indicator
    // The library extension typically adds elements with specific classes/ids
    // You may need to adjust this selector based on your specific extension
    const libraryIndicator = itemElement.querySelector(
      '[class*="library"], [data-library]'
    )
    data.libraryAvailable = !!libraryIndicator

    return data
  }

  // Convert data to CSV
  function convertToCSV(items) {
    const headers = [
      'Title',
      'Author',
      'ASIN',
      'List Price',
      'Library Available',
    ]

    // Collect all unique formats
    const allFormats = new Set()
    items.forEach((item) => {
      item.formats.forEach((f) => allFormats.add(f.format))
    })
    const formatList = Array.from(allFormats).sort()

    // Add format headers
    formatList.forEach((format) => {
      headers.push(`${format} Price`)
    })

    let csv = headers.join(',') + '\n'

    items.forEach((item) => {
      const row = []
      row.push(`"${item.title.replace(/"/g, '""')}"`)
      row.push(`"${item.author.replace(/"/g, '""')}"`)
      row.push(item.asin)
      row.push(item.listPrice)
      row.push(item.libraryAvailable ? 'Yes' : 'No')

      // Add format prices
      formatList.forEach((format) => {
        const formatData = item.formats.find((f) => f.format === format)
        row.push(formatData ? formatData.price : '')
      })

      csv += row.join(',') + '\n'
    })

    return csv
  }

  // Download CSV file
  function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Auto-scroll to load all items
  async function autoScrollToLoadAll() {
    return new Promise((resolve) => {
      let lastItemCount = 0
      let stableCount = 0
      const maxStableChecks = 3 // If count doesn't change 3 times, we're done

      const scrollInterval = setInterval(() => {
        // Scroll to bottom
        window.scrollTo(0, document.body.scrollHeight)

        // Count current items
        const itemElements = document.querySelectorAll(
          '[data-itemid], li[data-id], .g-item-sortable'
        )
        const currentCount = itemElements.length

        console.log(`Auto-scroll: Found ${currentCount} items...`)

        // Check if count has stabilized
        if (currentCount === lastItemCount) {
          stableCount++
          if (stableCount >= maxStableChecks) {
            clearInterval(scrollInterval)
            console.log(`Auto-scroll complete: ${currentCount} items loaded`)
            resolve(currentCount)
          }
        } else {
          stableCount = 0
          lastItemCount = currentCount
        }
      }, 1000) // Check every second
    })
  }

  // Main extraction function
  async function extractWishlistData(autoScroll = false) {
    if (isScrolling) {
      alert('Already scrolling/extracting. Please wait...')
      return
    }

    try {
      // Auto-scroll if requested
      if (autoScroll) {
        isScrolling = true
        alert(
          'Starting auto-scroll to load all items. This may take a while...'
        )
        await autoScrollToLoadAll()
        isScrolling = false
        // Scroll back to top
        window.scrollTo(0, 0)
      }

      const items = []

      // Find all wishlist items
      const itemElements = document.querySelectorAll(
        '[data-itemid], li[data-id], .g-item-sortable'
      )

      if (itemElements.length === 0) {
        alert('No wishlist items found. Make sure the page is fully loaded.')
        return
      }

      itemElements.forEach((element) => {
        const itemData = extractItemData(element)
        if (itemData.title) {
          items.push(itemData)
        }
      })

      if (items.length === 0) {
        alert(
          'Could not extract any item data. The page structure may have changed.'
        )
        return
      }

      // Generate CSV
      const csv = convertToCSV(items)

      // Get wishlist ID from URL
      const urlMatch = window.location.href.match(/\/ls\/([^\/\?]+)/)
      const wishlistId = urlMatch ? urlMatch[1] : 'wishlist'
      const mode = autoScroll ? 'full' : 'test'
      const filename = `amazon_wishlist_${wishlistId}_${mode}_${new Date().toISOString().split('T')[0]}.csv`

      // Download
      downloadCSV(csv, filename)

      alert(`Successfully extracted ${items.length} items to ${filename}`)
    } catch (error) {
      isScrolling = false
      alert(`Error during extraction: ${error.message}`)
      console.error('Extraction error:', error)
    }
  }

  // Wait for page to load, then add buttons
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addScraperButtons)
  } else {
    addScraperButtons()
  }
})()
