import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  const PORT = 3000;

  try {
    app.use(express.json({ limit: '10mb' }));

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mock ID/Password Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    
    // In a real app, you'd check a DB. For this kiosk, we'll allow standard admin/manager credentials
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

  // --- Vite / Static Handling ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`WORKFORCE KIOSK Server running on http://localhost:${PORT}`);
    });
  } catch (globalErr) {
    console.error("FATAL: Server failed to start:", globalErr);
    process.exit(1);
  }
}

startServer();
