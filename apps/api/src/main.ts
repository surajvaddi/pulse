import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { buildCorsOptions } from "./security/cors-config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(buildCorsOptions(process.env));

  const port = Number(process.env.API_PORT ?? 4000);
  const host = process.env.API_HOST ?? "127.0.0.1";
  await app.listen(port, host);
}

void bootstrap();
