import express from "express";
import path from "path";
const app = express();
const PORT = process.env.PORT ?? 5000;
// Parse JSON bodies
app.use(express.json());
// Serve static files from the built React app (when built)
// app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));
// Example API endpoint
app.get("/api/hello", (_req, res) => {
    res.json({ message: "👋 from Express + TypeScript!" });
});
// Fallback for client‑side routing (serve index.html)
app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "client", "dist", "index.html"));
});
app.listen(PORT, () => console.log(`🚀 Server listening at http://localhost:${PORT}`));
