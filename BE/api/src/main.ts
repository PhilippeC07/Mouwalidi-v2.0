import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Mouwalidi API')
    .setDescription('API documentation for Mouwalidi backend')
    .setVersion('1.0')
    .addBearerAuth() // keep this if you plan to use JWT later
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(3000);
}

void bootstrap();
