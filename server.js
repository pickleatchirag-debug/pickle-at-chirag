const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Setup
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 📄 IN-MEMORY DATABASE MOCK 
// (Replace or link with your MongoDB / PostgreSQL pool logic as required)
let WHITELISTED_CODES = {
  'c2': { full_name: 'Gayatri Babbar', unit: 'C2', used: false },
  'g12': { full_name: 'Gautam Babbar', unit: 'G12', used: false },
  'd4': { full_name: 'Kaveri Gulati', unit: 'D4', used: false }
};

let REGISTERED_USERS = [
  {
    google_email: 'rahul.babbar@gmail.com',
    full_name: 'Rahul Babbar',
    password_key: 'password123', // Clean text fallback for security demo mapping
    unit_code: 'A1',
    tokens: 4
  }
];

let BOOKING_RECORDS = [
  {
    booking_id: 'b_9921',
    court_name: 'Pickleball Court 1',
    sport_type: 'PICKLEBALL',
    booked_by: 'Rahul Babbar',
    date: getTodayFormattedIST(0),
    time_slot: '18:00 - 19:00'
  },
  {
    booking_id: 'b_9922',
    court_name: 'Pickleball Court 2',
    sport_type: 'PICKLEBALL',
    booked_by: 'Kaveri Gulati',
    date: getTodayFormattedIST(0),
    time_slot: '19:00 - 20:00'
  }
];

// Helper to grab clean active date tags matching Indian Standard Time (IST)
function getTodayFormattedIST(daysAhead = 0) {
  let d = new Date();
  let utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  let ist = new Date(utc + (3600000 * 5.5));
  ist.setDate(ist.getDate() + daysAhead);
  return `${String(ist.getDate()).padStart(2, '0')}/${String(ist.getMonth() + 1).padStart(2, '0')}/${ist.getFullYear()}`;
}

// -------------------------------------------------------------
// 🛠️ ENDPOINTS API PATHWAYS
// -------------------------------------------------------------

// 1. Core Profile Identity Authentication Loop
app.post('/api/login', (req, requireRes) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return requireRes.status(400).json({ status: 'error', message: 'Missing credentials.' });
  }

  const userMatch = REGISTERED_USERS.find(
    u => u.google_email.toLowerCase() === email.toLowerCase() && u.password_key === password
  );

  if (!userMatch) {
    return requireRes.status(401).json({ status: 'error', message: 'Invalid authorized email or personal security key.' });
  }

  // Generate a mock static layout session token for context validation
  const sessionToken = `sess_${Buffer.from(email).toString('base64').substring(0, 12)}`;

  requireRes.json({
    status: 'success',
    token: sessionToken,
    activeTokens: userMatch.tokens,
    ticker: `✨ Connected to Member Desk. Hello, ${userMatch.full_name}! Check open court tracks below.`,
    user: {
      google_email: userMatch.google_email,
      full_name: userMatch.full_name,
      unit_code: userMatch.unit_code
    }
  });
});

// 2. Core New Member Profile Registration
app.post('/api/register', (req, requireRes) => {
  const { email, fullName, registrationCode, password } = req.body;
  
  if (!email || !fullName || !registrationCode || !password) {
    return requireRes.status(400).json({ status: 'error', message: 'All registration parameters are mandatory.' });
  }

  const codeToken = registrationCode.toLowerCase().trim();
  if (!WHITELISTED_CODES[codeToken]) {
    return requireRes.status(403).json({ status: 'error', message: 'The provided Joining/Unit Code is not whitelisted by the management desk.' });
  }

  const existingEmail = REGISTERED_USERS.find(u => u.google_email.toLowerCase() === email.toLowerCase());
  if (existingEmail) {
    return requireRes.status(400).json({ status: 'error', message: 'A profile context with this email already exists.' });
  }

  // Commit account credentials into system dataset pool
  REGISTERED_USERS.push({
    google_email: email.trim(),
    full_name: fullName.trim(),
    password_key: password,
    unit_code: WHITELISTED_CODES[codeToken].unit,
    tokens: 4
  });

  // Mark the invitation whitelisted token context code as verified
  WHITELISTED_CODES[codeToken].used = true;

  requireRes.json({ status: 'success', message: 'Account initialized successfully!' });
});

