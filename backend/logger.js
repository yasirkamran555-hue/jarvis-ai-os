import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

if (!fs.existsSync(LOG_DIR)) {\n  fs.mkdirSync(LOG_DIR, { recursive: true });\n}\n\nconst logStream = fs.createWriteStream(\n  path.join(LOG_DIR, `app-${new Date().toISOString().slice(0, 10)}.log`),\n  { flags: 'a' }\n);\n\nfunction formatLog(level, message, meta = {}) {\n  return JSON.stringify({\n    timestamp: new Date().toISOString(),\n    level,\n    message,\n    ...meta\n  });\n}\n\nexport const logger = {\n  error: (message, meta) => {\n    const log = formatLog('ERROR', message, meta);\n    console.error(`[ERROR] ${message}`, meta);\n    logStream.write(log + '\\n');\n  },\n  warn: (message, meta) => {\n    if (LEVELS[LOG_LEVEL] >= LEVELS.warn) {\n      const log = formatLog('WARN', message, meta);\n      console.warn(`[WARN] ${message}`, meta);\n      logStream.write(log + '\\n');\n    }\n  },\n  info: (message, meta) => {\n    if (LEVELS[LOG_LEVEL] >= LEVELS.info) {\n      const log = formatLog('INFO', message, meta);\n      console.log(`[INFO] ${message}`);\n      logStream.write(log + '\\n');\n    }\n  },\n  debug: (message, meta) => {\n    if (LEVELS[LOG_LEVEL] >= LEVELS.debug) {\n      const log = formatLog('DEBUG', message, meta);\n      console.log(`[DEBUG] ${message}`, meta);\n      logStream.write(log + '\\n');\n    }\n  }\n};\n\nexport function closeLogger() {\n  logStream.end();\n}\n