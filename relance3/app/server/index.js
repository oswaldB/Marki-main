const express = require('express');
const app = express();

app.use(express.json());

// Health endpoint - sans /api car Caddy retire le prefix
app.get('/healthy', (req, res) => {
    res.json({ status: 'ok', name: 'response ok' });
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
