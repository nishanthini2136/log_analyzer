import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  MAX_LOG_SIZE: 5 * 1024 * 1024, // 5MB
  CACHE_DIR: path.join(process.cwd(), '.cache'),
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  SUPPORTED_FILE_TYPES: ['.log', '.txt', '.json'],
  REDACT_PATTERNS: {
    IP: /(\d{1,3}\.){3}\d{1,3}/g,
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    API_KEY: /(?:key|api[_-]?key|token|secret)[=:]["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
    URL: /(https?:\/\/[^\s]+)/g,
    FILE_PATH: /(\/[\w\-\.]+)+/g,
    TIMESTAMP: /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g,
    CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/g,
    SSN: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g
  }
};

// Validate API key
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY is not set in .env file');
  process.exit(1);
}

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Redacts sensitive information from log content
 * @param {string} content - The log content to redact
 * @returns {string} Redacted log content
 */
function redactSensitiveInfo(content) {
  let redacted = content;
  Object.values(CONFIG.REDACT_PATTERNS).forEach(pattern => {
    redacted = redacted.replace(pattern, '[REDACTED]');
  });
  return redacted;
}

/**
 * Generates a SHA-256 hash of the content for deduplication
 * @param {string} content - The content to hash
 * @returns {string} Hex-encoded SHA-256 hash
 */
function generateContentHash(content) {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}

/**
 * Gets the cache file path for a given hash
 * @param {string} hash - The content hash
 * @returns {string} Cache file path
 */
function getCachePath(hash) {
  return path.join(CONFIG.CACHE_DIR, `${hash}.json`);
}

/**
 * Checks if a cache entry exists and is still valid
 * @param {string} hash - The content hash
 * @returns {Promise<object|null>} Cached result or null if not found/expired
 */
async function getCachedResult(hash) {
  try {
    const cachePath = getCachePath(hash);
    const stats = await fs.stat(cachePath);
    
    // Check if cache is expired
    if (Date.now() - stats.mtimeMs > CONFIG.CACHE_TTL) {
      return null; // Cache expired
    }
    
    const data = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null; // Cache miss
  }
}

/**
 * Saves the analysis result to cache
 * @param {string} hash - The content hash
 * @param {object} result - The analysis result to cache
 */
async function saveToCache(hash, result) {
  try {
    // Ensure cache directory exists
    await fs.mkdir(CONFIG.CACHE_DIR, { recursive: true });
    
    const cachePath = getCachePath(hash);
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        ...result,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CONFIG.CACHE_TTL).toISOString()
      }),
      'utf-8'
    );
  } catch (error) {
    console.error('❌ Failed to save to cache:', error);
    // Don't fail the request if cache save fails
  }
}

/**
 * Analyzes log content using AI
 * @param {string} log - The log content to analyze
 * @param {object} options - Additional options
 * @param {boolean} options.force - Force analysis even if cached
 * @returns {Promise<object>} Analysis result
 */
export async function analyzeWithAI(log, { force = false } = {}) {
  const startTime = Date.now();
  
  try {
    // Validate input
    if (!log || typeof log !== 'string' || log.trim() === '') {
      throw new Error('Log content is empty or invalid');
    }

    // Check log size
    if (Buffer.byteLength(log, 'utf8') > CONFIG.MAX_LOG_SIZE) {
      throw new Error(`Log exceeds maximum size of ${CONFIG.MAX_LOG_SIZE / (1024 * 1024)}MB`);
    }

    // Redact sensitive information
    const redactedLog = redactSensitiveInfo(log);
    const logHash = generateContentHash(redactedLog);
    
    // Check cache first if not forced
    if (!force) {
      const cached = await getCachedResult(logHash);
      if (cached) {
        console.log(`ℹ️ Using cached result for log hash: ${logHash}`);
        return { ...cached, cached: true };
      }
    }

    console.log(`🔍 Analyzing log (${log.length} chars, hash: ${logHash})...`);
    
    // Initialize the AI model (use a supported Gemini model)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        topP: 0.1,
        maxOutputTokens: 2048
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    });

    // Construct the analysis prompt
    const prompt = `You are an expert log analyzer. Analyze the following log and provide a JSON response with:
    
    {
      "issueType": "The type of issue (e.g., 'Database Connection Error', 'High CPU Usage')",
      "rootCause": "Detailed explanation of the root cause",
      "suggestedFix": ["Step 1: Action to fix the issue", "Step 2: Next step"],
      "severity": "Low | Medium | High | Critical",
      "category": "One of: 'network', 'database', 'application', 'security', 'performance', 'authentication', 'authorization', 'configuration', 'resource', 'unknown'",
      "confidence": "Your confidence in this analysis (0-100)",
      "relatedLogs": ["patterns or keywords that would help identify similar issues"]
    }

    Log to analyze (redacted for sensitive information):
    ${redactedLog}
    
    Respond with valid JSON only, no additional text.`;

    // Call the AI API
    console.log('🤖 Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    if (!response || !response.text) {
      throw new Error('No valid response from AI service');
    }

    const text = response.text();
    console.log('📥 Raw AI response received');

    // Parse and validate the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      const requiredFields = [
        'issueType', 'rootCause', 'suggestedFix', 
        'severity', 'category', 'confidence'
      ];
      const missingFields = requiredFields.filter(field => !(field in parsed));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields in AI response: ${missingFields.join(', ')}`);
      }

      // Prepare the result
      const analysisResult = {
        success: true,
        analysis: {
          ...parsed,
          logHash,
          analyzedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime
        },
        metadata: {
          logSize: log.length,
          redactedLogSize: redactedLog.length,
          cacheHit: false
        }
      };

      // Cache the result for future use
      await saveToCache(logHash, analysisResult);
      
      console.log(`✅ Analysis completed in ${analysisResult.analysis.processingTimeMs}ms`);
      return analysisResult;

    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

  } catch (error) {
    const errorInfo = {
      message: error.message,
      code: error.code || 'AI_SERVICE_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      processingTimeMs: Date.now() - startTime
    };

    console.error('❌ AI Service Error:', errorInfo);
    
    return {
      success: false,
      error: errorInfo,
      metadata: {
        processingTimeMs: errorInfo.processingTimeMs
      }
    };
  }
}