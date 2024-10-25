const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const PORT = 3000;
const cors = require("cors");

app.use(bodyParser.json());
app.use(express.static('public')); // Pour servir des fichiers statiques (comme le HTML)
app.use(cors());

let clients = [];

// Chargement des clients à partir du fichier JSON
const loadClients = () => {
    if (fs.existsSync('clients.json')) {
        const data = fs.readFileSync('clients.json');
        clients = JSON.parse(data);
    }
};

// Sauvegarde des clients dans le fichier JSON
const saveClients = () => {
    fs.writeFileSync('clients.json', JSON.stringify(clients, null, 2));
};

// Routes API
app.get('/clients', (req, res) => {
    loadClients();
    res.json(clients);
});

app.post('/clients', (req, res) => {
    loadClients();
    const newClient = {
        id: clients.length ? clients[clients.length - 1].id + 1 : 1,
        nom: req.body.nom,
        prenom: req.body.prenom,
    };
    clients.push(newClient);
    saveClients();
    res.status(201).json(newClient);
});

app.delete('/clients/:id', (req, res) => {
    loadClients();
    const clientId = parseInt(req.params.id);
    clients = clients.filter(client => client.id !== clientId);
    saveClients();
    res.status(204).end();
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
