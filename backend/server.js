import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import analyzeRoute from "./routes/analyzeRoute.js";

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Enable CORS with specific options
app.use(cors({
  origin: "http://localhost:3000", // Your frontend URL
  credentials: true
}));

// Enable JSON and URL-encoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use("/api", analyzeRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("GEMINI API Key:", process.env.GEMINI_API_KEY ? "Loaded" : "Missing");
  console.log(`Upload directory: ${path.join(__dirname, 'uploads')}`);
});
