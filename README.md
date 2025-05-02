# Latin Wikipedia Macronizer 📚

[![Version](https://img.shields.io/badge/Version-0.5.0-blue.svg)](latin-macronizer.user.js)
A userscript that automatically adds macrons (diacritics indicating long vowels) to Latin text on Latin Wikipedia (la.wikipedia.org) pages by utilizing the external Alatius macronization service.

---

## 📋 Table of Contents

* [Overview](#overview)
* [Features](#features)
* [Screenshot](#screenshot)
* [Installation](#installation)
* [Usage](#usage)
* [How it Works](#how-it-works)
* [Dependencies and Requirements](#dependencies-and-requirements)
* [Limitations and Known Issues](#limitations-and-known-issues)
* [Contributing](#contributing)
* [License](#license)
* [Acknowledgements](#acknowledgements)

---

## 🔎 Overview

This userscript enhances the experience of reading Latin Wikipedia by automatically processing the text content of articles and adding macrons where appropriate. It achieves this by sending text fragments to the `alatius.com` online macronizer tool and integrating the results back into the page. A status overlay provides feedback during the process.

---

## ✨ Features

* **Automatic Macronization:** Adds macrons to Latin text within the main content area of `la.wikipedia.org/wiki/*` pages upon page load.
* **External Service Integration:** Leverages the `alatius.com/macronizer/` service for text processing.
* **Selective Processing:** Targets the primary content area (`#mw-content-text .mw-parser-output`) and excludes common non-prose elements like references, edit sections, code blocks, tables of contents, infoboxes, navboxes, etc.
* **Status Overlay:** Displays the script's progress (scanning, processing batches, applying changes) in a non-intrusive overlay at the bottom-right corner.
    * Shows current status messages.
    * Includes a progress bar with batch/node counters.
    * Minimizable to reduce screen footprint.
    * Automatically hides after completion.
* **Chunking:** Splits large pages into manageable chunks (`MAX_CHUNK_CHARS = 20000`) to avoid overwhelming the external API.
* **Dynamic Content Handling:** Uses a `MutationObserver` to detect and re-process content added to the page dynamically after the initial load (debounced to prevent excessive processing).
* **Error Handling:** Includes basic error handling for network requests, API response parsing, and chunk processing mismatches. Attempts to recover or skip problematic segments without halting execution entirely.

---

## 📸 Screenshot

*[Please replace this section with an actual screenshot or GIF demonstrating the script in action. Show an example of macronized text and the status overlay.]*

**(Example Placeholder Image)**
![Placeholder Screenshot](https://via.placeholder.com/600x400.png?text=Macronizer+In+Action+Screenshot+Here)
*Caption: Example of a Latin Wikipedia page before and after macronization, with the status overlay visible.*

---

## 💾 Installation

1.  **Install a Userscript Manager:** You need a browser extension that can manage userscripts. Popular options include:
    * [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari, Opera)
    * [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge, Opera)
    * [Greasemonkey](https://www.greasespot.net/) (Firefox)

2.  **Install the Script:** Click the installation link below. Your userscript manager should detect the `.user.js` file and prompt you for installation.

    [![Install Script](https://img.shields.io/badge/Install%20Script-Direct%20Link-brightgreen)](https://raw.githubusercontent.com/InvictusNavarchus/latin-Macronizer/master/latin-macronizer.user.js)
    **(Direct Link:** `https://raw.githubusercontent.com/InvictusNavarchus/latin-Macronizer/master/latin-macronizer.user.js`)

3.  **Grant Permissions:** The script requires the following permissions, which your userscript manager should request during installation:
    * `GM_xmlhttpRequest`: To make requests to the external `alatius.com` service.
    * `@connect alatius.com`: Explicit declaration to allow connections to this domain.

---

## 🚀 Usage

Once installed, the script runs automatically when you visit a Latin Wikipedia page matching the `*://la.wikipedia.org/wiki/*` pattern (excluding specified namespaces like `Specialis:`, `Vicipaedia:`, `Formula:`, etc.).

* **Automatic Processing:** The script identifies Latin text in the main content area and begins macronization.
* **Status Overlay:** Observe the overlay in the bottom-right corner for status updates and progress.
    * **Minimize/Expand:** Click the `−` / `+` button on the overlay header to minimize or expand it.
    * **Auto-Hide:** The overlay will automatically hide a few seconds after the macronization process completes successfully.
* **Result:** Latin text in the article body should display with macrons added.

---

## ⚙️ How it Works

1.  **Initialization:** The script runs at `document-idle`, ensuring most of the initial page structure is available.
2.  **Content Selection:**
    * It targets the main content container identified by the CSS selector `#mw-content-text .mw-parser-output`.
    * A `TreeWalker` iterates through all `Node.TEXT_NODE` elements within this container.
    * Nodes are filtered to exclude:
        * Empty or whitespace-only nodes.
        * Nodes within elements matching `excludeSelectors` (e.g., references, infoboxes).
        * Nodes containing only characters without Latin vowels (basic check).
        * Nodes that appear to be URLs.
3.  **Chunking:**
    * The filtered text nodes are grouped into chunks.
    * Each chunk's total character count (including a unique separator `||~#~||` between node texts) is kept below `MAX_CHUNK_CHARS` (20,000). This prevents excessively large requests to the Alatius API.
4.  **API Interaction:**
    * For each chunk:
        * The original text content of the nodes in the chunk is joined into a single string using the separator.
        * A `POST` request is sent to `https://alatius.com/macronizer/` via `GM_xmlhttpRequest`.
        * The request includes the joined text (`textcontent`) and specific form parameters (`macronize=on`, `scan=0`, `utov=on`) mimicking the website's behavior.
        * The `overrideMimeType` is set to handle UTF-8 encoding correctly.
5.  **Response Parsing:**
    * The HTML response from Alatius is parsed.
    * The script searches for the macronized text within a specific element (`div.prewrap`).
    * The extracted macronized text is split back into individual fragments using the `SEPARATOR`.
6.  **DOM Update:**
    * The script iterates through the original text nodes corresponding to the processed chunk.
    * If the macronized fragment differs from the original (trimmed) text and the node hasn't been altered by other scripts, the `nodeValue` of the text node is updated.
    * Leading and trailing whitespace from the original `nodeValue` is preserved around the updated macronized text.
7.  **Status Updates:** The status overlay is updated throughout the scanning, chunking, API request, and DOM update phases.
8.  **Dynamic Content:** A `MutationObserver` monitors the main content area for additions to the DOM. If new nodes are added, it triggers a debounced re-run of the entire `processLatinContent` function to macronize the new text.

---

## 🔧 Dependencies and Requirements

* **Userscript Manager:** An extension like Tampermonkey, Violentmonkey, or Greasemonkey must be installed in your browser.
* **Browser:** A modern web browser compatible with userscript managers (e.g., Chrome, Firefox, Edge).
* **Network Access:** Requires an active internet connection to reach `la.wikipedia.org` and `alatius.com`.
* **Permissions:** Requires `GM_xmlhttpRequest` permission for cross-origin requests to `alatius.com` and the corresponding `@connect` directive.

---

## ⚠️ Limitations and Known Issues

* **Dependency on Alatius:** The script relies entirely on the `alatius.com` service.
    * **Availability:** If the Alatius service is down or changes its API/HTML structure, the script will fail.
    * **Accuracy:** The accuracy of macronization depends solely on the Alatius algorithm. Errors or inconsistencies in macronization originate from the service.
    * **Rate Limiting:** Excessive use (e.g., very rapid navigation between large pages) might potentially trigger rate limiting on the Alatius server, though chunking helps mitigate sending overly large single requests.
* **Performance:** Processing large pages can take time, dependent on network latency and the speed of the Alatius service. The status overlay provides feedback during this process.
* **HTML Parsing Fragility:** The script parses the HTML response from Alatius based on the current structure (specifically looking for `div.prewrap`). Changes to the Alatius website's output format could break the script's ability to extract macronized text.
* **Contextual Ambiguity:** Macronization algorithms may struggle with words that have different meanings or quantities based on context not easily discernible by the algorithm.
* **Chunk Separator:** While unlikely, if the exact separator string `||~#~||` naturally occurs within the Latin text itself, it could interfere with the chunk splitting/joining process.
* **Dynamic Content Edge Cases:** While the `MutationObserver` handles many dynamic updates, extremely complex JavaScript interactions on a page could potentially interfere with or bypass the script's processing.

---

## 👥 Contributing

Contributions are welcome! If you find bugs, have suggestions for improvements, or want to add features:

1.  **Open an Issue:** Describe the bug or feature request [on the GitHub Issues page](https://github.com/InvictusNavarchus/latin-Macronizer/issues).
2.  **Fork the Repository:** Create your own copy of the repository.
3.  **Create a Branch:** Make your changes in a dedicated branch.
4.  **Submit a Pull Request:** Push your changes to your fork and open a pull request back to the main repository.

---

## 📄 License

This project is licensed under the GNU General Public License v3 - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

* This script relies heavily on the excellent **[Alatius Macronizer](https://alatius.com/macronizer/)** service for performing the Latin text macronization. Many thanks to [Johan Winge](https://github.com/Alatius), as the creator of Alatius.
