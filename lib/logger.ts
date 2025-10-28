import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), '../../logs/services');
const logFile = path.join(logDir, 'learning-paths-service.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [INFO] ${message} ${meta ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(logEntry.trim());
  },
  error: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [ERROR] ${message} ${meta ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(logFile, logEntry);
    console.error(logEntry.trim());
  },
  debug: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [DEBUG] ${message} ${meta ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(logEntry.trim());
  }
};