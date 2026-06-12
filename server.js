const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = require('express')();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 🎯 KEEP YOUR ORIGINAL GOOGLE SCRIPT URL STRING LINK HERE CLEANLY
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_elXprUxfCPl1WYiPx2gc6TWpohNY-osHhfGgxeZBacn1vimm433n7sHUx2AvuVvHtg/exec";

// Master memory storage registries synced directly to your spreadsheet
let REGISTERED_USERS = [];
let BOOKING_RECORDS = [];

// Helper to sanitize asset string variation name blocks safely across tabs
function standardizeCourtAssetName(name) {
    if (!name) return "";
    let str = name.toString().toLowerCase().trim();
    if (str.includes("pickleball court 1") || str === "pb court 1" || str === "pickleball court") return "Pickleball Court 1";
    if (str.includes("pickleball court 2") || str === "pb court 2") return "Pickleball Court 2";
    if (str.includes("badminton court 1") || str === "bd court 1") return "Badminton Court 1";
    return name;
}

// 🔄 SYNC PIPELINE RUNTIME ENGINE LOOP (Aligned perfectly with Code.gs getSnapshot)
async function syncDatabaseMemoryPool() {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getSnapshot`);
    if (!response.ok) throw new Error("Google Sheets network connection dropped.");
    
    const data = await response.json();
    
    if (data.users) REGISTERED_USERS = data.users;
    
    // Normalizes oncoming database strings to prevent screen freeze skips cleanly
    if (data.bookings) {
        BOOKING_RECORDS = data.bookings.map(b => {
            return { ...b, court_name: standardizeCourtAssetName(b.court_name) };
        });
    }
    
    console.log(`⚡ Sync complete. Active Bookings loaded: ${BOOKING_RECORDS.length}`);
  } catch (e) {
    console.log("Database Sync Connection Pause... Retrying structural stream:", e.message);
  }
}
// Keep data perfectly fresh by polling every 4 seconds
setInterval(syncDatabaseMemoryPool, 4000);
syncDatabaseMemoryPool();

// 🔑 AUTHENTICATION HANDSHAKE ENDPOINT
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ status: "error", message: "Missing email or password." });
  }

  const match = REGISTERED_USERS.find(u => u.google_email.trim().toLowerCase() === email.trim().toLowerCase());
  
  if (!match || match.password !== password) {
    return res.status(401).json({ status: "error", message: "Invalid personal email or password signature key metrics." });
  }

  const token = `sess_${Buffer.from(match.google_email).toString('base64')}`;
  res.json({
    status: "success",
    token: token,
    user: {
      full_name: match.full_name,
      google_email: match.google_email
    },
    activeTokens: match.available_tokens ?? 2,
    ticker: "Sync Completed. Welcome back to Chirag Sports Portal."
  });
});

// 👥 REGISTER ACCOUNT ENDPOINT
app.post('/api/register', async (req, res) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "addRegistration",
        fullName: req.body.fullName,
        email: req.body.email,
        registrationCode: req.body.registrationCode,
        password: req.body.password
      })
    });
    const data = await response.json();
    if (data.status === "success") syncDatabaseMemoryPool();
    res.json(data);
  } catch(err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

// 🗂️ FETCH LIVE WORKSPACE RECORDS LOGS
app.post('/api/fetch-logs', (req, res) => {
  res.json({ records: BOOKING_RECORDS });
});

// 🔒 SECURE BOOKING EXECUTION DISPATCHER ROUTE
app.post('/api/secure-booking', async (req, res) => {
  try {
    const bookingId = `b_${Math.floor(1000 + Math.random() * 9000)}`;
    const standardizedCourt = standardizeCourtAssetName(req.body.courtName);
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "secureBooking",
        bookingId: bookingId,
        courtName: standardizedCourt,
        sportType: req.body.sportType,
        userName: req.body.userName,
        date: req.body.date,
        timeSlot: req.body.timeSlot
      })
    });
    const data = await response.json();
    if (data.status === "success") syncDatabaseMemoryPool();
    res.json(data);
  } catch(err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

// 🔓 RELEASE BOOKING SLOT DISPATCHER ROUTE
app.post('/api/release-booking', async (req, res) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "removeBooking",
        bookingId: req.body.bookingId
      })
    });
    const data = await response.json();
    if (data.status === "success") syncDatabaseMemoryPool();
    res.json(data);
  } catch(err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

app.listen(3000, () => console.log('Chirag Sports Core Server Engine running on port 3000.'));
