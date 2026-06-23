const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 🔗 Your Current Live Working Google Web App Endpoint
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbweQ2s9ZsXybKMBYmN2lqJqBi_YGCAIrY0dIIFnHwWg2RHxrCd5---fxtOmcpWdtb8wyQ/exec"; 

let CACHED_USERS = [];
let BOOKING_RECORDS = [];

// Snapshot Data Sync Pool Loop
async function refreshDataPoolCache() {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getSnapshot`, {
      headers: { 'Accept-Encoding': 'identity' }
    });
    
    if (response.ok) {
      const snapshot = await response.json();
      
      if (snapshot && snapshot.users) CACHED_USERS = snapshot.users;
      if (snapshot && snapshot.bookings) BOOKING_RECORDS = snapshot.bookings;
      
      console.log(`✓ Cache successfully rehydrated. Users: ${CACHED_USERS.length}, Bookings: ${BOOKING_RECORDS.length}`);
    } else {
      console.log("× Google framework responded with an invalid transmission header.");
    }
  } catch(e) {
    console.log("Database Sync Connection Pause: Snapshot fetch latency step delayed:", e.message);
  }
}
setInterval(refreshDataPoolCache, 15000);
refreshDataPoolCache();

app.post('/api/fetch-logs', (req, res) => {
  res.json({ records: BOOKING_RECORDS });
});

app.post('/api/login', (req, res) => {
  const email = (req.body.email || "").toLowerCase().trim();
  const password = (req.body.password || "").trim();
  
  const user = CACHED_USERS.find(u => (u.google_email || "").toLowerCase().trim() === email);
  
  if(!user || user.password !== password) {
    return res.json({ status: "error", message: "Invalid credentials." });
  }
  
  res.json({
    status: "success",
    token: "sess_" + Buffer.from(email).toString('base64'),
    user: user,
    activeTokens: user.available_tokens || 2
  });
});

app.post('/api/register', async (req, res) => {
  const { fullName, email, registrationCode, password } = req.body;
  
  const payload = {
    action: "initializeMemberOverwrite",
    email: email,
    fullName: fullName,
    registrationCode: registrationCode,
    password: password
  };

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept-Encoding': 'identity' 
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if(data.status === "success") await refreshDataPoolCache();
    res.json(data);
  } catch (err) {
    res.json({ status: "error", message: "Network transaction stream timeout." });
  }
});

app.post('/api/secure-booking', async (req, res) => {
  const { courtName, sportType, userName, date, timeSlot } = req.body;
  const bookingId = "BK-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  
  const payload = {
    action: "secureBooking",
    bookingId, courtName, sportType, userName, date, timeSlot
  };

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept-Encoding': 'identity'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if(data.status === "success") await refreshDataPoolCache();
    res.json(data);
  } catch (err) {
    res.json({ status: "error", message: "Booking network stream timeout." });
  }
});

app.post('/api/release-booking', async (req, res) => {
  const { bookingId } = req.body;
  
  const payload = {
    action: "removeBooking",
    bookingId: bookingId
  };

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept-Encoding': 'identity'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if(data.status === "success") await refreshDataPoolCache();
    res.json(data);
  } catch (err) {
    res.json({ status: "error", message: "Cancellation network stream timeout." });
  }
});

// =================================================================
// 🛡️ RECOVERY FIX: PASSES VERIFICATION DOWN TO THE SCRIPT ENGINE
// =================================================================
app.post('/api/reset-password', async (req, res) => {
  const { email, verificationCode, newPassword } = req.body;
  
  const payload = {
    action: "updateRow",
    tabName: "Member_Directory",
    keyColumn: "google_email",
    keyValue: email,
    updateColumn: "password",
    updateValue: newPassword,
    verificationCode: verificationCode // Passes Unique ID down to script
  };

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept-Encoding': 'identity'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if(data.status === "success") await refreshDataPoolCache();
    res.json(data);
  } catch (err) {
    res.json({ status: "error", message: "Password override network stream timeout." });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if(email === "admin@email.com" && password === "1qaz2wsx") {
    res.json({ token: "adm_secure_token_layer", name: "System Manager" });
  } else {
    res.status(401).json({ message: "Unauthorized Entry Key." });
  }
});

app.post('/api/admin/get-users', async (req, res) => {
  res.json({ users: CACHED_USERS });
});

app.listen(process.env.PORT || 3000, () => console.log("Chirag Sports Secured Core Engine running on port 3000."));
