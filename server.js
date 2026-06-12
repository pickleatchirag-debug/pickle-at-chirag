const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 🎯 SECURE ACTIVE GOOGLE WEB APP EXEC LINK STRINGS
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_elXprUxfCPl1WYiPx2gc6TWpohNY-osHhfGgxeZBacn1vimm433n7sHUx2AvuVvHtg/exec";

// Master memory storage registries synced directly to your spreadsheet
let REGISTERED_USERS = [];
let BOOKING_RECORDS = [];

function cleanIncomingStringDate(val) {
    if (!val) return "";
    return val.toString().replace(/\s+/g, '').trim();
}

// 🔄 SYNC PIPELINE RUNTIME ENGINE LOOP
async function syncDatabaseMemoryPool() {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getSnapshot`);
    if (!response.ok) throw new Error("Google Sheets network connection dropped.");
    
    const data = await response.json();
    
    if (data.users) REGISTERED_USERS = data.users;
    if (data.bookings) {
        BOOKING_RECORDS = data.bookings.map(b => {
            return { 
                ...b, 
                date: cleanIncomingStringDate(b.date),
                court_name: b.court_name ? b.court_name.toString().trim() : ""
            };
        });
    }
    
    console.log(`⚡ Sync complete. Users loaded: ${REGISTERED_USERS.length} | Active Bookings: ${BOOKING_RECORDS.length}`);
  } catch (e) {
    console.log("Database Sync Connection Pause... Retrying structural stream:", e.message);
  }
}
setInterval(syncDatabaseMemoryPool, 4000);
syncDatabaseMemoryPool();

// 🔑 AUTHENTICATION HANDSHAKE ENDPOINT
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ status: "error", message: "Missing email or password." });
  }

  const match = REGISTERED_USERS.find(u => u.google_email.trim().toLowerCase() === email.trim().toLowerCase());
  
  if (!match || match.password !== password || match.full_name === "Pending Signup") {
    return res.status(401).json({ status: "error", message: "Invalid credentials or account setup uninitialized." });
  }

  const token = `sess_${Buffer.from(match.google_email).toString('base64')}`;
  res.json({
    status: "success",
    token: token,
    user: { full_name: match.full_name, google_email: match.google_email },
    activeTokens: match.available_tokens ?? 2,
    ticker: "Sync Completed. Welcome back to Chirag Sports Portal."
  });
});

// 👥 ADVANCED REGISTER ENDPOINT (Supports Admin Whitelists for ALL multi-domain email accounts)
app.post('/api/register', async (req, res) => {
  try {
    const existingWhitelistRow = REGISTERED_USERS.find(u => u.google_email.toLowerCase() === req.body.email.toLowerCase());
    
    if (existingWhitelistRow && existingWhitelistRow.full_name !== "Pending Signup" && req.body.fullName !== "Pending Signup") {
        return res.json({ status: "error", message: "This email address is already registered on the active roster." });
    }

    let payloadAction = "addRegistration";
    
    if (existingWhitelistRow && existingWhitelistRow.full_name === "Pending Signup" && req.body.fullName !== "Pending Signup") {
        payloadAction = "initializeMemberOverwrite";
    }

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: payloadAction,
        fullName: req.body.fullName,
        email: req.body.email.toLowerCase().trim(),
        registrationCode: req.body.registrationCode,
        password: req.body.password
      })
    });
    
    const data = await response.json();
    if (data.status === "success" || data.result === "success") syncDatabaseMemoryPool();
    res.json(data);
  } catch(err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

// 🗂️ FETCH LIVE WORKSPACE RECORDS LOGS
app.post('/api/fetch-logs', (req, res) => { res.json({ records: BOOKING_RECORDS }); });

// 🔒 SECURE BOOKING EXECUTION ROUTE
app.post('/api/secure-booking', async (req, res) => {
  try {
    const bookingId = `b_${Math.floor(1000 + Math.random() * 9000)}`;
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "secureBooking",
        bookingId: bookingId,
        courtName: req.body.courtName,
        sportType: req.body.sportType,
        userName: req.body.userName,
        date: req.body.date,
        timeSlot: req.body.timeSlot
      })
    });
    const data = await response.json();
    if (data.status === "success" || data.result === "success") syncDatabaseMemoryPool();
    res.json(data);
  } catch(err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

// 🔓 RELEASE BOOKING SLOT ROUTE
app.post('/api/release-booking', async (req, res) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "removeBooking", bookingId: req.body.bookingId })
    });
    const data = await response.json();
    if (data.status === "success" || data.result === "success") syncDatabaseMemoryPool();
    res.json(data);
  } catch(err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

app.post('/api/admin/get-users', (req, res) => { res.json({ users: REGISTERED_USERS }); });

app.post('/api/admin/adjust-tokens', async (req, res) => {
  const { email, delta } = req.body;
  const match = REGISTERED_USERS.find(u => u.google_email.toLowerCase() === email.toLowerCase());
  if (!match) return res.status(404).json({ status: "error", message: "User profile targets missing." });
  
  const targetNewBalance = Math.max(0, (match.available_tokens || 0) + delta);
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "updateRow",
        tabName: "Member_Directory",
        keyColumn: "google_email",
        keyValue: email,
        updateColumn: "available_tokens",
        updateValue: targetNewBalance
      })
    });
    match.available_tokens = targetNewBalance;
    res.json({ status: "success", newTokens: targetNewBalance });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Outbound update failed." });
  }
});

app.listen(3000, () => console.log('Chirag Sports Admin Engine running on port 3000.'));
