import {
  CONTENT_SELECTOR,
  EXCLUDE_SELECTOR,
  LATIN_VOWEL_RE,
  MAX_CHUNK_CHARS,
  SEPARATOR,
  URL_RE,
} from "./config";
import { type StatusOverlay } from "./overlay";
import { macronizeText } from "./api";

interface TextNodeEntry {
  node: Text;
  originalText: string;
}

type Chunk = TextNodeEntry[];

// Module-level state: prevent concurrent runs and detect real content changes.
let isProcessing = false;
let lastContentHash: string | null = null;

function hashContent(contentArea: Element): string {
  const walker = document.createTreeWalker(contentArea, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = (node as Text).nodeValue ?? "";
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      if ((node as Text).parentElement?.closest(EXCLUDE_SELECTOR)) return NodeFilter.FILTER_REJECT;
      if (!LATIN_VOWEL_RE.test(text)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let hash = 0;
  let current: Node | null;
  while ((current = walker.nextNode()) !== null) {
    const text = (current as Text).nodeValue?.trim() ?? "";
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
  }
  return hash.toString();
}

function collectTextNodes(contentArea: Element): TextNodeEntry[] {
  const entries: TextNodeEntry[] = [];

  const walker = document.createTreeWalker(contentArea, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = (node as Text).nodeValue ?? "";
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      if ((node as Text).parentElement?.closest(EXCLUDE_SELECTOR)) return NodeFilter.FILTER_REJECT;
      if (!LATIN_VOWEL_RE.test(text)) return NodeFilter.FILTER_REJECT;
      if (URL_RE.test(text.trim())) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current: Node | null;
  while ((current = walker.nextNode()) !== null) {
    const node = current as Text;
    entries.push({ node, originalText: node.nodeValue ?? "" });
  }

  return entries;
}

function buildChunks(entries: TextNodeEntry[]): Chunk[] {
  const chunks: Chunk[] = [];
  let currentChunk: Chunk = [];
  let currentCharCount = 0;

  for (const entry of entries) {
    const len = entry.originalText.length;

    if (len > MAX_CHUNK_CHARS) {
      console.warn(
        `Macronizer: Single node (${len} chars) exceeds MAX_CHUNK_CHARS, skipping: "${entry.originalText.substring(0, 100)}..."`
      );
      continue;
    }

    const wouldExceed =
      currentCharCount + len + (currentChunk.length > 0 ? SEPARATOR.length : 0) > MAX_CHUNK_CHARS;

    if (wouldExceed && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [entry];
      currentCharCount = len;
    } else {
      currentChunk.push(entry);
      currentCharCount += len + (currentChunk.length > 1 ? SEPARATOR.length : 0);
    }
  }

  if (currentChunk.length > 0) chunks.push(currentChunk);

  return chunks;
}

async function processChunk(
  chunk: Chunk,
  chunkIndex: number,
  overlay: StatusOverlay,
  processedCount: { value: number },
  totalNodes: number
): Promise<number> {
  const originalTexts = chunk.map((e) => e.originalText);
  const joined = originalTexts.join(SEPARATOR);

  overlay.updateStatus(`Processing batch ${chunkIndex + 1}`);

  let macronized: string[];
  try {
    const result = await macronizeText(joined);
    macronized = result.split(SEPARATOR).map((s) => s.trim());
  } catch (err) {
    console.error(`Macronizer: Error in chunk ${chunkIndex + 1}:`, err);
    overlay.updateStatus(`Error in batch ${chunkIndex + 1}`);
    return 0;
  }

  // Allow one trailing empty string from the split
  if (
    macronized.length === originalTexts.length + 1 &&
    macronized[macronized.length - 1] === ""
  ) {
    macronized.pop();
  }

  if (macronized.length !== originalTexts.length) {
    console.error(
      `Macronizer: Chunk ${chunkIndex + 1} size mismatch — expected ${originalTexts.length}, got ${macronized.length}. Skipping.`
    );
    overlay.updateStatus(`Error in batch ${chunkIndex + 1} (size mismatch)`);
    return 0;
  }

  overlay.updateStatus(`Applying batch ${chunkIndex + 1}`);

  let modified = 0;
  for (let j = 0; j < chunk.length; j++) {
    processedCount.value++;
    overlay.updateProgress(processedCount.value, totalNodes, "Applying changes");

    const entry = chunk[j];
    const macronizedText = macronized[j] ?? "";

    // Guard: node must still hold the text we captured
    if (entry.node.nodeValue !== entry.originalText) {
      console.warn(`Macronizer: Node changed before replacement (chunk ${chunkIndex + 1}, item ${j}).`);
      continue;
    }

    if (macronizedText.length === 0 && entry.originalText.trim().length > 0) {
      console.warn(`Macronizer: API returned empty string for non-empty input (chunk ${chunkIndex + 1}, item ${j}).`);
      continue;
    }

    if (entry.originalText.trim() !== macronizedText) {
      const leading = entry.originalText.match(/^\s*/)?.[0] ?? "";
      const trailing = entry.originalText.match(/\s*$/)?.[0] ?? "";
      entry.node.nodeValue = leading + macronizedText + trailing;
      modified++;
    }
  }

  return modified;
}

export async function processLatinContent(overlay: StatusOverlay): Promise<void> {
  if (isProcessing) {
    console.log("Macronizer: Already processing, skipping.");
    return;
  }

  overlay.show();
  overlay.updateStatus("Scanning page for Latin text...");

  const contentArea = document.querySelector(CONTENT_SELECTOR);
  if (!contentArea) {
    overlay.updateStatus("Error: Content area not found");
    return;
  }

  const currentHash = hashContent(contentArea);
  if (lastContentHash !== null && currentHash === lastContentHash) {
    console.log("Macronizer: Content unchanged, skipping.");
    overlay.hide();
    return;
  }

  console.log(`Macronizer: Content hash changed (${lastContentHash} → ${currentHash}), processing.`);
  isProcessing = true;
  lastContentHash = currentHash;

  try {
    const entries = collectTextNodes(contentArea);

    if (entries.length === 0) {
      overlay.updateStatus("No Latin text found.");
      setTimeout(() => overlay.hide(), 3000);
      return;
    }

    overlay.updateStatus(`Found ${entries.length} Latin text fragments`);
    console.log(`Macronizer: ${entries.length} text nodes to process.`);

    const chunks = buildChunks(entries);
    overlay.updateStatus(`Preparing ${chunks.length} batches`);
    console.log(`Macronizer: ${chunks.length} chunks.`);

    const processedCount = { value: 0 };
    let totalModified = 0;

    for (let i = 0; i < chunks.length; i++) {
      overlay.updateProgress(i + 1, chunks.length, "Processing batches");
      const modified = await processChunk(chunks[i]!, i, overlay, processedCount, entries.length);
      totalModified += modified;
      console.log(`Macronizer: Chunk ${i + 1}/${chunks.length} done.`);
    }

    console.log(`Macronizer: Complete. Modified ${totalModified}/${entries.length} nodes.`);
    overlay.updateStatus(`Done! Modified ${totalModified} of ${entries.length} fragments.`);
    overlay.setCompleted();
  } catch (err) {
    console.error("Macronizer: Unexpected error:", err);
    overlay.updateStatus("An unexpected error occurred");
    setTimeout(() => overlay.hide(), 3000);
  } finally {
    isProcessing = false;
  }
}