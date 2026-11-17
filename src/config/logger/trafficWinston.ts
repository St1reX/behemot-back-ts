import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  if (typeof message === 'object') {
    return `[${timestamp}] ${level.toUpperCase()}:\n${JSON.stringify(
      message,
      null,
      2
    )}`;
  }
  return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
});

const trafficWinston = winston.createLogger({
  level: 'silly',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    logFormat
  ),
  transports: [
    new DailyRotateFile({
      dirname: path.resolve(__dirname, '../../logs/traffic'),
      filename: '%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '60d',
      zippedArchive: true,
    }),
  ],
});

export { trafficWinston };
