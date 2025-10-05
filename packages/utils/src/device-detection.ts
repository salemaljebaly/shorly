import UAParser from 'ua-parser-js';
import { DeviceType } from '@shorly/types';

/**
 * Detect device type from user agent
 */
export function detectDeviceType(userAgent: string): DeviceType {
  const parser = new UAParser(userAgent);
  const os = parser.getOS();

  if (os.name?.toLowerCase().includes('android')) {
    return DeviceType.ANDROID;
  }

  if (os.name?.toLowerCase().includes('ios') || os.name?.toLowerCase().includes('mac os')) {
    const device = parser.getDevice();
    // Check if it's an iPhone or iPad
    if (device.type === 'mobile' || device.type === 'tablet') {
      return DeviceType.IOS;
    }
  }

  return DeviceType.WEB;
}

/**
 * Parse user agent for analytics
 */
export interface ParsedUserAgent {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  deviceType: DeviceType;
}

export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  return {
    browser: browser.name || 'Unknown',
    browserVersion: browser.version || 'Unknown',
    os: os.name || 'Unknown',
    osVersion: os.version || 'Unknown',
    device: device.model || device.type || 'Unknown',
    deviceType: detectDeviceType(userAgent),
  };
}

/**
 * Check if user agent is a bot
 */
export function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
  ];

  return botPatterns.some((pattern) => pattern.test(userAgent));
}
