// ==UserScript==
// @name         PromptFoo localhost
// @namespace    http://tampermonkey.net/
// @version      2024-10-11
// @description  try to take over the world!
// @author       You
// @match        http://localhost:15500/eval*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=undefined.localhost
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    (function() {
        console.log('in eval modify script');
        const $ = window.$;

        // Function to dynamically load Ace Editor script
        function loadAceEditor(callback) {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ace.js";
            script.onload = callback;
            document.head.appendChild(script);
        }

        // Function to initialize Ace Editor with Markdown syntax highlighting
        function initializeAceEditorMarkdown(textarea) {
            const editorDiv = document.createElement('div');
            editorDiv.style.width = '100%';
            editorDiv.style.height = 'auto'; // Allow auto height
            textarea.parentNode.replaceChild(editorDiv, textarea);

            /* global ace */
            const editor = ace.edit(editorDiv);
            editor.setTheme('ace/theme/xcode'); // Choose your preferred theme
            editor.session.setMode("ace/mode/markdown"); // Set mode to Markdown

            editor.setValue(textarea.value, -1); // Load the content into Ace

            // Additional settings
            editor.setOptions({
                maxLines: 20,
                wrap: true, // Enable word wrapping
                readOnly: true // Set to true if you want the editor to be read-only
            });

            // Padding and margin for better readability
            editor.renderer.setPadding(10); // Add padding inside the editor
            editor.renderer.setScrollMargin(10, 10); // Add margin around the scroll area
        }

        // Function to initialize Ace Editor with JSON syntax highlighting
        function initializeAceEditorJSON(textarea) {
            const editorDiv = document.createElement('div');
            editorDiv.style.width = '100%';
            editorDiv.style.height = 'auto'; // Allow auto height
            textarea.parentNode.replaceChild(editorDiv, textarea);

            /* global ace */
            const editor = ace.edit(editorDiv);
            editor.setTheme('ace/theme/xcode'); // Choose your preferred theme
            editor.session.setMode("ace/mode/json"); // Set mode to JSON

            // Format the JSON with each key on its own line, using 4 spaces indentation
            const formattedJson = JSON.stringify(JSON.parse(textarea.value), null, 4);

            editor.setValue(formattedJson, -1); // Load the formatted content into Ace

            // Additional settings
            editor.setOptions({
                maxLines: Infinity, // Allow the editor to expand based on content
                wrap: true, // Enable word wrapping
                readOnly: true, // Set to true if you want the editor to be read-only
            });

            // Padding and margin for better readability
            editor.renderer.setPadding(10); // Add padding inside the editor
            editor.renderer.setScrollMargin(10, 10); // Add margin around the scroll area
        }

        // Function to format the content of the textarea following the "Prompt" header
        function formatTextareaAfterPromptHeader() {
            // Select the <h6> element with the text "Prompt"
            const outputHeader = [...document.querySelectorAll('h6')].find(header => header.textContent.trim() === 'Prompt');

            if (outputHeader) {
                const outputTextarea = outputHeader?.parentElement?.querySelector('textarea');

                if (outputTextarea && outputTextarea.tagName === 'TEXTAREA') {
                    // Load Ace Editor after dynamically loading the script
                    loadAceEditor(() => initializeAceEditorMarkdown(outputTextarea));
                } else {
                    console.warn("No textarea found after the 'Output' header.");
                }
            } else {
                console.warn("No 'Output' header found.");
            }
        }

        // Function to format the content of the textarea following the "Output" header
        function formatTextareaAfterOutputHeader() {
            // Select the <h6> element with the text "Output"
            const outputHeader = [...document.querySelectorAll('h6')].find(header => header.textContent.trim() === 'Output');

            if (outputHeader) {
                const outputTextarea = outputHeader?.parentElement?.querySelector('textarea');

                if (outputTextarea && outputTextarea.tagName === 'TEXTAREA') {
                    // Load Ace Editor after dynamically loading the script
                    loadAceEditor(() => initializeAceEditorJSON(outputTextarea));
                } else {
                    console.warn("No textarea found after the 'Output' header.");
                }
            } else {
                console.warn("No 'Output' header found.");
            }
        }

        // Function to override the modal opening
        function overrideModalOpen() {
            const actionElements = document.querySelectorAll(".action");

            actionElements.forEach(actionElement => {
                const originalOnClick = actionElement.onclick;

                actionElement.onclick = function(event) {
                    // Call the original onClick (to open the modal)
                    if (originalOnClick) originalOnClick(event);

                    // Wait for the modal to be fully opened, then format the textarea content
                    setTimeout(() => {
                        formatTextareaAfterPromptHeader();
                        formatTextareaAfterOutputHeader();
                    }, 500); // Adjust delay as needed
                };
            });
        }

        // Run the function to override modal open when the page loads
        overrideModalOpen();

        // Optional: rerun the override if the DOM updates dynamically
        const observer = new MutationObserver(overrideModalOpen);
        observer.observe(document.body, { childList: true, subtree: true });
    })();
})();
