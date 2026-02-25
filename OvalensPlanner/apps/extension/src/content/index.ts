/**
 * Ovalens content script — extracts page content on demand.
 * Listens for messages from the popup/background and responds
 * with the page text (full page or selection).
 *
 * Performs aggressive client-side cleanup to strip noise before
 * sending to the API, reducing payload size and LLM token cost.
 */

// Structural elements to remove entirely
const STRIP_TAGS = ["script", "style", "nav", "footer", "header", "noscript", "svg", "iframe", "aside"];

// Noise selectors — cookie banners, ads, social widgets, hidden elements
const NOISE_SELECTORS = [
  // Cookie / consent / GDPR
  '[class*="cookie"]', '[class*="consent"]', '[id*="cookie"]', '[id*="consent"]',
  '[id*="gdpr"]', '[class*="gdpr"]',
  // Ads
  '[class*="advert"]', '[class*="ad-"]', '[class*="sponsor"]', '[id*="advert"]',
  // Social
  '[class*="share"]', '[class*="social"]',
  // Skip nav
  '[class*="skip"]',
  // Hidden / complementary
  '[aria-hidden="true"]', '[role="complementary"]', '[hidden]',
  '[style*="display:none"]', '[style*="display: none"]',
];

function cleanText(raw: string): string {
  return raw
    .replace(/\n{3,}/g, "\n\n")       // collapse 3+ newlines → 2
    .replace(/^[ \t]+$/gm, "")        // trim whitespace-only lines
    .trim();
}

function extractFullPage(): string {
  // Clone the body so we can strip elements without affecting the live page
  const clone = document.body.cloneNode(true) as HTMLElement;

  // 1. Strip structural junk tags
  for (const tag of STRIP_TAGS) {
    clone.querySelectorAll(tag).forEach((el) => el.remove());
  }

  // 2. Strip noise elements by selector
  for (const sel of NOISE_SELECTORS) {
    try {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    } catch {
      // Invalid selector on some pages — skip
    }
  }

  // 3. Extract text and clean whitespace
  return cleanText(clone.innerText);
}

function extractSelection(): string | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return null;
  return sel.toString().trim() || null;
}

// Listen for capture requests from the popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CAPTURE_PAGE") {
    const text = extractFullPage();
    sendResponse({
      success: true,
      content: text,
      url: window.location.href,
      title: document.title,
      captureType: "full_page",
    });
  } else if (message.type === "CAPTURE_SELECTION") {
    const text = extractSelection();
    if (text) {
      sendResponse({
        success: true,
        content: text,
        url: window.location.href,
        title: document.title,
        captureType: "selection",
      });
    } else {
      sendResponse({ success: false, error: "No text selected" });
    }
  } else if (message.type === "CHECK_SELECTION") {
    const sel = window.getSelection();
    sendResponse({ hasSelection: !!(sel && !sel.isCollapsed && sel.toString().trim()) });
  } else if (message.type === "CONTEXT_UPDATED") {
    // Bridge from background worker → web app: dispatch DOM event so React hook picks it up
    window.dispatchEvent(new CustomEvent("helio-context-updated"));
    sendResponse({ ok: true });
  }
  // Return true for async sendResponse
  return true;
});
