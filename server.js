app.get('/api/test-login', async (req, res) => {

  try {

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'memberLogin',
        email: 'rahulbabbar@msn.com',
        password: 'asdfghjkl'
      })
    });

    const text = await response.text();

    return res.send(text);

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.toString()
    });

  }

});
