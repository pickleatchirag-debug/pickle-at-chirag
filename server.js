const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 🎯 ENSURE THIS CONTAINS YOUR ACTIVE GOOGLE SHEETS WEB APP URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_elXPrUxfCPl1WYiPx2gc6TWpohNY-osHhfGgxeZBacn1vimm433n7sHUx2AvD0eS/exec";

let REGISTERED_USERS = [];
let BOOKING_RECORDS = [];

// 🔄 SYNC PIPELINE RUNTIME ENGINE LOOP
async function syncDatabaseMemoryPool() {
  try {
    let response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getSnapshot`);
    if (!response.ok) throw new Error("Outbound bridge network error.");
    
    let data = await response.json();
    if (data.users) REGISTERED_USERS = data.users;
    if (data.bookings) BOOKING_RECORDS = data.bookings;
  } catch (e) {
    console.log("Database Sync Connection Pause... Retrying structural stream.");
  }
}
setInterval(syncDatabaseMemoryPool, 4000);
syncDatabaseMemoryPool();

// Auth Endpoints
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
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
    ticker: "Sync Completed. All live court assets unsealed."
  });
});

app.post('/api/register', async (req, res) => {
  const { email, fullName, registrationCode, password } = req.body;
  try {
    let response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "addRegistration",
        fullName: fullName,
        email: email,
        registrationCode: registrationCode,
        password: password
      })
    });
    let data = await response.json();
    syncDatabaseMemoryPool();
    res.json(data);
  } catch(err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

app.post('/api/fetch-logs', (req, res) => {
  res.json({ records: BOOKING_RECORDS });
});

// 🔒 FIXED COLUMN MAPPING EXECUTOR ROUTE
app.post('/api/secure-booking', async (req, res) => {
  const { courtName, sportType, userName, date, timeSlot } = req.body;
  try {
    const bookingId = `b_${Math.floor(1000 + Math.random() * 9000)}`;
    
    // 🎯 PERFECT ALIGNMENT: Matches columns A, B, C, D, E, F, G, H exactly to your sheet blueprint!
    let response = await fetch(GOOGLE_SCRIPT_URL, { 
      method: "POST", 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "secureBooking",
        bookingId: bookingId,      // Column A (booking_id)
        courtName: courtName,      // Column B (court_name)
        sportType: sportType,      // Column C (sport_type)
        userName: userName,        // Column D (booked_by)
        email: "",                 // Column E (player_email) -> Left empty cleanly
        unit: "",                  // Column F (player_unit)  -> Left empty cleanly
        date: date,                // Column G (date)         -> Lands perfectly now!
        timeSlot: timeSlot         // Column H (time_slot)    -> Lands perfectly now!
      })
    });
    
    let data = await response.json();
    syncDatabaseMemoryPool();
    res.json(data);
  } catch (err) {
    res.status(500).json({ status: "error", message: "Operational pipeline timeout. Direct row entry dropped." });
  }
});

app.post('/api/release-booking', async (req, res) => {
  const { bookingId } = req.body;
  try {
    let response = await fetch(GOOGLE_SCRIPT_URL, { 
      method: "POST", 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "removeBooking",
        bookingId: bookingId
      })
    });
    let data = await response.json();
    syncDatabaseMemoryPool();
    res.json(data);
  } catch (err) {
    res.status(500).json({ status: "error", message: "Failed to release session." });
  }
});

app.listen(3000, () => console.log('Chirag Sports Core Server Engine running on port 3000.'));
