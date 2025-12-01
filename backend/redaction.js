export function redactSensitive(text) {
  return text
    // IP
    .replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, "[REDACTED_IP]")
    // File paths
    .replace(/([A-Za-z]:)?(\/[A-Za-z0-9._-]+)+/g, "[REDACTED_PATH]")
    // API Keys
    .replace(/(key|token|api)[=: ]+[A-Za-z0-9-_]{10,}/gi, "[REDACTED_KEY]")
    // Emails
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    // Timestamps
    .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, "[REDACTED_TIME]");
}
