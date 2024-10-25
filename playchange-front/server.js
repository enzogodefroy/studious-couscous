const express = require('express');
const path = require('path');

const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());

// Servir le fichier index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});