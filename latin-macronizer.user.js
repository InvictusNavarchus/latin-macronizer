// ==UserScript==
// @name         Latin Wikipedia Macronizer
// @namespace    https://github.com/InvictusNavarchus
// @version      0.1.1
// @description  Macronizes Latin text on la.wikipedia.org using an external function
// @author       Invictus
// @match        *://la.wikipedia.org/wiki/*
// @exclude      *://la.wikipedia.org/wiki/Specialis:*
// @exclude      *://la.wikipedia.org/wiki/Vicipaedia:*
// @exclude      *://la.wikipedia.org/wiki/Formula:*
// @exclude      *://la.wikipedia.org/wiki/Categoria:*
// @exclude      *://la.wikipedia.org/wiki/Fasciculus:*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log("Latin Macronizer Script Started");

    // --- PASTE YOUR macronizeText FUNCTION HERE ---
    // It MUST be an async function that accepts a string and returns a Promise<string>
    // Example Placeholder (REPLACE THIS):
    async function macronizeText(text) {
        console.log("Macronizing (placeholder):", text.substring(0, 50) + "...");
        // Replace this with your actual API call logic
        // Example using fetch (ensure your API endpoint allows requests from wikipedia or use GM_xmlhttpRequest if needed)
        /*
        try {
            // Assuming your API takes text in a 'text' query parameter and returns plain text
            const response = await fetch(`YOUR_API_ENDPOINT?text=${encodeURIComponent(text)}`);
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            const macronized = await response.text();
            return macronized;
        } catch (error) {
            console.error("Macronization API error:", error);
            return text; // Return original text on error
        }
        */
        // Simple placeholder logic for testing: Add macrons crudely
         await new Promise(resolve => setTimeout(resolve, 10)); // Simulate network delay
         return text.replace(/a/g, 'ā').replace(/e/g, 'ē').replace(/i/g, 'ī').replace(/o/g, 'ō').replace(/u/g, 'ū')
                    .replace(/A/g, 'Ā').replace(/E/g, 'Ē').replace(/I/g, 'Ī').replace(/O/g, 'Ō').replace(/U/g, 'Ū');

    }
    // --- END OF macronizeText FUNCTION ---

    const contentSelector = '#mw-content-text .mw-parser-output';
    // Selectors for elements INSIDE which text should NOT be macronized
    const excludeSelectors = [
        'sup.reference',         // Citations
        '.mw-editsection',       // Edit links
        'div.mw-highlight',      // Code blocks (syntax highlighted)
        'pre',                   // Preformatted text (often code)
        'code',                  // Inline code
        'style',                 // Style tags
        'script',                // Script tags
        'noscript',              // NoScript tags
        '#toc',                  // Table of Contents (often generated, safer to exclude)
        '.catlinks',             // Category links box
        '.printfooter',          // Footer links
        '.barbox',               // Boxes like the PHP version usage
        '#siteSub',              // "E Vicipaedia"
        '.infobox',              // Infoboxes (might contain mixed content) - Be cautious if needed
        '.navbox'                // Navboxes at the bottom
        // Add more selectors if needed
    ].join(', ');

    const MAX_CHUNK_CHARS = 4000; // Adjust based on API limits / desired performance
    const SEPARATOR = "|||SEPARATOR|||"; // Unique separator unlikely to appear in text

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
                acceptNode: function(node) {
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
                    //    This is a simple check, might need refinement for specific edge cases.
                    if (!/[a-zA-ZāēīōūĀĒĪŌŪ]/.test(node.nodeValue)) {
                         // console.log("Rejecting node with no Latin chars:", node.nodeValue.trim().substring(0, 30));
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
            if (currentCharCount + textLength + SEPARATOR.length > MAX_CHUNK_CHARS && currentChunk.length > 0) {
                // Finalize current chunk and start a new one
                chunks.push(currentChunk);
                currentChunk = [item];
                currentCharCount = textLength;
            } else {
                // Add to current chunk
                currentChunk.push(item);
                currentCharCount += textLength + SEPARATOR.length; // Account for separator
            }
        }
        // Add the last chunk if it's not empty
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        console.log(`Macronizer: Processing in ${chunks.length} chunks.`);

        // Process chunks sequentially to potentially avoid rate limits (or use Promise.all for parallel)
        let processedCount = 0;
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const originalTexts = chunk.map(item => item.originalText);
            const joinedText = originalTexts.join(SEPARATOR);

            console.log(`Macronizer: Processing chunk ${i + 1}/${chunks.length} (${joinedText.length} chars)...`);

            try {
                const joinedMacronizedResult = await macronizeText(joinedText); // Result potentially contains macronized separators

                // --- FIX: Replace the known macronized separator back to the original ---
                const macronizedSeparator = "|||SĒPĀRĀTŌR|||"; // The expected result after macronizing the separator
                // Use replaceAll to catch all occurrences if the separator somehow appears multiple times consecutively (unlikely but safe)
                const correctedMacronizedResult = joinedMacronizedResult.replaceAll(macronizedSeparator, SEPARATOR);
                // --- End of FIX ---

                // Now split using the original, corrected separator
                const macronizedTexts = correctedMacronizedResult.split(SEPARATOR);

                if (macronizedTexts.length !== originalTexts.length) {
                    // Keep the detailed error logging from before, but update variable names if needed
                    console.error(`Macronizer: Mismatch in chunk ${i + 1}. Original: ${originalTexts.length}, Macronized: ${macronizedTexts.length}. Skipping chunk.`);
                    console.error("Original joined (start):", joinedText.substring(0,200));
                    console.error("Received joined (start):", joinedMacronizedResult.substring(0,200)); // Log the raw API result
                    console.error("Corrected joined (start):", correctedMacronizedResult.substring(0,200)); // Log the result after separator correction
                    console.error("Split texts count:", macronizedTexts.length);
                    continue; // Skip this chunk
                }

                // Replace text in the original nodes (no changes needed here)
                for (let j = 0; j < chunk.length; j++) {
                   if (chunk[j].node && chunk[j].node.nodeValue === chunk[j].originalText) {
                        chunk[j].node.nodeValue = macronizedTexts[j];
                        processedCount++;
                    } else {
                         console.warn("Macronizer: Node or text changed during processing, skipping replacement for:", chunk[j].originalText.substring(0,50));
                    }
                }
                 console.log(`Macronizer: Chunk ${i + 1} processed successfully.`);

            } catch (error) {
                console.error(`Macronizer: Error processing chunk ${i + 1}:`, error);
                // Optionally decide whether to stop or continue with next chunk
            }
        }

        console.log(`Macronizer: Finished. Processed ${processedCount} out of ${nodesToProcess.length} nodes.`);
    }

    // Run the processing function
    processLatinContent();

})();