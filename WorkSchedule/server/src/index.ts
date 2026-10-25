import fs from "node:fs";
import path from "node:path";
import express from "express";
import shiftRoutes from "./routes/shiftRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();
// Hosting (Railway) gives the port in PORT; locally it's 3001
const PORT = Number(process.env.PORT) || 3001;

// Behind the host's proxy: lets the login rate limit see the user's real IP
app.set("trust proxy", 1);

app.use(express.json());
app.use("/api/shifts", shiftRoutes);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// In production the built client (client/dist) is served from here too: one address for the site and the API.
// Any non-API path gets index.html, React decides what to show.
const clientDist = path.resolve(import.meta.dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
