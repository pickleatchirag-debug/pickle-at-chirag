const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔗 PASTE YOUR LATEST GOOGLE APPS SCRIPT WEB APP DEPLOYMENT URL HERE
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_elXprUxfCPl1WYiPx2gc6TWpohNY-osHhfGgxeZBacn1vimm433n7sHUx2AvuVvHtg/exec";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

/**
 * Universal Proxy Forwarder
 * Forwards requests cleanly to Google Apps Script from the server side, entirely eliminating browser CORS limits.
 */
async function forwardToAppsScriptProxy(payload, expressResponse) {
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(payload),
      follow: 20 // Enforces macro execution redirection hops natively
    });

    const responseData = await response.json();
    return expressResponse.json(responseData);

  } catch (error) {
    console.error("❌ Proxy pipeline breakdown: ", error);
    return expressResponse.status(502).json({
      success: false,
      message: "Synchronization gateway timeout. Ensure your Apps Script macro is deployed as a New Version."
    });
  }
}

// Route explicitly handling proxy targets matching index.html endpoints
app.post('/api/gateway', (req, res) => {
  forwardToAppsScriptProxy(req.body, res);
});

// Fallback to route standard client static templates
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` 🚀 CHIRAG SPORTS PORTAL PROXY ACTIVE (CORS ELIMINATED)`);
  console.log(` 🔗 Target URL: ${GOOGLE_APPS_SCRIPT_URL}`);
  console.log(` 🌐 Internal Port Loop active on port: ${PORT}`);
  console.log(`====================================================`);
});