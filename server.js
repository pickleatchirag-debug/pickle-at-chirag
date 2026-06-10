const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const APPS_SCRIPT_URL =
'https://script.google.com/macros/s/AKfycby_elXprUxfCPl1WYiPx2gc6TWpohNY-osHhfGgxeZBacn1vimm433n7sHUx2AvuVvHtg/exec';

app.use(express.json());
app.use(cookieParser());

app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
res.json({
success: true,
message: 'Render server running'
});
});

app.post('/api/test-login', async (req, res) => {

try {

```
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

const data = await response.json();

res.json(data);
```

} catch(err) {

```
res.status(500).json({
  success: false,
  error: err.toString()
});
```

}

});

app.get('*', (req, res) => {
res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
