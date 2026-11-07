import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApi } from './common/api-setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApi(app);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
