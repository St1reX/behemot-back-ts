import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logFormat = winston.format.printf(({ timestamp, level, message, ...metadata }) => {
  const serializedMetadata = JSON.stringify(metadata, null, 2);
  const logMessage =
    typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

  if (serializedMetadata !== '{}') {
    return `[${timestamp}] ${level.toUpperCase()}: ${logMessage}\n${serializedMetadata}`;
  }

  return `[${timestamp}] ${level.toUpperCase()}: ${logMessage}`;
});

const errorWinston = winston.createLogger({
  level: 'silly',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    logFormat
  ),
  transports: [
    new DailyRotateFile({
      dirname: path.resolve(__dirname, '../../logs/error'),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '60d',
      level: 'error',
    }),
  ],
});

export { errorWinston };
