const express = require("express");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const app = express();
const PORT = 3000;
const cors = require("cors");
const os = require("os");
const CONSUL_ID = require("uuid").v4();
const axios = require("axios");

app.use(express.json());
app.use(cors());

const localIp = getLocalIp();

// Endpoint pour le health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP" }); // ou un autre indicateur de santé
});

// Enregistrement de l'API dans Consul
axios
  .put("http://consul:8500/v1/agent/service/register", {
    Name: "playlists-api",
    Address: localIp,
    Port: 3000,
    id: CONSUL_ID,
    Tags: ["playlists", "api"],
    Check: {
      http: `http://${localIp}:3000/health`,
      interval: "10s",
      timeout: "5s",
    },
  })
  .then(() => {
    console.log("Service playlists-api enregistré avec succès dans Consul");
  })
  .catch((error) => {
    console.error(
      "Erreur lors de l'enregistrement dans Consul:",
      error.message
    );
  });

const FILE_PATH = "./playlists.json";

const readFile = () => {
  try {
    const data = fs.readFileSync(FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeFile = (data) => {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
};

// GET : Récupérer toutes les playlists
app.get("/playlists", (req, res) => {
  const playlists = readFile();
  res.json(playlists);
});

// GET : Récupérer une playlist par son id
app.get("/playlists/:id", (req, res) => {
  const playlists = readFile();
  const playlist = playlists.find((p) => p.id === req.params.id);

  if (playlist) {
    res.json(playlist);
  } else {
    res.status(404).json({ message: "Playlist non trouvée" });
  }
});

// POST : Créer une nouvelle playlist
app.post("/playlists", (req, res) => {
  const playlists = readFile();
  const newPlaylist = {
    id: uuidv4(), // Génère un ID unique
    nom: req.body.nom,
    description: req.body.description,
    musiques: req.body.musiques, // Liste d'objets {auteur, nom}
  };

  playlists.push(newPlaylist);
  writeFile(playlists);

  res.status(201).json(newPlaylist);
});

// PUT : Mettre à jour une playlist par son id
app.put("/playlists/:id", (req, res) => {
  const playlists = readFile();
  const playlistIndex = playlists.findIndex((p) => p.id === req.params.id);

  if (playlistIndex !== -1) {
    const updatedPlaylist = {
      id: playlists[playlistIndex].id, // ID reste inchangé
      nom: req.body.nom || playlists[playlistIndex].nom,
      description: req.body.description || playlists[playlistIndex].description,
      musiques: req.body.musiques || playlists[playlistIndex].musiques,
    };

    playlists[playlistIndex] = updatedPlaylist;
    writeFile(playlists);

    res.json(updatedPlaylist);
  } else {
    res.status(404).json({ message: "Playlist non trouvée" });
  }
});

// DELETE : Supprimer une playlist par son id
app.delete("/playlists/:id", (req, res) => {
  const playlists = readFile();
  const updatedPlaylists = playlists.filter((p) => p.id !== req.params.id);

  if (updatedPlaylists.length < playlists.length) {
    writeFile(updatedPlaylists);
    res.json({ message: "Playlist supprimée avec succès" });
  } else {
    res.status(404).json({ message: "Playlist non trouvée" });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, async () => {
    try {
      const consulUrl = `http://consul:8500/v1/agent/service/deregister/${CONSUL_ID}`;
      console.log(`Désinscription du service ${CONSUL_ID} suite à ${signal}`);
      await axios.put(consulUrl);
      console.log("Service désinscrit avec succès.");
    } catch (error) {
      console.error(`Erreur lors de la désinscription : ${error.message}`);
    } finally {
      process.exit();
    }
  });
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const details of iface) {
      // On vérifie que ce soit une adresse IPv4 et non une adresse interne (localhost)
      if (details.family === "IPv4" && !details.internal) {
        return details.address;
      }
    }
  }
  return "127.0.0.1"; // Par défaut, retourne localhost si aucune IP externe n'est trouvée
}
