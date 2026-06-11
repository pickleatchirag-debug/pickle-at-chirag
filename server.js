// 📄 ENHANCED IN-MEMORY DATA LOGS
let BOOKING_RECORDS = [
  {
    booking_id: 'b_9921',
    court_name: 'Pickleball Court 1',
    sport_type: 'PICKLEBALL',
    booked_by: 'Rahul Babbar',
    player_email: 'rahul.babbar@gmail.com', // Added profile details
    player_unit: 'A1',
    date: getTodayFormattedIST(0),
    time_slot: '18:00 - 19:00'
  },
  {
    booking_id: 'b_9922',
    court_name: 'Pickleball Court 2',
    sport_type: 'PICKLEBALL',
    booked_by: 'Kaveri Gulati',
    player_email: 'kaveri.gulati@gmail.com',
    player_unit: 'D4',
    date: getTodayFormattedIST(0),
    time_slot: '19:00 - 20:00'
  }
];

// Enhanced Booking Lock Route
app.post('/api/secure-booking', (req, requireRes) => {
  const { courtName, sportType, userName, date, timeSlot, sessionToken } = req.body;

  if (!courtName || !date || !timeSlot || !sessionToken) {
    return requireRes.status(400).json({ status: 'error', message: 'Missing core booking specifications.' });
  }

  const collisionConflict = BOOKING_RECORDS.find(
    b => b.court_name.toLowerCase() === courtName.toLowerCase() && b.date === date && b.time_slot === timeSlot
  );

  if (collisionConflict) {
    return requireRes.status(409).json({ status: 'error', message: 'Collision block!' });
  }

  // Look up the logged-in user profile to extract email and unit details automatically
  const base64Email = Buffer.from(sessionToken.replace('sess_', ''), 'base64').toString('ascii');
  const activeUser = REGISTERED_USERS.find(u => u.google_email.toLowerCase() === base64Email.toLowerCase());

  const newBookingId = `b_${Math.floor(1000 + Math.random() * 9000)}`;
  BOOKING_RECORDS.push({
    booking_id: newBookingId,
    court_name: courtName,
    sport_type: sportType || 'PICKLEBALL',
    booked_by: userName || 'Resident Player',
    player_email: activeUser ? activeUser.google_email : 'N/A',
    player_unit: activeUser ? activeUser.unit_code : 'N/A',
    date: date,
    time_slot: timeSlot
  });

  requireRes.json({ status: 'success', bookingId: newBookingId });
});