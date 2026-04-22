import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  
  if (username === "admin" && password === "admin123") {
      return res.json({ 
          success: true, 
          user: { id: 'adm_1', name: 'Robin Bosky', role: 'ADMIN', position: 'Factory Owner' } 
      });
  }
  
  if (username === "manager" && password === "manager123") {
      return res.json({ 
          success: true, 
          user: { id: 'mgr_1', name: 'Sarah Connor', role: 'MANAGER', position: 'Site Manager' } 
      });
  }

  if (username === "staff" && password === "staff123") {
      return res.json({ 
          success: true, 
          user: { id: 'SHARED_STAFF', name: 'Workforce Hub', role: 'EMPLOYEE', position: 'Kiosk Terminal' } 
      });
  }

  res.status(401).json({ success: false, message: "Invalid workforce credentials" });
});

// Serve frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on " + PORT);
});
