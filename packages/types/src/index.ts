// Shared TypeScript types for shorly

// ============= Link Types =============
export interface Link {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title?: string;
  description?: string;
  tags?: string[];
  isActive: boolean;
  expiresAt?: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLinkDto {
  shortCode?: string;
  destinationUrl: string;
  title?: string;
  description?: string;
  tags?: string[];
  isActive?: boolean;
  expiresAt?: Date;
}

export interface UpdateLinkDto {
  destinationUrl?: string;
  title?: string;
  description?: string;
  tags?: string[];
  isActive?: boolean;
  expiresAt?: Date;
}

// ============= OneLink Types =============
export enum DeviceType {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

export interface OneLinkTarget {
  deviceType: DeviceType;
  url: string;
  priority?: number;
}

export interface OneLink {
  id: string;
  shortCode: string;
  title?: string;
  description?: string;
  targets: OneLinkTarget[];
  fallbackUrl: string;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOneLinkDto {
  shortCode?: string;
  title?: string;
  description?: string;
  targets: OneLinkTarget[];
  fallbackUrl: string;
}

export interface UpdateOneLinkDto {
  title?: string;
  description?: string;
  targets?: OneLinkTarget[];
  fallbackUrl?: string;
  isActive?: boolean;
}

// ============= Analytics Types =============
export interface ClickEvent {
  id: string;
  linkId: string;
  oneLinkId?: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
}

export interface AnalyticsSummary {
  totalClicks: number;
  uniqueClicks: number;
  clicksByCountry: Record<string, number>;
  clicksByDevice: Record<string, number>;
  clicksByBrowser: Record<string, number>;
  clicksByReferer: Record<string, number>;
  clicksByDate: Record<string, number>;
}

export interface AnalyticsData {
  totalClicks: number;
  uniqueClicks: number;
  clicksByDate: Record<string, number>;
  byCountry: Record<string, number>;
  byDevice: Record<string, number>;
  byBrowser: Record<string, number>;
  byReferer: Record<string, number>;
}

export interface AnalyticsQuery {
  linkId?: string;
  oneLinkId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============= User Types =============
export interface User {
  id: string;
  email: string;
  name?: string;
  apiKey?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  password?: string;
}

// ============= QR Code Types =============
export interface QRCodeOptions {
  size?: number;
  margin?: number;
  format?: 'png' | 'svg';
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

// ============= API Response Types =============
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

// ============= Language Types =============
export enum Language {
  EN = 'en',
  AR = 'ar',
}

export interface LocalizedContent {
  [Language.EN]?: string;
  [Language.AR]?: string;
}
