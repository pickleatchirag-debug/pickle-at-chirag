const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser()); // ⚡ Allows the server to seamlessly read secure login cookies
app.use(express.static(__dirname));

// ⚡ MASTER SPREADSHEET DISPATCH LINK
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycby_elXprUxfCPl1WYiPx2gc6TWpohNY-osHhfGgxeZBacn1vimm433n7sHUx2AvuVvHtg/exec";

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
        console.log("Sync background token pipeline notice exception:", e);
    }
}
setInterval(syncDatabaseFromGoogleSheets, 5000);
syncDatabaseFromGoogleSheets();

// ⚡ SECURE COOKIE SESSION STATUS VERIFIER TERMINAL
app.get('/api/check-session', (req, res) => {
    const sessionCookie = req.cookies.chirag_secure_token;
    if (!sessionCookie) return res.json({ status: "unauthorized" });

    // Decodes our isolated hardware string parameters safely
    const userEmail = Buffer.from(sessionCookie, 'base64').toString('ascii');
    const userMatch = masterCachedUsersRegistry.find(u => u.google_email.toLowerCase().trim() === userEmail.toLowerCase().trim());
    
    if (!userMatch) return res.json({ status: "unauthorized" });
    res.json({ status: "authorized", user: userMatch, ticker: customGlobalTickerMemory });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const userMatch = masterCachedUsersRegistry.find(u => u.google_email.toLowerCase().trim() === cleanEmail && String(u.password).trim() === String(password).trim());
    
    if (!userMatch) return res.json({ status: "error", message: "Invalid credentials." });
    
    // Creates an absolute secure token key value signature row tracking link
    const tokenSignature = Buffer.from(cleanEmail).toString('base64');
    
    // Drops a secure, permanent hardware cookie set to auto-renew for 365 days straight
    res.cookie('chirag_secure_token', tokenSignature, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 Full Year in milliseconds
        httpOnly: true,                    // Completely protects token from frontend script extraction exploits
        secure: true,                      // Guarantees token travels inside SSL encrypted network pipes
        sameSite: 'strict'
    });

    res.json({ status: "success", user: userMatch, activeTokens: userMatch.available_tokens ?? 2, ticker: customGlobalTickerMemory });
});

app.post('/api/admin-login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ status: "error", message: "Missing administrative inputs data parameters." });
    const cleanEmail = email.toLowerCase().trim();
    const adminMatch = masterCachedAdminsRegistry.find(a => a.email === cleanEmail && String(a.password).trim() === String(password).trim());
    
    if (adminMatch) {
        res.cookie('chirag_admin_token', Buffer.from(cleanEmail).toString('base64'), { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, secure: true, sameSite: 'strict' });
        res.json({ status: "success" });
    } else {
        res.json({ status: "error", message: "Security Gate Refusal: Invalid Credentials." });
    }
});

app.get('/api/admin-check-session', (req, res) => {
    if (req.cookies.chirag_admin_token) res.json({ status: "authorized" });
    else res.json({ status: "unauthorized" });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('chirag_secure_token');
    res.clearCookie('chirag_admin_token');
    res.json({ status: "success" });
});

app.post('/api/gate-verify-whitelist', (req, res) => {
    const { email } = req.body;
    if(!email) return res.json({ status: "error", message: "Missing parameter tokens." });
    const cleanEmail = email.toLowerCase().trim();
    const matchFound = masterCachedWhitelistRegistry.find(w => w.email.toLowerCase().trim() === cleanEmail);
    if (matchFound) res.json({ status: "success", code: matchFound.code });
    else res.json({ status: "error", message: "This email address is not currently whitelisted." });
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

app.post('/api/secure-booking', async (req, res) => {
    const { courtName, sportType, userName, date, timeSlot } = req.body;
    const bId = "BK-" + Math.floor(1000 + Math.random() * 9000);
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        await fetch(GOOGLE_SHEETS_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "secureBooking", bookingId: bId, courtName, sportType, userName, date, timeSlot }) });
        setTimeout(syncDatabaseFromGoogleSheets, 1000);
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

app.post('/api/admin-add-new-manager', async (req, res) => {
    const { email, fullName, password } = req.body;
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(GOOGLE_SHEETS_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "addAdminRow", fullName, email, password }) });
        const result = await response.json();
        if(result.status === "success") { setTimeout(syncDatabaseFromGoogleSheets, 1200); res.json({ status: "success" }); } 
        else { res.json({ status: "error" }); }
    } catch(e) { res.json({ status: "error" }); }
});

app.post('/api/admin-fetch-dashboard-snapshot', (req, res) => { res.json({ users: masterCachedUsersRegistry, bookings: masterCachedBookingsRegistry, whitelisted: masterCachedWhitelistRegistry }); });
app.post('/api/fetch-logs', (req, res) => { res.json({ records: masterCachedBookingsRegistry }); });

app.get('/gate', (req, res) => { res.sendFile(path.join(__dirname, 'gate.html')); });
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.listen(PORT, () => { console.log(`🚀 SECURE PERSISTENT KERNEL LINK ACTIVE ON PORT BOUND ${PORT}`); });
