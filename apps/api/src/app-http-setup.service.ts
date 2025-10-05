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

    // Body size limits
    httpAdapter.use(json({ limit: '1mb' }));
    httpAdapter.use(urlencoded({ extended: true, limit: '1mb' }));

    // CORS
    httpAdapter.enableCors({ origin: process.env.CORS_ORIGIN || '*' });
  }
}
