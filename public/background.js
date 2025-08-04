// Background script for handling webhook requests
// Background scripts can bypass CORS restrictions

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendWebhook") {
    handleWebhookRequest(request.data)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

async function handleWebhookRequest(data) {
  const { url, payload, headers } = data;

  console.log("[background] sending request");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers || { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[background]", response);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    return {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    };
  } catch (error) {
    console.error("Background script webhook error:", error);
    throw error;
  }
}
