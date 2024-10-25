const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const axios = require("axios"); // Importer axios
const sqlite3 = require("sqlite3").verbose(); // Importer sqlite3
const cors = require("cors");
const Consul = require("consul");

const app = express();
const port = 3000;
const consul = new Consul({host: "consul"});

app.use(cors());

// Middleware pour les fichiers statiques et le parsing des formulaires
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Pour pouvoir recevoir des JSON dans les requêtes

// Connexion à la base de données SQLite
const db = new sqlite3.Database("./soirees.db", (err) => {
  if (err) {
    console.error(
      "Erreur lors de l'ouverture de la base de données:",
      err.message
    );
  } else {
    console.log("Connexion à la base de données SQLite réussie.");
    db.run(`
            CREATE TABLE IF NOT EXISTS soirees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL,
                date TEXT NOT NULL,
                playlist TEXT,
                client INTEGER
            )
        `);
  }
});

// Routes
app.get("/", (req, res) => {
  res.redirect("/soirees");
});

app.get("/soirees", (req, res) => {
  db.all("SELECT * FROM soirees", (err, rows) => {
    if (err) {
      console.error("Erreur lors de la récupération des soirées:", err.message);
      res
        .status(500)
        .json({ error: "Erreur lors de la récupération des soirées." });
    } else {
      res.json(rows);
    }
  });
});

app.get("/zozo", (req, res) => {
  db.run(
    "INSERT INTO soirees (nom, date, playlist, client) VALUES (?, ?, ?, ?)",
    ["Soirée rap", "2024-10-25", "921bad57-781e-4f0f-9fdd-40e8e46c60c1", 2],
    function (err) {
      if (err) {
        console.error("Erreur lors de l'ajout de la soirée:", err.message);
        res.status(500).json({ error: "Erreur lors de l'ajout de la soirée." });
      } else {
        res.json({ message: "Soirée ajoutée avec succès.", id: this.lastID });
      }
    }
  );
});

app.get("/test", async (req, res) => {
    const nodes = await consul.catalog.service.nodes({ service: "playlists-api" });
    const node = nodes[0];
    const playlistUrl = `http://${node.ServiceAddress}:${node.ServicePort}/playlists/${playlist}`;
});

app.get("/soirees/:id", (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM soirees WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error(
        "Erreur lors de la récupération de la soirée:",
        err.message
      );
      res
        .status(500)
        .json({ error: "Erreur lors de la récupération de la soirée." });
    } else {
      res.json(row);
    }
  });
});

app.post("/soirees/edit/:id", (req, res) => {
  const id = req.params.id;
  const { nom, date, playlist, client } = req.body;
  db.run(
    "UPDATE soirees SET nom = ?, date = ?, playlist = ?, client = ? WHERE id = ?",
    [nom, date, playlist, client, id],
    (err) => {
      if (err) {
        console.error(
          "Erreur lors de la mise à jour de la soirée:",
          err.message
        );
        res
          .status(500)
          .json({ error: "Erreur lors de la mise à jour de la soirée." });
      } else {
        res.json({ message: "Soirée mise à jour avec succès." });
      }
    }
  );
});

app.delete("/soirees/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM soirees WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Erreur lors de la suppression de la soirée:", err.message);
      res
        .status(500)
        .json({ error: "Erreur lors de la suppression de la soirée." });
    } else {
      res.json({ message: "Soirée supprimée avec succès." });
    }
  });
});

app.post("/soirees", async (req, res) => {
  const { nom, date, playlist, client } = req.body;

  try {
    const nodes = await consul.catalog.service.nodes({ service: "playlists-api" });
    const node = nodes[0];
    const playlistUrl = `http://${node.ServiceAddress}:${node.ServicePort}/playlists/${playlist}`;

    const response = await axios.get(playlistUrl);
    if (response.data.length !== 0) {
      db.run(
        "INSERT INTO soirees (nom, date, playlist, client) VALUES (?, ?, ?, ?)",
        [nom, date, playlist, client],
        function (err) {
          if (err) {
            console.error("Erreur lors de l'ajout de la soirée:", err.message);
            res.status(500).json({ error: "Erreur lors de l'ajout de la soirée." });
          } else {
            res.json({
              message: "Soirée ajoutée avec succès.",
              id: this.lastID,
            }); 
          }
        }
      );
    } else {
      res.status(404).json({ error: "Playlist non trouvée." });
    }
  } catch (err) {
    console.error("Erreur lors de la récupération de la playlist:", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération de la playlist." });
  }
});

app.listen(port, () => {
  console.log(`Serveur en écoute sur http://localhost:${port}`);
});
