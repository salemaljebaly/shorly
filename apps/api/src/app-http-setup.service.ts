import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { json, urlencoded, Request, Response, NextFunction } from 'express';

@Injectable()
export class AppHttpSetupService implements OnApplicationBootstrap {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  onApplicationBootstrap() {
    const httpAdapter = this.adapterHost.httpAdapter;
    if (!httpAdapter) {
      return;
    }

    if (httpAdapter.getType() !== 'express') {
      return;
    }

    // Security headers
    httpAdapter.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    });

    const rawBodySaver = (req: Request & { rawBody?: Buffer }, _res: Response, buffer: Buffer) => {
      if (buffer?.length) {
        req.rawBody = Buffer.from(buffer);
      }
    };

    // Body size limits with raw body preservation (required for Stripe webhooks)
    httpAdapter.use(json({ limit: '1mb', verify: rawBodySaver }));
    httpAdapter.use(urlencoded({ extended: true, limit: '1mb', verify: rawBodySaver }));

    // CORS
    httpAdapter.enableCors({ origin: process.env.CORS_ORIGIN || '*' });
  }
}
