const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Replace this with your deployed Google Web App Executable Link URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYED_APPS_SCRIPT_ID/exec";

// Local structural session token memory cache array
let REGISTERED_USERS = [];
let BOOKING_RECORDS = [];
let ADMIN_MANAGERS = [];

function getTodayFormattedIST(offsetDays = 0) {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  d.setDate(d.getDate() + offsetDays);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// 🔄 SYNC PIPELINE RUNTIME ENGINE LOOP
async function syncDatabaseMemoryPool() {
  try {
    // Read user directories
    let rUsers = await fetch(`${GOOGLE_SCRIPT_URL}?action=readTab&tabName=members`).then(res => res.json());
    if (Array.isArray(rUsers)) REGISTERED_USERS = rUsers;

    // Read reservation parameters 
    let rLogs = await fetch(`${GOOGLE_SCRIPT_URL}?action=readTab&tabName=records`).then(res => res.json());
    if (Array.isArray(rLogs)) BOOKING_RECORDS = rLogs;

    // Read admin staff credentials
    let rAdmins = await fetch(`${GOOGLE_SCRIPT_URL}?action=readTab&tabName=admins`).then(res => res.json());
    if (Array.isArray(rAdmins)) ADMIN_MANAGERS = rAdmins;
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
  if (match.is_access_enabled.toString().toUpperCase() !== "ENABLED") {
    return res.status(403).json({ status: "error", message: "Account locked. Please consult operations administrators." });
  }

  const token = `sess_${Buffer.from(match.google_email).toString('base64')}`;
  res.json({
    status: "success",
    token: token,
    user: {
      full_name: match.full_name,
      google_email: match.google_email,
      joining_code: match.joining_code
    },
    activeTokens: match.dues_status === "PAID" ? 3 : 0,
    ticker: "Sync Completed. All live court assets unsealed."
  });
});

app.post('/api/register', async (req, res) => {
  const { email, fullName, registrationCode, password } = req.body;
  const match = REGISTERED_USERS.find(u => u.google_email.trim().toLowerCase() === email.trim().toLowerCase());

  if (!match) return res.status(404).json({ status: "error", message: "Email not whitelisted in community parameters." });
  
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        tabName: "members",
        action: "updateRow",
        keyColumn: "google_email",
        keyValue: email,
        updateColumn: "full_name",
        updateValue: fullName
      })
    });

    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        tabName: "members",
        action: "updateRow",
        keyColumn: "google_email",
        keyValue: email,
        updateColumn: "is_registered",
        updateValue: "TRUE"
      })
    });

    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        tabName: "members",
        action: "updateRow",
        keyColumn: "google_email",
        keyValue: email,
        updateColumn: "password",
        updateValue: password
      })
    });

    syncDatabaseMemoryPool();
    res.json({ status: "success" });
  } catch(err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

// Logs API Endpoints
app.post('/api/fetch-logs', (req, res) => {
  res.json({ records: BOOKING_RECORDS });
});

// Admin verification gate routing logic
app.post('/api/admin/verify-gate', (req, res) => {
  const { adminPass } = req.body;
  const match = ADMIN_MANAGERS.find(a => a.password.toString().trim() === adminPass.toString().trim());
  if (match) return res.json({ status: "success", role: match.full_name });
  res.status(401).json({ status: "error", message: "Access Denied. Master row encryption keys mismatch." });
});

app.post('/api/admin/directory', (req, res) => {
  res.json({ members: REGISTERED_USERS });
});

app.post('/api/admin/list-managers', (req, res) => {
  res.json({ admins: ADMIN_MANAGERS });
});

app.post('/api/admin/authorize-member', async (req, res) => {
  const { email } = req.body;
  const payload = {
    tabName: "members",
    data: [`id_${Math.floor(100+Math.random()*900)}`, "Pending Registration", email, "C2", "FALSE", "ENABLED", "PAID", getTodayFormattedIST(0), getTodayFormattedIST(30)]
  };
  await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
  syncDatabaseMemoryPool();
  res.json({ status: "success" });
});

app.post('/api/admin/update-access', async (req, res) => {
  const { email, targetStatus } = req.body;
  const payload = {
    tabName: "members",
    action: "updateRow",
    keyColumn: "google_email",
    keyValue: email,
    updateColumn: "is_access_enabled",
    updateValue: targetStatus
  };
  await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
  syncDatabaseMemoryPool();
  res.json({ status: "success" });
});

app.post('/api/admin/remove-whitelist', async (req, res) => {
  const { email } = req.body;
  const payload = {
    tabName: "members",
    action: "deleteRow",
    keyColumn: "google_email",
    keyValue: email
  };
  await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
  syncDatabaseMemoryPool();
  res.json({ status: "success" });
});

app.post('/api/secure-booking', async (req, res) => {
  const { courtName, sportType, userName, date, timeSlot } = req.body;
  const payload = {
    tabName: "records",
    data: [`b_${Math.floor(1000+Math.random()*9000)}`, courtName, sportType, userName, "resident@chirag.com", "Unit-C", date, timeSlot]
  };
  await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
  syncDatabaseMemoryPool();
  res.json({ status: "success" });
});

app.post('/api/release-booking', async (req, res) => {
  const { bookingId } = req.body;
  const payload = {
    tabName: "records",
    action: "deleteRow",
    keyColumn: "booking_id",
    keyValue: bookingId
  };
  await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
  syncDatabaseMemoryPool();
  res.json({ status: "success" });
});

app.listen(3000, () => console.log('Chirag Sports Core Server Engine running on port 3000.'));