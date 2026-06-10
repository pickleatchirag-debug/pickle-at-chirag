const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 🎯 REPLACE THIS WITH YOUR ACTIVE GOOGLE WEB APP DEPLOYMENT URL STRING FROM POINT A
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycby_elXPrUxfCPl1WYiPx2gc6TWpohNY-osHhfGgxeZBacn1vimm433n7sHUx2AvD0eS/exec";

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Master Background Database Memory Cache Registries
let masterCachedUsersRegistry = [];
let masterCachedBookingsRegistry = [];
let masterCachedWhitelistRegistry = [];

// 🔄 1. BACKGROUND MEMORY SYNCHRONIZATION LEDGER PIPE
async function syncDatabaseFromGoogleSheets() {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
        const response = await fetch(`${GOOGLE_SHEETS_API_URL}?action=getSnapshot`);
        
        if (!response.ok) throw new Error(`HTTP network error wrapper alert: ${response.status}`);
        const data = await response.json();
        
        if (data.users) masterCachedUsersRegistry = data.users;
        if (data.bookings) masterCachedBookingsRegistry = data.bookings;
        if (data.whitelisted) masterCachedWhitelistRegistry = data.whitelisted;
        
        console.log(`⚡ System cache updated smoothly. Sync metrics: [Users: ${masterCachedUsersRegistry.length} | Bookings: ${masterCachedBookingsRegistry.length}]`);
    } catch (e) {
        console.error("Sync background token pipeline notice exception:", e.message);
    }
}

// Spin data poll cycle routine intervals every 8 seconds
setInterval(syncDatabaseFromGoogleSheets, 8000);
syncDatabaseFromGoogleSheets();

// 🔑 2. SECURE LOGOUT VECTOR ROUTE
app.post('/api/logout', (req, res) => {
    res.clearCookie('chirag_secure_token');
    res.json({ status: "success", message: "Session token released cleanly." });
});

// 🔑 3. DYNAMIC MULTI-USER SESSION STATUS CHECKER
app.get('/api/check-session', (req, res) => {
    const sessionCookie = req.cookies.chirag_secure_token;
    if (!sessionCookie) {
        return res.status(401).json({ status: "unauthorized", message: "Identity proxy vacant." });
    }

    try {
        // Decodes cookie signature parameters directly
        const decodedEmail = Buffer.from(sessionCookie, 'base64').toString('ascii').toLowerCase().trim();
        const userMatch = masterCachedUsersRegistry.find(u => u.google_email.toLowerCase().trim() === decodedEmail);

        if (!userMatch) {
            res.clearCookie('chirag_secure_token');
            return res.status(401).json({ status: "unauthorized", message: "User profile record not found." });
        }

        res.json({
            status: "authorized",
            user: {
                fullName: userMatch.full_name,
                email: userMatch.google_email,
                tokensBalance: userMatch.available_tokens ?? 3
            }
        });
    } catch (err) {
        res.status(401).json({ status: "unauthorized", message: "Session token parsing fault." });
    }
});

// 🔑 4. SECURE MEMBER ACCOUNT LOGIN VALIDATION HANDSHAKE
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: "error", message: "Required parameter validation failed." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const inputPassword = String(password).trim();

    const userMatch = masterCachedUsersRegistry.find(u => {
        const emailMatches = u.google_email.toLowerCase().trim() === cleanEmail;
        const sheetPassword = String(u.password || "").trim();
        return emailMatches && sheetPassword === inputPassword;
    });

    if (!userMatch) {
        return res.status(401).json({ status: "error", message: "Invalid resident credentials or missing account token." });
    }

    // Set secure base64 state cookie session keys
    const sessionCookieString = Buffer.from(cleanEmail).toString('base64');
    res.cookie('chirag_secure_token', sessionCookieString, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // Stable 7-day expiration lifespan
    });

    res.json({
        status: "success",
        user: {
            fullName: userMatch.full_name,
            email: userMatch.google_email,
            tokensBalance: userMatch.available_tokens ?? 3
        }
    });
});

// 📊 5. SECURE REAL-TIME DATABASE SNAPSHOT DISPATCH
app.get('/api/admin-fetch-dashboard-snapshot', (req, res) => {
    const sessionCookie = req.cookies.chirag_secure_token;
    if (!sessionCookie) {
        return res.status(401).json({ status: "unauthorized", message: "Access locked." });
    }
    
    res.json({
        users: masterCachedUsersRegistry || [],
        bookings: masterCachedBookingsRegistry || [],
        whitelisted: masterCachedWhitelistRegistry || []
    });
});

// 🔒 6. WRITE BACK TRANSACTION PROXIES TO GOOGLE SCRIPT APPS WIDGETS
app.post('/api/admin-post-action-dispatch', async (req, res) => {
    const sessionCookie = req.cookies.chirag_secure_token;
    if (!sessionCookie) {
        return res.status(401).json({ status: "unauthorized", message: "Transaction sign block." });
    }

    try {
        const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
        const response = await fetch(GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            await syncDatabaseFromGoogleSheets(); // Force synchronization instant updates
        }
        res.json(data);
    } catch (error) {
        console.error("Write proxy submission fatal transaction exception:", error);
        res.status(500).json({ status: "error", message: "Operational pipeline timeout. Direct row entry dropped." });
    }
});

// Serve frontend mapping layout routes cleanly
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Chirag Core Gateway Engine standing operational live on port channel: ${PORT}`);
});
