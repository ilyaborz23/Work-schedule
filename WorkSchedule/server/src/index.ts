import express from "express";

const app = express();
const PORT = 3001;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
