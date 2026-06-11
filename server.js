const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔗 UPDATED: Your current operational deployment URL
const GOOGLE_APPS_SCRIPT_URL = "const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_elXprUxfCPl1WYiPx2gc6TWpohNY-osHhfGgxeZBacn1vimm433n7sHUx2AvuVvHtg/exec";";

app.use(cors());

// CRITICAL EXTENSION — Support standard JSON as well as raw body string inputs seamlessly
app.use(express.json());
app.use(express.text({ type: '*/*' })); 

app.use(express.static(path.join(__dirname)));

/**
 * Universal Proxy Forwarder
 * Bypasses browser CORS policy restrictions cleanly via robust server-to-server text transfers.
 */
async function forwardToAppsScriptProxy(rawPayloadString, expressResponse) {
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        "Content-Type": "text/plain"
      },
      body: rawPayloadString, // Forwards the raw string directly to prevent formatting drops
      follow: 20 
    });

    const responseData = await response.json();
    return expressResponse.json(responseData);

  } catch (error) {
    console.error("❌ Proxy pipeline breakdown: ", error);
    return expressResponse.status(502).json({
      success: false,
      message: "Database synchronization gateway timeout."
    });
  }
}

// Intercepts gate execution calls and normalizes string states cleanly
app.post('/api/gateway', (req, res) => {
  // If express text parser already captured the string, use it; otherwise, stringify the JSON body object
  const cleanPayloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  
  forwardToAppsScriptProxy(cleanPayloadString, res);
});

// Fallback to route standard client interface frames
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` 🚀 CHIRAG SPORTS PORTAL PROXY ACTIVE (CORS ELIMINATED)`);
  console.log(` 🔗 Connected Hub Target: ${GOOGLE_APPS_SCRIPT_URL}`);
  console.log(` 🌐 Internal Port Loop listening on: ${PORT}`);
  console.log(`====================================================`);
});
