import logger from './logger.js';
import { createApp } from './app.js';
import { config } from './config/index.js';

const app = createApp();

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Backend server is running');
});
