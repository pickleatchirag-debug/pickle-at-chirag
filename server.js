const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Google Web App Integration URL Marker
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_elXprUxfCPl1WYiPx2gc6TWpohNY-osHhfGgxeZBacn1vimm433n7sHUx2AvuVvHtg/exec"; 

let CACHED_USERS = [];
let BOOKING_RECORDS = [];

// Helper Time Parsers
function getNowLocalIST() { return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })); }

function sanitizeUIDate(input) {
  if(!input) return "";
  let str = input.toString().replace(/\s+/g, '').trim().replace(/-/g, '/');
  if (str.includes('/')) {
    let parts = str.split('/');
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10); let m = parseInt(parts[1], 10); let y = parts[2];
      if (parts[0].length === 4) { y = parseInt(parts[0], 10); m = parseInt(parts[1], 10); d = parseInt(parts[2], 10); }
      return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
    }
  }
  return str;
}

function parseUIDateToAbsoluteObject(dateStr, timeSlotStr) {
  try {
    const cleanDate = sanitizeUIDate(dateStr);
    const [d, m, y] = cleanDate.split('/');
    const [startHourStr] = timeSlotStr.split(' - ');
    const [hour, minutes] = startHourStr.split(':');
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), parseInt(hour, 10), parseInt(minutes || 0, 10), 0);
  } catch(e) { return new Date(); }
}

// Sync Cache Matrices
async function refreshDataPoolCache() {
  try {
    const userRes = await fetch(`${GOOGLE_SCRIPT_URL}?action=readTab&tabName=Member_Directory`);
    if(userRes.ok) CACHED_USERS = await userRes.json();
    
    const bookingRes = await fetch(`${GOOGLE_SCRIPT_URL}?action=readTab&tabName=RealTime_bookings_log`);
    if(bookingRes.ok) BOOKING_RECORDS = await bookingRes.json();
  } catch(e) { console.error("Database cache polling latency update step paused:", e.message); }
}
setInterval(refreshDataPoolCache, 15000);
refreshDataPoolCache();

// Helper to calculate tokens dynamically (Never-ending loop)
function calculateRemainingActiveTokens(userFullName) {
  const nowIST = getNowLocalIST();
  const playerTarget = userFullName.toLowerCase().trim();
  
  const totalActiveFutureBookings = BOOKING_RECORDS.filter(r => {
    if ((r.booked_by || "").toLowerCase().trim() !== playerTarget) return false;
    const slotEndTime = parseUIDateToAbsoluteObject(r.date, r.time_slot);
    slotEndTime.setHours(slotEndTime.getHours() + 1); // Token returns upon slot completion
    return slotEndTime > nowIST;
  }).length;

  return Math.max(0, 2 - totalActiveFutureBookings);
}

// 🛡️ REPAIRED & ORDERED FETCH: FLOATS UPCOMING RECORDS FIRST
app.post('/api/fetch-logs', (req, res) => {
  try {
    let sortedRecords = [...BOOKING_RECORDS];
    sortedRecords.sort((a, b) => {
      let timeA = parseUIDateToAbsoluteObject(a.date, a.time_slot);
      let timeB = parseUIDateToAbsoluteObject(b.date, b.time_slot);
      return timeB - timeA; // Descending order (latest/upcoming matches appear at top)
    });
    res.json({ records: sortedRecords });
  } catch (err) {
    res.json({ records: BOOKING_RECORDS });
  }
});

app.post('/api/login', (req, res) => {
  const email = (req.body.email || "").toLowerCase().trim();
  const password = (req.body.password || "").trim();
  
  const user = CACHED_USERS.find(u => (u.google_email || "").toLowerCase().trim() === email);
  if(!user || user.password !== password) return res.json({ status: "error", message: "Invalid credentials." });
  
  res.json({
    status: "success",
    token: `sess_${Buffer.from(email).toString('base64')}`,
    user: user,
    activeTokens: calculateRemainingActiveTokens(user.full_name)
  });
});

app.post('/api/register', async (req, res) => {
  const { fullName, email, registrationCode, password } = req.body;
  const targetEmail = email.toLowerCase().trim();
  
  // Whitelist Append / Edit Handshake Route
  const payload = {
    action: "updateRow",
    tabName: "Member_Directory",
    keyColumn: "google_email",
    keyValue: targetEmail,
    updateColumn: "password",
    updateValue: password
  };

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  
  // Update local metadata parameters instantly
  if(data.status === "success") {
    const localUser = CACHED_USERS.find(u => u.google_email.toLowerCase().trim() === targetEmail);
    if(localUser) {
      localUser.password = password;
      if(fullName !== "Pending Signup") localUser.full_name = fullName;
    }
    await refreshDataPoolCache();
  }
  res.json(data);
});

// 🔒 STRICT SERVER-SIDE TRANSACTION TOKEN VALIDATOR LOCK OUT
app.post('/api/secure-booking', async (req, res) => {
  try {
    const { courtName, sportType, userName, date, timeSlot } = req.body;
    
    // Check dynamic live balances inside the local variables matrix context
    const clearTokensRemaining = calculateRemainingActiveTokens(userName);
    if(clearTokensRemaining <= 0) {
      return res.json({ status: "error", message: "Booking Limit Exhausted: Max 2 active sessions allowed simultaneously." });
    }

    const bookingId = `BK-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const payload = {
      action: "appendRow",
      tabName: "RealTime_bookings_log",
      data: [bookingId, courtName, sportType, userName, date, timeSlot]
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if(data.status === "success") await refreshDataPoolCache();
    res.json(data);
  } catch(e) { res.json({ status: "error", message: "System pipeline transactional drop error." }); }
});

app.post('/api/release-booking', async (req, res) => {
  const { bookingId } = req.body;
  const payload = {
    action: "deleteRow",
    tabName: "RealTime_bookings_log",
    keyColumn: "booking_id",
    keyValue: bookingId
  };
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if(data.status === "success") await refreshDataPoolCache();
  res.json(data);
});

// 🛡️ CRASH-PROOF VERIFICATION & PASSWORD RESET HANDSHAKE
app.post('/api/reset-password', async (req, res) => {
  try {
    const emailInput = (req.body.email || "").toLowerCase().trim();
    const verificationCodeInput = (req.body.verificationCode || "").toUpperCase().trim();
    const newPasswordInput = (req.body.newPassword || "").trim();

    const matchedUser = CACHED_USERS.find(u => (u.google_email || "").toLowerCase().trim() === emailInput);
    if (!matchedUser) {
      return res.json({ status: "error", message: "Email not verified in directory database." });
    }

    const userStoredCode = (matchedUser.registration_code || "").toString().toUpperCase().trim();
    if (userStoredCode !== verificationCodeInput) {
      return res.json({ status: "error", message: "Verification Failure: Unit code key does not match." });
    }

    const payload = {
      action: "updateRow",
      tabName: "Member_Directory",
      keyColumn: "google_email",
      keyValue: emailInput,
      updateColumn: "password",
      updateValue: newPasswordInput
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if(data.status === "success") await refreshDataPoolCache();
    res.json(data);
  } catch (err) {
    res.json({ status: "error", message: "Database handshake channel exception timeout." });
  }
});

// Admin Custom Endpoints
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if(email === "admin@email.com" && password === "1qaz2wsx") {
    res.json({ token: "adm_secure_token_layer", name: "System Manager" });
  } else { res.status(401).json({ message: "Unauthorized Entry Key." }); }
});

app.post('/api/admin/get-users', (req, res) => {
  res.json({ users: CACHED_USERS });
});

app.listen(process.env.PORT || 3000, () => console.log("Terminal running live..."));
