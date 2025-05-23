// ==UserScript==
// @name         Latin Wikipedia Macronizer
// @namespace    https://github.com/InvictusNavarchus
// @version      0.5.0
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

    // Create and initialize status overlay
    const statusOverlay = createStatusOverlay();

    /**
     * Creates and adds the status overlay to the document
     * @returns {Object} An object with methods to control the overlay
     */
    function createStatusOverlay() {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'latin-macronizer-overlay';
        overlay.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 300px;
            background: linear-gradient(135deg, #2c3e50, #1a252f);
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            color: #ecf0f1;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 15px;
            z-index: 9999;
            transition: transform 0.3s ease, opacity 0.3s ease;
            transform: translateY(150%);
            opacity: 0;
        `;

        // Create header with logo and title
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(236, 240, 241, 0.2);
        `;

        const logo = document.createElement('div');
        logo.innerHTML = 'Ā';  // Using a macronized A as the logo
        logo.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            background: linear-gradient(135deg, #3498db, #9b59b6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-right: 10px;
        `;

        const title = document.createElement('div');
        title.textContent = 'Latin Macronizer';
        title.style.cssText = `
            font-size: 16px;
            font-weight: 600;
        `;

        // Create minimize button
        const minimizeBtn = document.createElement('div');
        minimizeBtn.innerHTML = '−';
        minimizeBtn.style.cssText = `
            margin-left: auto;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            opacity: 0.8;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s ease;
        `;
        minimizeBtn.addEventListener('mouseover', () => {
            minimizeBtn.style.backgroundColor = 'rgba(236, 240, 241, 0.2)';
        });
        minimizeBtn.addEventListener('mouseout', () => {
            minimizeBtn.style.backgroundColor = 'transparent';
        });

        // Create status content
        const content = document.createElement('div');
        content.style.cssText = `margin-bottom: 15px;`;

        const statusText = document.createElement('div');
        statusText.id = 'latin-macronizer-status';
        statusText.textContent = 'Starting...';
        statusText.style.cssText = `
            margin-bottom: 10px;
            font-size: 14px;
            color: #bdc3c7;
        `;

        // Create progress section
        const progressContainer = document.createElement('div');
        progressContainer.id = 'latin-macronizer-progress-container';
        progressContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;

        const progressLabel = document.createElement('div');
        progressLabel.style.cssText = `
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #bdc3c7;
        `;

        const progressAction = document.createElement('span');
        progressAction.id = 'latin-macronizer-progress-action';
        progressAction.textContent = 'Processing';

        const progressStats = document.createElement('span');
        progressStats.id = 'latin-macronizer-progress-stats';
        progressStats.textContent = '0/0';

        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            width: 100%;
            height: 8px;
            border-radius: 4px;
            background-color: rgba(236, 240, 241, 0.2);
            overflow: hidden;
        `;

        const progressFill = document.createElement('div');
        progressFill.id = 'latin-macronizer-progress-fill';
        progressFill.style.cssText = `
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            border-radius: 4px;
            transition: width 0.3s ease;
        `;

        // Assemble the overlay
        progressLabel.appendChild(progressAction);
        progressLabel.appendChild(progressStats);
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressLabel);
        progressContainer.appendChild(progressBar);

        header.appendChild(logo);
        header.appendChild(title);
        header.appendChild(minimizeBtn);

        content.appendChild(statusText);
        content.appendChild(progressContainer);

        overlay.appendChild(header);
        overlay.appendChild(content);

        document.body.appendChild(overlay);

        // Minimized state tracking
        let isMinimized = false;
        const originalHeight = overlay.scrollHeight;

        // Minimize functionality
        minimizeBtn.addEventListener('click', () => {
            if (isMinimized) {
                // Expand
                overlay.style.height = originalHeight + 'px';
                content.style.display = 'block';
                minimizeBtn.innerHTML = '−';
                isMinimized = false;
            } else {
                // Minimize
                content.style.display = 'none';
                overlay.style.height = header.scrollHeight + 'px';
                minimizeBtn.innerHTML = '+';
                isMinimized = true;
            }
        });

        // Define the public interface for controlling the overlay
        return {
            show: () => {
                overlay.style.transform = 'translateY(0)';
                overlay.style.opacity = '1';
            },
            hide: () => {
                overlay.style.transform = 'translateY(150%)';
                overlay.style.opacity = '0';
            },
            updateStatus: (message) => {
                statusText.textContent = message;
            },
            updateProgress: (current, total, action = 'Processing') => {
                const progressPercentage = total > 0 ? (current / total) * 100 : 0;
                progressFill.style.width = `${progressPercentage}%`;
                progressStats.textContent = `${current}/${total}`;
                progressAction.textContent = action;
            },
            setCompleted: () => {
                progressFill.style.width = '100%';
                progressFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
                statusText.textContent = 'Macronization complete!';

                // Auto-hide after showing completion for 5 seconds
                setTimeout(() => {
                    overlay.style.transform = 'translateY(150%)';
                    overlay.style.opacity = '0';
                }, 5000);
            }
        };
    }

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
        statusOverlay.updateStatus(`Sending text to Alatius macronizer...`);

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                data: params.toString(), // Send data as URL-encoded string
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
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
                                statusOverlay.updateStatus("Received macronized text");
                                resolve(macronized);
                            } else {
                                console.error("Macronizer Error: Could not find 'div.prewrap' in Alatius response.");
                                console.error("Response HTML (snippet):", response.responseText.substring(0, 500));
                                statusOverlay.updateStatus("Error: Could not parse Alatius response");
                                resolve(text); // Resolve with original text on parsing failure
                            }
                        } catch (parseError) {
                            console.error("Macronizer Error: Failed to parse Alatius response.", parseError);
                            statusOverlay.updateStatus("Error: Failed to parse response");
                            resolve(text); // Resolve with original text on parsing error
                        }
                    } else {
                        console.error(`Macronizer Error: Alatius request failed with status ${response.status} ${response.statusText}`);
                        statusOverlay.updateStatus(`Error: Request failed (${response.status})`);
                        resolve(text); // Resolve with original text on HTTP error
                    }
                },
                onerror: function (error) {
                    console.error("Macronizer Error: GM_xmlhttpRequest failed.", error);
                    statusOverlay.updateStatus("Error: Network request failed");
                    resolve(text); // Resolve with original text on network error
                },
                ontimeout: function () {
                    console.error("Macronizer Error: Request to Alatius timed out.");
                    statusOverlay.updateStatus("Error: Request timed out");
                    resolve(text); // Resolve with original text on timeout
                }
            });
        });
    }

    const contentSelector = '#mw-content-text .mw-parser-output';
    const excludeSelectors = [
        'sup.reference',
        '.mw-editsection',
        'div.mw-highlight',
        'pre',
        'code',
        'style',
        'script',
        'noscript',
        '#toc',
        '.catlinks',
        '.printfooter',
        '.barbox',
        '#siteSub',
        '.infobox',
        '.navbox',
        'table',
        'dl', 'dt', 'dd'
    ].join(', ');

    const MAX_CHUNK_CHARS = 20000;
    const SEPARATOR = "||~#~||";

    async function processLatinContent() {
        statusOverlay.show();
        statusOverlay.updateStatus("Scanning page for Latin text...");

        const contentArea = document.querySelector(contentSelector);
        if (!contentArea) {
            console.log("Macronizer: Content area not found.");
            statusOverlay.updateStatus("Error: Content area not found");
            return;
        }

        const nodesToProcess = [];
        const walker = document.createTreeWalker(
            contentArea,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    if (!node.nodeValue.trim()) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (node.parentElement.closest(excludeSelectors)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (!/[aeiouyAEIOUYāēīōūȳĀĒĪŌŪȲ]/.test(node.nodeValue)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(node.nodeValue.trim())) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        let currentNode;
        while (currentNode = walker.nextNode()) {
            nodesToProcess.push({ node: currentNode, originalText: currentNode.nodeValue });
        }

        if (nodesToProcess.length === 0) {
            console.log("Macronizer: No relevant text nodes found to process.");
            statusOverlay.updateStatus("No Latin text found to process");
            setTimeout(() => statusOverlay.hide(), 3000);
            return;
        }

        statusOverlay.updateStatus(`Found ${nodesToProcess.length} Latin text fragments`);
        console.log(`Macronizer: Found ${nodesToProcess.length} text nodes to process.`);

        const chunks = [];
        let currentChunk = [];
        let currentCharCount = 0;

        for (const item of nodesToProcess) {
            const textLength = item.originalText.length;
            if (textLength > MAX_CHUNK_CHARS) {
                console.warn(`Macronizer: Single text node exceeds MAX_CHUNK_CHARS (${textLength} > ${MAX_CHUNK_CHARS}). Skipping this node: "${item.originalText.substring(0, 100)}..."`);
                continue;
            }
            if (currentCharCount + textLength + SEPARATOR.length > MAX_CHUNK_CHARS && currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = [item];
                currentCharCount = textLength;
            } else {
                currentChunk.push(item);
                currentCharCount += textLength + (currentChunk.length > 1 ? SEPARATOR.length : 0);
            }
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        statusOverlay.updateStatus(`Preparing to process in ${chunks.length} batches`);
        console.log(`Macronizer: Processing in ${chunks.length} chunks.`);

        let processedCount = 0;
        let modifiedCount = 0;
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const originalTexts = chunk.map(item => item.originalText);
            const joinedText = originalTexts.join(SEPARATOR);

            statusOverlay.updateStatus(`Processing batch ${i + 1} of ${chunks.length}`);
            statusOverlay.updateProgress(i + 1, chunks.length, 'Processing batches');
            console.log(`Macronizer: Processing chunk ${i + 1}/${chunks.length} (${joinedText.length} chars)...`);

            try {
                const joinedMacronizedResult = await macronizeText(joinedText);

                const macronizedTexts = joinedMacronizedResult.split(SEPARATOR).map(s => s.trim());
                const originalTrimmedTexts = originalTexts.map(s => s.trim());

                if (macronizedTexts.length !== originalTexts.length) {
                    if (macronizedTexts.length === originalTexts.length + 1 && macronizedTexts[macronizedTexts.length - 1] === '') {
                        macronizedTexts.pop();
                        console.warn(`Macronizer: Corrected split mismatch for chunk ${i + 1} by removing trailing empty string.`);
                    } else {
                        console.error(`Macronizer: Mismatch in chunk ${i + 1}. Original items: ${originalTexts.length}, Macronized items: ${macronizedTexts.length}. Skipping chunk.`);
                        statusOverlay.updateStatus(`Error processing batch ${i + 1} (size mismatch)`);
                        continue;
                    }
                }

                statusOverlay.updateStatus(`Applying macronized text from batch ${i + 1}`);

                for (let j = 0; j < chunk.length; j++) {
                    processedCount++;
                    statusOverlay.updateProgress(processedCount, nodesToProcess.length, 'Applying changes');

                    if (chunk[j].node && chunk[j].node.nodeValue === chunk[j].originalText) {
                        if (chunk[j].originalText.trim() !== macronizedTexts[j] && macronizedTexts[j].length > 0) {
                            const leadingSpace = chunk[j].originalText.match(/^\s*/)[0];
                            const trailingSpace = chunk[j].originalText.match(/\s*$/)[0];
                            chunk[j].node.nodeValue = leadingSpace + macronizedTexts[j] + trailingSpace;
                            modifiedCount++;
                        } else if (macronizedTexts[j].length === 0 && chunk[j].originalText.trim().length > 0) {
                            console.warn(`Macronizer: API returned empty string for non-empty input in chunk ${i + 1}, item ${j}. Original: "${chunk[j].originalText.substring(0, 50)}"`);
                        }
                    } else {
                        console.warn(`Macronizer: Node content changed or node removed before replacement could occur for chunk ${i + 1}, item ${j}. Original: "${chunk[j].originalText.substring(0, 50)}"`);
                    }
                }
                statusOverlay.updateStatus(`Batch ${i + 1} completed`);
                console.log(`Macronizer: Chunk ${i + 1} processed.`);

            } catch (error) {
                console.error(`Macronizer: Error processing chunk ${i + 1}:`, error);
                statusOverlay.updateStatus(`Error processing batch ${i + 1}`);
            }
        }

        console.log(`Macronizer: Finished. Checked ${processedCount} nodes, modified ${modifiedCount} nodes out of ${nodesToProcess.length} total relevant nodes.`);
        statusOverlay.updateStatus(`Completed! Modified ${modifiedCount} of ${nodesToProcess.length} text fragments.`);
        statusOverlay.setCompleted();
    }

    let debounceTimer;
    const observer = new MutationObserver(mutations => {
        let relevantChange = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                if (mutation.addedNodes.length > 0) {
                    relevantChange = true;
                    break;
                }
            }
        }

        if (relevantChange) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log("Macronizer: Detected DOM changes, re-processing content...");
                processLatinContent();
            }, 1000);
        }
    });

    const targetNode = document.querySelector(contentSelector);
    if (targetNode) {
        observer.observe(targetNode, { childList: true, subtree: true });
        processLatinContent();
    } else {
        window.addEventListener('load', processLatinContent);
        console.warn("Macronizer: Content area not immediately found. Will try on window load.");
    }

})();