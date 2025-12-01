import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { analyzeWithAI } from "../aiService.js";
import { mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists (no top-level await)
const uploadDir = path.join(__dirname, '../../uploads');
if (!existsSync(uploadDir)) {
  mkdir(uploadDir, { recursive: true }).catch((err) => {
    console.error('Failed to create uploads directory:', err);
  });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  // Frontend already restricts to log/text/json; accept all here to avoid false negatives
  fileFilter: (req, file, cb) => {
    return cb(null, true);
  }
});

// Error handling middleware for multer
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error: ' + err.message
    });
  } else if (err) {
    // An unknown error occurred during upload – treat as a bad request, not server crash
    console.error('Upload error:', err);

    // Prefer the actual error message from Multer or our fileFilter
    const message = typeof err.message === 'string' && err.message.trim()
      ? err.message
      : 'File upload failed. Please ensure the file is a valid .log, .txt, or .json and try again.';

    return res.status(400).json({
      success: false,
      error: message
    });
  }

  // No error, proceed to next middleware
  next();
};

router.post("/analyze", 
  upload.single("file"),
  handleMulterError,
  async (req, res) => {
    try {
      console.log('File upload received:', req.file);
      
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ 
          success: false,
          error: 'No file uploaded' 
        });
      }

      console.log(`Processing file: ${req.file.originalname}, size: ${req.file.size} bytes`);

      const filePath = req.file.path || path.join(uploadDir, req.file.filename);
      if (!filePath) {
        console.error('No file path available on uploaded file');
        return res.status(500).json({
          success: false,
          error: 'File path missing on server'
        });
      }
      
      // Read the file content from disk
      const fileContent = await readFile(filePath, "utf-8");
      const logText = fileContent.toString();
      
      if (!logText || logText.trim() === '') {
        return res.status(400).json({
          success: false,
          error: "The uploaded file is empty"
        });
      }

      // Process the log with AI
      console.log('Sending to AI service...');
      const aiResult = await analyzeWithAI(logText);
      console.log('AI analysis result:', aiResult);

      if (!aiResult || aiResult.success === false) {
        // Fallback: return a basic analysis instead of a 500 error
        const errorInfo = aiResult?.error;
        return res.json({
          success: true,
          analysis: {
            issueType: 'Analysis service unavailable',
            rootCause: errorInfo?.message || 'The AI analysis service is currently unavailable or returned an invalid response.',
            suggestedFix: [
              'Check the backend logs for AI service errors.',
              'Verify GEMINI_API_KEY and network access to the Gemini API.',
            ],
            severity: 'Medium',
            category: 'configuration',
            confidence: 50,
            relatedLogs: ['AI service error', 'Gemini API', 'GEMINI_API_KEY'],
          },
          metadata: aiResult?.metadata || {},
          filename: req.file.originalname,
          fallback: true
        });
      }

      res.json({ 
        success: true, 
        analysis: aiResult.analysis,
        metadata: aiResult.metadata,
        filename: req.file.originalname
      });

    } catch (err) {
      console.error('Error in /analyze:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
);

export default router;