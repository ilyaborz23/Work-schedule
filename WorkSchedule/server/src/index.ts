import express from "express";
import shiftRoutes from "./routes/shiftRoutes.js";


const app = express();
const PORT = 3001;
app.use(express.json());
app.use("/api/shifts", shiftRoutes);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
