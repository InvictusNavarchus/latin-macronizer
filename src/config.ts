export const MAX_CHUNK_CHARS = 1000;
export const SEPARATOR = "||~#~||";

export const API_CONFIG = {
  url: "https://latinmacronizer.navarchus.id/api/macronize",
  domacronize: true,
  performutov: true,
  alsomaius: false,
  scan_option_index: 0,
  performitoj: false,
} as const;

export const CONTENT_SELECTOR = "#mw-content-text .mw-parser-output";

export const EXCLUDE_SELECTOR = [
  "sup.reference",
  ".mw-editsection",
  "div.mw-highlight",
  "pre",
  "code",
  "style",
  "script",
  "noscript",
  "#toc",
  ".catlinks",
  ".printfooter",
  ".barbox",
  "#siteSub",
  ".infobox",
  ".navbox",
  "table",
  "dl",
  "dt",
  "dd",
].join(", ");

/** Matches any vowel that could appear in Latin text worth macronizing. */
export const LATIN_VOWEL_RE = /[aeiouyAEIOUYāēīōūȳĀĒĪŌŪȲ]/;

export const URL_RE = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;