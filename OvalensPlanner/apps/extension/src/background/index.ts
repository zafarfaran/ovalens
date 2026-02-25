/**
 * Ovalens background service worker.
 * Receives captured content from content script/popup,
 * sends it to the Ovalens API for processing,
 * and notifies the Ovalens web app tab when context is ready.
 */

const API_BASE = "http://localhost:8000";

interface CapturePayload {
  content: string;
  url: string;
  title: string;
  captureType: "full_page" | "selection";
}

interface IngestResponse {
  id: string;
  title: string;
  markdown_preview: string;
  status: string;
  created_at: string | null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SEND_TO_API") {
    const payload = message.payload as CapturePayload;
    sendToApi(payload)
      .then((result) => {
        sendResponse({ success: true, data: result });
        // Notify Ovalens web app tab if open
        notifyOvalensTab();
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err) });
      });
    return true; // async sendResponse
  }
});

async function sendToApi(payload: CapturePayload): Promise<IngestResponse> {
  const res = await fetch(`${API_BASE}/api/context/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      raw_content: payload.content,
      source_url: payload.url,
      source_title: payload.title,
      capture_type: payload.captureType,
    }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function notifyOvalensTab(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ url: "http://localhost:3000/*" });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CONTEXT_UPDATED" }).catch(() => {
          // Tab might not have a content script listener — that's fine
        });
      }
    }
  } catch {
    // No matching tabs — ignore
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Ovalens extension installed");
});
