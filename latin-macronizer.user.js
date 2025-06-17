// ==UserScript==
// @name         Latin Wikipedia Macronizer
// @namespace    https://github.com/InvictusNavarchus
// @version      0.7.0
// @description  Macronizes Latin text on la.wikipedia.org using alatius macronizer
// @author       Invictus
// @match        *://la.wikipedia.org/wiki/*
// @match        *://la.m.wikipedia.org/wiki/*
// @grant        GM_xmlhttpRequest
// @connect      latinmacronizer.navarchus.id
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/InvictusNavarchus/latin-Macronizer/master/latin-macronizer.user.js
// @downloadURL  https://raw.githubusercontent.com/InvictusNavarchus/latin-Macronizer/master/latin-macronizer.user.js
// ==/UserScript==

(function () {
    'use strict';

    console.log("Latin Macronizer Script Started");
    
    // Constants Configuration
    const MAX_CHUNK_CHARS = 1000;
    const SEPARATOR = "||~#~||";
    const API_CONFIG = {
        url: 'https://latinmacronizer.navarchus.id/api/macronize',
        domacronize: true,
        performutov: true,
        alsomaius: false,
        scan_option_index: 0,
        performitoj: false
    };

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
            width: min(300px, calc(100vw - 40px));
            max-width: 90vw;
            background: linear-gradient(135deg, #2c3e50, #1a252f);
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            color: #ecf0f1;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: clamp(12px, 3vw, 15px);
            z-index: 9999;
            transition: transform 0.3s ease, opacity 0.3s ease;
            transform: translateY(150%);
            opacity: 0;
        `;

        // Add responsive media query styles
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                #latin-macronizer-overlay {
                    bottom: 10px !important;
                    right: 10px !important;
                    left: 10px !important;
                    width: auto !important;
                    max-width: none !important;
                    padding: 12px !important;
                }
            }
            @media (max-width: 480px) {
                #latin-macronizer-overlay {
                    font-size: 14px !important;
                }
            }
        `;
        document.head.appendChild(style);

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
            font-size: clamp(20px, 5vw, 24px);
            font-weight: bold;
            background: linear-gradient(135deg, #3498db, #9b59b6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-right: 10px;
        `;

        const title = document.createElement('div');
        title.textContent = 'Latin Macronizer';
        title.style.cssText = `
            font-size: clamp(14px, 4vw, 16px);
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
            width: clamp(24px, 6vw, 32px);
            height: clamp(24px, 6vw, 32px);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s ease;
            touch-action: manipulation;
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
            font-size: clamp(12px, 3.5vw, 14px);
            color: #bdc3c7;
            word-wrap: break-word;
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
            font-size: clamp(10px, 3vw, 12px);
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
            height: clamp(6px, 2vw, 8px);
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
     * Validates the structure of the API response
     * @param {Object} responseData - The parsed response data from the API
     * @returns {Object} Validation result with isValid flag and error message
     */
    function validateApiResponse(responseData) {
        // Check if response is an object
        if (!responseData || typeof responseData !== 'object') {
            return {
                isValid: false,
                error: 'Response is not a valid object'
            };
        }

        // Check for required field
        if (!Object.hasOwn(responseData, 'macronized_text')) {
            return {
                isValid: false,
                error: 'Response missing required field: macronized_text'
            };
        }

        // Check if macronized_text is a string
        if (typeof responseData.macronized_text !== 'string') {
            return {
                isValid: false,
                error: 'macronized_text field is not a string'
            };
        }

        return {
            isValid: true,
            error: null
        };
    }

    /**
     * Sends text to the Latin Macronizer API and returns macronized text
     * @param {string} text - The Latin text to macronize
     * @returns {Promise<string>} - Promise that resolves to macronized text
     */
    function macronizeText(text) {
        return new Promise((resolve, reject) => {
            const { url, ...apiParams } = API_CONFIG;
            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    text_to_macronize: text,
                    ...apiParams
                }),
                onload: function(response) {
                    try {
                        if (response.status === 200) {
                            const data = JSON.parse(response.responseText);
                            
                            // Validate response structure
                            const validation = validateApiResponse(data);
                            if (!validation.isValid) {
                                console.error('Macronizer: Invalid API response structure:', validation.error);
                                console.error('Macronizer: Received response:', data);
                                reject(new Error(`Invalid API response: ${validation.error}`));
                                return;
                            }

                            resolve(data.macronized_text);
                        } else {
                            let errorMessage = 'Unknown error';
                            try {
                                const errorData = JSON.parse(response.responseText);
                                errorMessage = errorData.detail || errorData.message || 'API returned error status';
                            } catch (parseError) {
                                errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
                            }
                            reject(new Error(`API Error: ${errorMessage}`));
                        }
                    } catch (error) {
                        console.error('Macronizer: Failed to parse API response:', error);
                        console.error('Macronizer: Raw response:', response.responseText);
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                },
                onerror: function() {
                    reject(new Error('Network error occurred'));
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