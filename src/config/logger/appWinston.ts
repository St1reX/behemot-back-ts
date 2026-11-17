import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
});

const appWinston = winston.createLogger({
  level: 'silly',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      dirname: path.resolve(__dirname, '../../logs/general'),
      filename: '%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '90d',
      zippedArchive: true,
    }),
  ],
});

export { appWinston };
