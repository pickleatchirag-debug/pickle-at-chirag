const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ⚡ PASTE YOUR REFRESHED GOOGLE MACRO SCRIPT WEB APP URL DIRECTLY BELOW:
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbxbiHJTFD4f7OmCoG8AfpV79IkEoqVZ8WWEUJ0PuIs40VWB41rDRyjnVzb5Zb7BUHkyJQ/exec";

let masterCachedUsersRegistry = [];
let masterCachedBookingsRegistry = [];
let masterCachedAdminsRegistry = [];
let masterCachedWhitelistRegistry = [];
let customGlobalTickerMemory = "Welcome to the Pickle at Chirag Portal! Manage your active bookings seamlessly.";

async function syncDatabaseFromGoogleSheets() {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(GOOGLE_SHEETS_API_URL + "?action=getSnapshot");
        const data = await response.json();
        if (data.users) masterCachedUsersRegistry = data.users;
        if (data.bookings) masterCachedBookingsRegistry = data.bookings;
        if (data.admins) masterCachedAdminsRegistry = data.admins;
        if (data.whitelistedEmails) masterCachedWhitelistRegistry = data.whitelistedEmails;
    } catch (e) {
        console.log("Sync core hold trace exception:", e);
    }
}
setInterval(syncDatabaseFromGoogleSheets, 6000);
syncDatabaseFromGoogleSheets();

app.post('/api/gate-verify-whitelist', (req, res) => {
    const { email } = req.body;
    if(!email) return res.json({ status: "error", message: "Missing token parameter value." });
    const cleanEmail = email.toLowerCase().trim();
    const matchFound = masterCachedWhitelistRegistry.find(w => w.email.toLowerCase().trim() === cleanEmail);
    if (matchFound) {
        res.json({ status: "success", code: matchFound.code });
    } else {
        res.json({ status: "error", message: "This email address row is not currently approved." });
    }
});

app.post('/api/admin-login', (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const adminMatch = masterCachedAdminsRegistry.find(a => a.email === cleanEmail && String(a.password).trim() === String(password).trim());
    if (adminMatch) res.json({ status: "success" });
    else res.json({ status: "error", message: "Invalid Administration Access credentials." });
});

app.post('/api/admin-add-whitelist', async (req, res) => {
    const { email, code } = req.body;
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        await fetch(GOOGLE_SHEETS_API_URL, { method: 'POST', body: JSON.stringify({ action: "addWhitelistRow", email, code }) });
        setTimeout(syncDatabaseFromGoogleSheets, 1200);
        res.json({ status: "success" });
    } catch (e) { res.json({ status: "error" }); }
});

app.post('/api/admin-send-member-message', async (req, res) => {
    const { email, message } = req.body;
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        await fetch(GOOGLE_SHEETS_API_URL, { method: 'POST', body: JSON.stringify({ action: "addMemberMessageRow", email, message }) });
        res.json({ status: "success" });
    } catch (e) { res.json({ status: "error" }); }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const userMatch = masterCachedUsersRegistry.find(u => u.google_email.toLowerCase().trim() === cleanEmail && String(u.password).trim() === String(password).trim());
    if (!userMatch) return res.json({ status: "error", message: "Invalid credentials." });
    res.json({ status: "success", token: "sess_" + Buffer.from(cleanEmail).toString('base64'), user: userMatch, activeTokens: userMatch.available_tokens ?? 2, ticker: customGlobalTickerMemory });
});

app.post('/api/register', async (req, res) => {
    const { email, fullName, registrationCode, password } = req.body;
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(GOOGLE_SHEETS_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "addRegistration", email, fullName, registrationCode, password }) });
        const result = await response.json();
        if (result.status === "success") { setTimeout(syncDatabaseFromGoogleSheets, 1000); res.json({ status: "success" }); } 
        else { res.json({ status: "error", message: result.message }); }
    } catch(e) { res.json({ status: "error", message: "Write failed." }); }
});

// 🔥 CORE FIX: FORMAT INBOUND STRINGS SECURELY
app.post('/api/secure-booking', async (req, res) => {
    const { courtName, sportType, userName, date, timeSlot } = req.body;
    const bId = "BK-" + Math.floor(1000 + Math.random() * 9000);
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        await fetch(GOOGLE_SHEETS_API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                action: "secureBooking", 
                bookingId: bId, 
                courtName: String(courtName).trim(), 
                sportType: String(sportType).trim(), 
                userName: String(userName).trim(), 
                date: String(date).trim(), 
                timeSlot: String(timeSlot).trim() 
            }) 
        });
        setTimeout(syncDatabaseFromGoogleSheets, 1100);
        res.json({ status: "success" });
    } catch(e) { res.json({ status: "error" }); }
});

app.post('/api/admin-update-ticker', (req, res) => { customGlobalTickerMemory = req.body.tickerText; res.json({ status: "success" }); });
app.post('/api/admin-force-cancel-booking', async (req, res) => {
    const { bookingId } = req.body;
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        await fetch(GOOGLE_SHEETS_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "removeBooking", bookingId }) });
        setTimeout(syncDatabaseFromGoogleSheets, 1000);
        res.json({ status: "success" });
    } catch (e) { res.json({ status: "error" }); }
});

app.post('/api/admin-fetch-dashboard-snapshot', (req, res) => { res.json({ users: masterCachedUsersRegistry, bookings: masterCachedBookingsRegistry, whitelisted: masterCachedWhitelistRegistry }); });
app.post('/api/fetch-logs', (req, res) => { res.json({ records: masterCachedBookingsRegistry }); });

app.get('/gate', (req, res) => { res.sendFile(path.join(__dirname, 'gate.html')); });
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.listen(PORT, () => { console.log(`🚀 CORE MATRIX SYSTEM ACTIVE ON PORT BOUND ${PORT}`); });
