import winston from 'winston';
import { env } from '../config/env';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  env.NODE_ENV === 'development' ? winston.format.colorize({ all: true }) : winston.format.uncolorize(),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'info' : 'error',
  levels,
  format,
  transports: [
    new winston.transports.Console(),
    // Add File transports here if needed for local persistence
  ],
});

export default logger;