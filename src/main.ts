import { CONTENT_SELECTOR, EXCLUDE_SELECTOR, LATIN_VOWEL_RE } from "./config";
import { createStatusOverlay } from "./overlay";
import { processLatinContent } from "./processor";

const overlay = createStatusOverlay();

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleProcessing(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log("Macronizer: Relevant DOM change detected, re-processing.");
    void processLatinContent(overlay);
  }, 2000);
}

function isRelevantMutation(mutations: MutationRecord[]): boolean {
  for (const mutation of mutations) {
    if (mutation.type !== "childList") continue;

    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) continue;

      const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;
      if (el?.closest(EXCLUDE_SELECTOR)) continue;
      if ((node as ChildNode).parentElement?.closest(EXCLUDE_SELECTOR)) continue;

      const text = (node as Element).textContent ?? (node as Text).nodeValue ?? "";
      if (text.trim() && LATIN_VOWEL_RE.test(text)) return true;
    }
  }
  return false;
}

const contentArea = document.querySelector(CONTENT_SELECTOR);

if (contentArea) {
  const observer = new MutationObserver((mutations) => {
    if (isRelevantMutation(mutations)) scheduleProcessing();
  });

  observer.observe(contentArea, { childList: true, subtree: true });
  void processLatinContent(overlay);
} else {
  // Content area not in DOM yet — wait for load
  console.warn("Macronizer: Content area not found at document-idle; waiting for window load.");
  window.addEventListener("load", () => void processLatinContent(overlay));
}