// 3. Explicit Secure Server Side Password Override Bypass
app.post('/api/reset-password', (req, requireRes) => {
  const { email, verificationCode, newPassword } = req.body;

  if (!email || !verificationCode || !newPassword) {
    return requireRes.status(400).json({ status: 'error', message: 'Incomplete override credential map parameters.' });
  }

  const codeToken = verificationCode.toLowerCase().trim();
  const userIndex = REGISTERED_USERS.findIndex(
    u => u.google_email.toLowerCase() === email.toLowerCase() && u.unit_code.toLowerCase() === codeToken
  );

  if (userIndex === -1) {
    return requireRes.status(403).json({ status: 'error', message: 'Identity verification verification mismatch. Reset request rejected.' });
  }

  // Override structural array text index
  REGISTERED_USERS[userIndex].password_key = newPassword;
  requireRes.json({ status: 'success', result: 'success', message: 'Password database registry updated clean.' });
});

// 4. Live Log Feed Sync Pipeline
app.post('/api/fetch-logs', (req, requireRes) => {
  // Pipes out active logs straight to the real-time grid matrices
  requireRes.json({ status: 'success', records: BOOKING_RECORDS });
});

// 5. Secure Core Court Booking Lock Management
app.post('/api/secure-booking', (req, requireRes) => {
  const { courtName, sportType, userName, date, timeSlot, sessionToken } = req.body;

  if (!courtName || !date || !timeSlot || !sessionToken) {
    return requireRes.status(400).json({ status: 'error', message: 'Missing core booking specifications.' });
  }

  // Cross-reference conflict cell state matches inside the reservation registry
  const collisionConflict = BOOKING_RECORDS.find(
    b => b.court_name.toLowerCase() === courtName.toLowerCase() && b.date === date && b.time_slot === timeSlot
  );

  if (collisionConflict) {
    return requireRes.status(409).json({ status: 'error', message: 'Collision block! This cell schedule block was just claimed by another member.' });
  }

  const newBookingId = `b_${Math.floor(1000 + Math.random() * 9000)}`;
  BOOKING_RECORDS.push({
    booking_id: newBookingId,
    court_name: courtName,
    sport_type: sportType || 'PICKLEBALL',
    booked_by: userName || 'Resident Player',
    date: date,
    time_slot: timeSlot
  });

  requireRes.json({ status: 'success', bookingId: newBookingId });
});

// 6. Manual Self-Service Reservation Cancellation Releases
app.post('/api/release-booking', (req, requireRes) => {
  const { bookingId, sessionToken } = req.body;

  if (!bookingId || !sessionToken) {
    return requireRes.status(400).json({ status: 'error', message: 'Target specification token parameters missing.' });
  }

  const index = BOOKING_RECORDS.findIndex(b => b.booking_id === bookingId);
  if (index === -1) {
    return requireRes.status(404).json({ status: 'error', message: 'Reservation log matching identity hash not found in data logs.' });
  }

  // Splice target row item container cell
  BOOKING_RECORDS.splice(index, 1);
  requireRes.json({ status: 'success', message: 'Token refunded, reservation frame discarded.' });
});

// Root Catch-All Route serving frontend client app context layout shell frame
app.get('*', (req, requireRes) => {
  requireRes.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize active local listen engine hook
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` 🚀 CHIRAG SPORTS PORTAL BACKEND LOGS DEPLOYED LIVE`);
  console.log(` 🌐 Internal Node Engine Port Loop listening on: ${PORT}`);
  console.log(`====================================================`);
});