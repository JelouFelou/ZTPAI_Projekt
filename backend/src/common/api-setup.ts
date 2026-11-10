import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { RequestIdMiddleware } from './request-id.middleware.js';

export function configureApi(app: INestApplication): void {
  const requestIdMiddleware = new RequestIdMiddleware();

  app.setGlobalPrefix('api');
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('BoardRent API')
    .setDescription(
      'REST API wypożyczalni gier planszowych. Endpointy katalogu obsługują kategorie, gry i fizyczne egzemplarze.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addServer('/')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    yamlDocumentUrl: 'api/docs-yaml',
  });
}
