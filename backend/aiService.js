export async function analyzeWithAI(logText) {
  try {
    const text = (logText || '').toString();
    const lower = text.toLowerCase();

    let issueType = 'No critical issues detected';
    let rootCause =
      'No obvious error signatures were found in the provided logs. The service appears healthy based on the available information.';
    let suggestedFix = [
      'Continue monitoring logs for new errors or spikes in latency.',
      'Set up alerts on error rate, latency and resource usage if not already in place.',
    ];
    let severity = 'Low';
    let category = 'informational';
    let confidence = 50;
    let relatedLogs = [];

    const patterns = [
      {
        name: 'http_5xx',
        match: /\s(5\d{2})\s|500 Internal Server Error|HTTP 500/i,
        update: () => {
          issueType = 'HTTP 5xx server error';
          rootCause =
            'The logs show HTTP 5xx responses being returned to clients, indicating a server-side failure in handling requests.';
          suggestedFix = [
            'Inspect stack traces around the time of the 5xx responses to identify failing code paths.',
            'Check upstream dependencies (databases, external APIs) for errors or timeouts that could cause the server to fail.',
            'Add more structured logging (request id, user id, endpoint) around failing endpoints to narrow down the problem.',
          ];
          severity = 'High';
          category = 'runtime';
          confidence = 80;
          relatedLogs = ['HTTP 500', 'HTTP 502', 'HTTP 503', 'Unhandled exception'];
        },
      },
      {
        name: 'timeout',
        match: /timeout|timed out|ESOCKETTIMEDOUT|ETIMEDOUT/i,
        update: () => {
          issueType = 'Request or dependency timeout';
          rootCause =
            'The logs contain timeout errors, suggesting that a downstream dependency or network call is not responding within the expected time.';
          suggestedFix = [
            'Identify which external service or database call is timing out and measure its typical response time.',
            'Increase the timeout threshold only if the dependency is known to be slow and cannot be optimized.',
            'Add retries with backoff and better error handling around slow network calls.',
          ];
          severity = 'High';
          category = 'infrastructure';
          confidence = 75;
          relatedLogs = ['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'request timeout'];
        },
      },
      {
        name: 'db_connection',
        match:
          /ECONNREFUSED.*(postgres|mysql|mongo|database)|database connection failed|could not connect to server/i,
        update: () => {
          issueType = 'Database connection failure';
          rootCause =
            'The application is unable to establish or maintain a connection to the database. This can be due to configuration errors, network issues, or the database server being down.';
          suggestedFix = [
            'Verify database host, port, username, password and database name in the application configuration or environment variables.',
            'Check if the database server is running and reachable from the application host (e.g., using ping or telnet).',
            'Confirm that firewall rules and security groups allow traffic between the application and the database.',
          ];
          severity = 'Critical';
          category = 'database';
          confidence = 85;
          relatedLogs = ['ECONNREFUSED', 'connection refused', 'could not connect to server'];
        },
      },
      {
        name: 'db_query',
        match:
          /(SQLSTATE|syntax error at or near|duplicate key value violates unique constraint|deadlock detected)/i,
        update: () => {
          issueType = 'Database query error';
          rootCause =
            'The database is rejecting one or more queries, indicating problems such as invalid SQL syntax, constraint violations, or deadlocks.';
          suggestedFix = [
            'Inspect the failing SQL statement and verify table/column names, parameter types, and join conditions.',
            'Handle unique constraint violations by checking for existing records before inserts or using upserts where appropriate.',
            'If deadlocks occur, review transaction scope and lock usage to reduce contention.',
          ];
          severity = 'High';
          category = 'database';
          confidence = 80;
          relatedLogs = ['SQLSTATE', 'syntax error', 'duplicate key', 'deadlock detected'];
        },
      },
      {
        name: 'auth',
        match: /unauthorized|forbidden|401|403|invalid token|jwt/i,
        update: () => {
          issueType = 'Authentication or authorization failure';
          rootCause =
            'The logs show repeated authentication or authorization errors, suggesting invalid credentials, expired tokens, or misconfigured access control.';
          suggestedFix = [
            'Verify token issuance (expiration time, audience, issuer) and ensure the API is validating them correctly.',
            'Check role/permission mappings to make sure users have the required access for the actions they are performing.',
            'Add clearer error messages and correlation ids for failed auth requests to aid debugging.',
          ];
          severity = 'Medium';
          category = 'security';
          confidence = 70;
          relatedLogs = ['401 Unauthorized', '403 Forbidden', 'invalid token'];
        },
      },
      {
        name: 'oom',
        match: /out of memory|heap limit|JavaScript heap out of memory|ENOMEM/i,
        update: () => {
          issueType = 'Out-of-memory condition';
          rootCause =
            'The process is running out of memory, which typically indicates a memory leak or workloads that exceed the available resources.';
          suggestedFix = [
            'Capture heap snapshots and analyze object retention to identify memory leaks.',
            'Review caching and in-memory data structures for unbounded growth.',
            'Increase memory limits for the service only after confirming that memory usage patterns are expected.',
          ];
          severity = 'Critical';
          category = 'performance';
          confidence = 85;
          relatedLogs = ['heap out of memory', 'ENOMEM', 'Out of memory'];
        },
      },
      {
        name: 'generic_error',
        match: /exception|stack trace|unhandled rejection|fatal error|TypeError|ReferenceError/i,
        update: () => {
          issueType = 'Application runtime error';
          rootCause =
            'The logs show runtime exceptions being thrown by the application, which likely stem from unhandled edge cases, null values, or incorrect assumptions in the code.';
          suggestedFix = [
            'Review the stack trace to locate the exact function and line where the exception originates.',
            'Add input validation and null checks around the failing code path.',
            'Introduce structured error handling (try/catch, centralized error middleware) to catch and log exceptions consistently.',
          ];
          severity = 'High';
          category = 'runtime';
          confidence = 75;
          relatedLogs = ['Unhandled exception', 'TypeError', 'ReferenceError', 'stack trace'];
        },
      },
      {
        name: 'warning_only',
        match: /warn|deprecated|slow query|high latency/i,
        update: () => {
          issueType = 'Performance or warning signals detected';
          rootCause =
            'The logs primarily contain warnings or performance-related messages (such as slow queries or elevated latency) rather than hard failures.';
          suggestedFix = [
            'Identify the endpoints or queries that show the highest latency and profile them.',
            'Optimize slow database queries using indexes, query rewrites, or caching.',
            'Set SLOs (service level objectives) and alerting thresholds for latency and error rate.',
          ];
          severity = 'Medium';
          category = 'performance';
          confidence = 65;
          relatedLogs = ['WARN', 'slow query', 'high latency'];
        },
      },
    ];

    const matched = patterns.find((p) => p.match.test(text));
    if (matched) {
      matched.update();
    } else if (/error|fail(ed)?/i.test(text)) {
      issueType = 'Generic error detected';
      rootCause =
        'The logs contain error keywords but do not match a more specific pattern. There is likely a failure that requires manual inspection of the stack trace and recent changes.';
      suggestedFix = [
        'Inspect error messages and stack traces around the time of failure.',
        'Correlate the error with recent code or configuration changes.',
        'Add structured logging (request id, user id, feature flags) to improve observability.',
      ];
      severity = 'Medium';
      category = 'runtime';
      confidence = 60;
      relatedLogs = ['error', 'failed', 'stack trace'];
    }

    const analysis = {
      issueType,
      rootCause,
      suggestedFix,
      severity,
      category,
      confidence,
      relatedLogs,
    };

    return {
      success: true,
      analysis,
      metadata: {
        model: 'pattern-based-log-analyzer',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}
