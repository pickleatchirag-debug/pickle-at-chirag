const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ⚡ YOUR NEW SYNCHRONIZED GOOGLE PIECES STREAM URL
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbxbiHJTFD4f7OmCoG8AfpV79IkEoqVZ8WWEUJ0PuIs40VWB41rDRyjnVzb5Zb7BUHkyJQ/exec";

let masterCachedUsersRegistry = [];
let masterCachedBookingsRegistry = [];
let customGlobalTickerMemory = "Welcome to the Pickle at Chirag Portal! Use your secure password to manage your active booking.";

// Pools your real sheet data rows every 6 seconds
async function syncDatabaseFromGoogleSheets() {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(GOOGLE_SHEETS_API_URL + "?action=getSnapshot");
        const data = await response.json();
        if (data.users) masterCachedUsersRegistry = data.users;
        if (data.bookings) masterCachedBookingsRegistry = data.bookings;
    } catch (e) {
        console.log("Database fetch framework pause loop:", e);
    }
}
setInterval(syncDatabaseFromGoogleSheets, 6000);
syncDatabaseFromGoogleSheets();

// 1. MEMBER LOGIN GATEWAY HANDSHAKE
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ status: "error", message: "Please map all credentials keys." });
    
    const cleanEmail = email.toLowerCase().trim();
    const userMatch = masterCachedUsersRegistry.find(u => 
        u.google_email.toLowerCase().trim() === cleanEmail && 
        String(u.password).trim() === String(password).trim()
    );

    if (!userMatch) {
        return res.json({ status: "error", message: "Invalid authorized email or personal security key." });
    }

    res.json({
        status: "success",
        token: "sess_" + Buffer.from(cleanEmail).toString('base64'),
        user: userMatch,
        activeTokens: userMatch.available_tokens ?? 2,
        ticker: customGlobalTickerMemory
    });
});

// 2. MEMBER ACCOUNT REGISTRATION PIPELINE
app.post('/api/register', async (req, res) => {
    const { email, fullName, registrationCode, password } = req.body;
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "addRegistration",
                email: email.toLowerCase().trim(),
                fullName: fullName.trim(),
                registrationCode: registrationCode.trim(),
                password: password.trim()
            })
        });
        const result = await response.json();
        if (result.status === "success") {
            setTimeout(syncDatabaseFromGoogleSheets, 1000);
            res.json({ status: "success" });
        } else {
            res.json({ status: "error", message: result.message || "Google rejected row format." });
        }
    } catch(e) {
        res.json({ status: "error", message: "Write sequence failed. Check script permissions." });
    }
});

// 3. SECURE REVENUE BOOKING SINK
app.post('/api/secure-booking', async (req, res) => {
    const { courtName, sportType, userName, date, timeSlot } = req.body;
    const bId = "BK-" + Math.floor(1000 + Math.random() * 9000);

    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "secureBooking", bookingId: bId, courtName, sportType, userName, date, timeSlot })
        });
        const result = await response.json();
        if(result.status === "success") {
            setTimeout(syncDatabaseFromGoogleSheets, 1000);
            res.json({ status: "success" });
        } else {
            res.json({ status: "error", message: "Row assignment error." });
        }
    } catch(e) {
        res.json({ status: "error", message: "Write sequence blocked." });
    }
});

// 4. LIVE TICKER BANNER MANAGEMENT UPDATE
app.post('/api/admin-update-ticker', (req, res) => {
    customGlobalTickerMemory = req.body.tickerText;
    res.json({ status: "success" });
});

// 5. SECURE LIVE GOOGLE SHEET CANCELLATION LINK PATHWAY
app.post('/api/admin-force-cancel-booking', async (req, res) => {
    const { bookingId } = req.body;
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "removeBooking", bookingId })
        });
        const result = await response.json();
        if (result.status === "success") {
            setTimeout(syncDatabaseFromGoogleSheets, 1000);
            res.json({ status: "success" });
        } else {
            res.json({ status: "error", message: result.message || "Cancellation rejected by Google." });
        }
    } catch (e) {
        res.json({ status: "error", message: "Communication error to database script." });
    }
});

// 6. ADMINISTRATIVE REGISTRY FETCHES
app.post('/api/admin-fetch-dashboard-snapshot', (req, res) => {
    res.json({ users: masterCachedUsersRegistry, bookings: masterCachedBookingsRegistry });
});

app.post('/api/fetch-logs', (req, res) => {
    res.json({ records: masterCachedBookingsRegistry });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 CHIRAG ENGINE LIVE ON PORT ${PORT}`);
});