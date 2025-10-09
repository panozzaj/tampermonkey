// ==UserScript==
// @name         GitHub PR Copy Button
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add a copy button for PR title and number on GitHub pull request pages
// @author       You
// @match        https://github.com/*/*/pull/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function addCopyButton() {
        // Find the PR title and number elements
        const titleElement = document.querySelector('.js-issue-title');
        const numberElement = document.querySelector('.gh-header-title .f1-light.color-fg-muted');

        if (!titleElement || !numberElement) {
            return;
        }

        // Check if button already exists
        if (document.querySelector('.pr-copy-button')) {
            return;
        }

        const title = titleElement.textContent.trim();
        const number = numberElement.textContent.trim();
        const copyText = `"${title}" (${number})`;

        // Create the copy button
        const button = document.createElement('button');
        button.className = 'pr-copy-button';
        button.setAttribute('aria-label', 'Copy PR title and number');
        button.style.cssText = `
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px 8px;
            margin-left: 8px;
            display: inline-flex;
            align-items: center;
            color: var(--fgColor-muted, #656d76);
            vertical-align: middle;
            border-radius: 6px;
            transition: background-color 0.2s;
        `;

        button.innerHTML = `
            <svg class="copy-icon" aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
            </svg>
            <svg class="check-icon" style="display: none;" aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="#1a7f37">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
            </svg>
        `;

        // Add hover effect
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = 'var(--bgColor-neutral-muted, #f6f8fa)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'transparent';
        });

        // Add click handler
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(copyText);

                // Show check icon
                const copyIcon = button.querySelector('.copy-icon');
                const checkIcon = button.querySelector('.check-icon');
                copyIcon.style.display = 'none';
                checkIcon.style.display = 'block';

                // Reset after 2 seconds
                setTimeout(() => {
                    copyIcon.style.display = 'block';
                    checkIcon.style.display = 'none';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });

        // Insert button after the PR number
        numberElement.parentNode.insertBefore(button, numberElement.nextSibling);
    }

    // Run when page loads
    addCopyButton();

    // Watch for navigation changes (GitHub uses PJAX)
    const observer = new MutationObserver(() => {
        addCopyButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
