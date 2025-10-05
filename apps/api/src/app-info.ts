export const API_NAME = 'shorly API';
export const API_DESCRIPTION = 'Global, multilingual link and OneLink management platform';
export const API_VERSION = process.env.npm_package_version || '1.0.0';

export function getApiInfo() {
  return {
    name: API_NAME,
    version: API_VERSION,
    description: API_DESCRIPTION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

export function getHealthInfo() {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

export function getOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: API_NAME,
      description: API_DESCRIPTION,
      version: API_VERSION,
    },
    paths: {},
  };
}
