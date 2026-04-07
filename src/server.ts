import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRoutes from './routes';
import logger from './utils/logger';
import prisma from './database/prisma';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));

app.use((req: any, res: any, next: any) => {
  const corsFn = require('cors');
  corsFn({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })(req, res, next);
});

app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试',
    },
    timestamp: Math.floor(Date.now() / 1000),
  },
});

app.use('/api/', limiter);

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'healthy', timestamp: Math.floor(Date.now() / 1000) },
  });
});

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('数据库连接成功');

    app.listen(config.port, () => {
      logger.info(`服务器运行在端口 ${config.port}`);
      logger.info(`环境：${config.nodeEnv}`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;
