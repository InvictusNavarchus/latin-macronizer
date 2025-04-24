// ==UserScript==
// @name         Latin Wikipedia Macronizer
// @namespace    https://github.com/InvictusNavarchus
// @version      0.4.0
// @description  Macronizes Latin text on la.wikipedia.org using alatius.com
// @author       Invictus
// @match        *://la.wikipedia.org/wiki/*
// @exclude      *://la.wikipedia.org/wiki/Specialis:*
// @exclude      *://la.wikipedia.org/wiki/Vicipaedia:*
// @exclude      *://la.wikipedia.org/wiki/Formula:*
// @exclude      *://la.wikipedia.org/wiki/Categoria:*
// @exclude      *://la.wikipedia.org/wiki/Fasciculus:*
// @grant        GM_xmlhttpRequest
// @connect      alatius.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/InvictusNavarchus/latin-Macronizer/master/latin-macronizer.user.js
// @downloadURL  https://raw.githubusercontent.com/InvictusNavarchus/latin-Macronizer/master/latin-macronizer.user.js
// ==/UserScript==

(function () {
    'use strict';

    console.log("Latin Macronizer Script Started");

    // --- PASTE YOUR macronizeText FUNCTION HERE ---
    // It MUST be an async function that accepts a string and returns a Promise<string>

    /**
     * Sends text to the Alatius macronizer API and returns the macronized version.
     * Uses GM_xmlhttpRequest for cross-origin requests.
     * @param {string} text The Latin text to macronize.
     * @returns {Promise<string>} A promise that resolves with the macronized text,
     * or the original text if an error occurs.
     */
    async function macronizeText(text) {
        const url = 'https://alatius.com/macronizer/';
        // Form data based on the Python script
        const params = new URLSearchParams();
        params.append('textcontent', text);
        params.append('macronize', 'on'); // Ensure macronization is enabled
        params.append('scan', '0');      // Based on Python script's form_data
        params.append('utov', 'on');      // Based on Python script's form_data ('u' to 'v' conversion?)

        console.log(`Macronizing via Alatius: "${text.substring(0, 60).replace(/\n/g, ' ')}..."`);

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                data: params.toString(), // Send data as URL-encoded string
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    // Optional: Mimic a browser User-Agent if needed, but usually not required
                    // "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/9_._._._ Safari/537.36"
                },
                overrideMimeType: 'text/html; charset=utf-8', // Ensure correct encoding like in Python
                onload: function (response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            // Parse the HTML response
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(response.responseText, 'text/html');

                            // Find the element containing the macronized text (based on parse_html.py)
                            const targetElement = doc.querySelector('div.prewrap');

                            if (targetElement) {
                                const macronized = targetElement.textContent;
                                // console.log(`Macronization successful: "${macronized.substring(0, 60).replace(/\n/g, ' ')}..."`);
                                resolve(macronized);
                            } else {
                                console.error("Macronizer Error: Could not find 'div.prewrap' in Alatius response.");
                                console.error("Response HTML (snippet):", response.responseText.substring(0, 500));
                                resolve(text); // Resolve with original text on parsing failure
                            }
                        } catch (parseError) {
                            console.error("Macronizer Error: Failed to parse Alatius response.", parseError);
                            resolve(text); // Resolve with original text on parsing error
                        }
                    } else {
                        console.error(`Macronizer Error: Alatius request failed with status ${response.status} ${response.statusText}`);
                        resolve(text); // Resolve with original text on HTTP error
                    }
                },
                onerror: function (error) {
                    console.error("Macronizer Error: GM_xmlhttpRequest failed.", error);
                    resolve(text); // Resolve with original text on network error
                },
                ontimeout: function () {
                    console.error("Macronizer Error: Request to Alatius timed out.");
                    resolve(text); // Resolve with original text on timeout
                }
            });
        });
    }
    // --- END OF macronizeText FUNCTION ---

    const contentSelector = '#mw-content-text .mw-parser-output';
    // Selectors for elements INSIDE which text should NOT be macronized
    const excludeSelectors = [
        'sup.reference',      // Citations
        '.mw-editsection',    // Edit links
        'div.mw-highlight',   // Code blocks (syntax highlighted)
        'pre',                // Preformatted text (often code)
        'code',               // Inline code
        'style',              // Style tags
        'script',             // Script tags
        'noscript',           // NoScript tags
        '#toc',               // Table of Contents (often generated, safer to exclude)
        '.catlinks',          // Category links box
        '.printfooter',       // Footer links
        '.barbox',            // Boxes like the PHP version usage
        '#siteSub',           // "E Vicipaedia"
        '.infobox',           // Infoboxes (might contain mixed content) - Be cautious if needed
        '.navbox',             // Navboxes at the bottom
        'table', // Exclude tables which might have specific formatting needs
        'dl', 'dt', 'dd' // Definition lists
        // Add more selectors if needed
    ].join(', ');

    const MAX_CHUNK_CHARS = 20000; // Adjust based on Alatius API limits / desired performance
    const SEPARATOR = "||~#~||"; // Use a more unique separator unlikely to be affected by macronization itself

    async function processLatinContent() {
        const contentArea = document.querySelector(contentSelector);
        if (!contentArea) {
            console.log("Macronizer: Content area not found.");
            return;
        }

        const nodesToProcess = [];
        const walker = document.createTreeWalker(
            contentArea,
            NodeFilter.SHOW_TEXT, // Only interested in text nodes
            {
                acceptNode: function (node) {
                    // 1. Ignore empty/whitespace-only nodes
                    if (!node.nodeValue.trim()) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // 2. Check if the node or any parent is within an excluded element
                    if (node.parentElement.closest(excludeSelectors)) {
                        // console.log("Rejecting node in excluded parent:", node.nodeValue.trim().substring(0, 30));
                        return NodeFilter.FILTER_REJECT;
                    }
                    // 3. Basic Latin character check (optional but helpful)
                    //    Only process nodes containing at least one vowel (likely Latin)
                    if (!/[aeiouyAEIOUYāēīōūȳĀĒĪŌŪȲ]/.test(node.nodeValue)) {
                        // console.log("Rejecting node with no vowels:", node.nodeValue.trim().substring(0, 30));
                        return NodeFilter.FILTER_REJECT;
                    }
                    // 4. Reject if it looks like a URL
                    if (/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(node.nodeValue.trim())) {
                        // console.log("Rejecting node that looks like a URL:", node.nodeValue.trim().substring(0, 50));
                        return NodeFilter.FILTER_REJECT;
                    }


                    // If it passes all checks, accept it
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false // deprecated but required in older browsers
        );

        let currentNode;
        while (currentNode = walker.nextNode()) {
            nodesToProcess.push({ node: currentNode, originalText: currentNode.nodeValue });
        }

        if (nodesToProcess.length === 0) {
            console.log("Macronizer: No relevant text nodes found to process.");
            return;
        }

        console.log(`Macronizer: Found ${nodesToProcess.length} text nodes to process.`);

        // --- Chunking and Processing ---
        const chunks = [];
        let currentChunk = [];
        let currentCharCount = 0;

        for (const item of nodesToProcess) {
            const textLength = item.originalText.length;
            // Ensure single nodes that exceed the limit are handled (though unlikely for text nodes)
            if (textLength > MAX_CHUNK_CHARS) {
                console.warn(`Macronizer: Single text node exceeds MAX_CHUNK_CHARS (${textLength} > ${MAX_CHUNK_CHARS}). Skipping this node: "${item.originalText.substring(0, 100)}..."`);
                continue; // Skip this large node
            }
            if (currentCharCount + textLength + SEPARATOR.length > MAX_CHUNK_CHARS && currentChunk.length > 0) {
                // Finalize current chunk and start a new one
                chunks.push(currentChunk);
                currentChunk = [item];
                currentCharCount = textLength;
            } else {
                // Add to current chunk
                currentChunk.push(item);
                // Add length of text AND separator length if it's not the first item in the chunk
                currentCharCount += textLength + (currentChunk.length > 1 ? SEPARATOR.length : 0);
            }
        }
        // Add the last chunk if it's not empty
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        console.log(`Macronizer: Processing in ${chunks.length} chunks.`);

        // Process chunks sequentially to avoid overwhelming the API
        let processedCount = 0;
        let modifiedCount = 0;
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const originalTexts = chunk.map(item => item.originalText);
            const joinedText = originalTexts.join(SEPARATOR);

            console.log(`Macronizer: Processing chunk ${i + 1}/${chunks.length} (${joinedText.length} chars)...`);

            try {
                const joinedMacronizedResult = await macronizeText(joinedText); // Result potentially contains macronized separators

                // The API might sometimes add extra whitespace, trim the result AND the separator parts
                const macronizedTexts = joinedMacronizedResult.split(SEPARATOR).map(s => s.trim());
                const originalTrimmedTexts = originalTexts.map(s => s.trim());


                if (macronizedTexts.length !== originalTexts.length) {
                    // Attempt recovery if the only difference is an empty string at the end from trailing separator
                    if (macronizedTexts.length === originalTexts.length + 1 && macronizedTexts[macronizedTexts.length - 1] === '') {
                        macronizedTexts.pop(); // Remove the trailing empty string
                        console.warn(`Macronizer: Corrected split mismatch for chunk ${i + 1} by removing trailing empty string.`);
                    } else {
                        console.error(`Macronizer: Mismatch in chunk ${i + 1}. Original items: ${originalTexts.length}, Macronized items: ${macronizedTexts.length}. Skipping chunk.`);
                        console.error("Original joined (start):", joinedText.substring(0, 200));
                        console.error("Received joined (start):", joinedMacronizedResult.substring(0, 200));
                        console.error("Original texts sample:", originalTexts.slice(0, 3));
                        console.error("Macronized texts sample:", macronizedTexts.slice(0, 3));
                        continue; // Skip this chunk
                    }
                }

                // Replace text in the original nodes
                for (let j = 0; j < chunk.length; j++) {
                    processedCount++;
                    // Check if node still exists and its content matches the original expected text
                    if (chunk[j].node && chunk[j].node.nodeValue === chunk[j].originalText) {
                        // Only replace if the macronized version is actually different
                        if (chunk[j].originalText.trim() !== macronizedTexts[j] && macronizedTexts[j].length > 0) {
                            // Preserve leading/trailing whitespace from the original node if the core content was modified
                            const leadingSpace = chunk[j].originalText.match(/^\s*/)[0];
                            const trailingSpace = chunk[j].originalText.match(/\s*$/)[0];
                            chunk[j].node.nodeValue = leadingSpace + macronizedTexts[j] + trailingSpace;
                            modifiedCount++;
                        } else if (macronizedTexts[j].length === 0 && chunk[j].originalText.trim().length > 0) {
                            console.warn(`Macronizer: API returned empty string for non-empty input in chunk ${i + 1}, item ${j}. Original: "${chunk[j].originalText.substring(0, 50)}"`);
                        }
                    } else {
                        // Node content might have changed dynamically between collection and processing
                        console.warn(`Macronizer: Node content changed or node removed before replacement could occur for chunk ${i + 1}, item ${j}. Original: "${chunk[j].originalText.substring(0, 50)}"`);
                    }
                }
                console.log(`Macronizer: Chunk ${i + 1} processed.`);

            } catch (error) {
                // This catch block might be redundant if macronizeText handles its errors, but good for safety.
                console.error(`Macronizer: Error processing chunk ${i + 1}:`, error);
            }
            // Optional delay between chunks to be even nicer to the API
            // await new Promise(resolve => setTimeout(resolve, 250)); // 250ms delay
        }

        console.log(`Macronizer: Finished. Checked ${processedCount} nodes, modified ${modifiedCount} nodes out of ${nodesToProcess.length} total relevant nodes.`);
    }

    // Observe DOM changes to re-run macronization if content loads dynamically
    // This is basic; a more robust solution might be needed for complex sites
    let debounceTimer;
    const observer = new MutationObserver(mutations => {
        // Check if relevant nodes were added/changed
        let relevantChange = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                if (mutation.addedNodes.length > 0) {
                    relevantChange = true;
                    break;
                }
            }
            // Add characterData if needed, but can be noisy
            // if (mutation.type === 'characterData') {
            //    relevantChange = true;
            //    break;
            // }
        }

        if (relevantChange) {
            // Debounce the processing function
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log("Macronizer: Detected DOM changes, re-processing content...");
                processLatinContent();
            }, 1000); // Wait 1 second after the last change
        }
    });

    // Start observing the content area once it exists
    const targetNode = document.querySelector(contentSelector);
    if (targetNode) {
        observer.observe(targetNode, { childList: true, subtree: true });
        // Initial run
        processLatinContent();
    } else {
        // If content loads later, try waiting for it (basic)
        window.addEventListener('load', processLatinContent);
        console.warn("Macronizer: Content area not immediately found. Will try on window load.");
    }


})();