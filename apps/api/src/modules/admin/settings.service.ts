import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface SettingValue {
  key: string;
  value: string | boolean | number;
  type: 'boolean' | 'string' | 'number';
  category: 'system' | 'email' | 'security' | 'rate-limit';
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private settingsCache: Map<string, SettingValue> = new Map();

  constructor(private prisma: PrismaClient) {
    this.initializeDefaultSettings();
  }

  /**
   * Initialize default settings in the database
   */
  private async initializeDefaultSettings() {
    const defaults: SettingValue[] = [
      // System settings
      { key: 'maintenance_mode', value: false, type: 'boolean', category: 'system' },
      { key: 'api_version', value: 'v1', type: 'string', category: 'system' },

      // Security settings
      { key: 'session_timeout_minutes', value: 30, type: 'number', category: 'security' },

      // Rate limiting settings
      { key: 'rate_limit_enabled', value: true, type: 'boolean', category: 'rate-limit' },
      { key: 'rate_limit_requests_per_minute', value: 100, type: 'number', category: 'rate-limit' },
    ];

    for (const setting of defaults) {
      try {
        const existing = await this.prisma.systemSettings.findUnique({
          where: { key: setting.key },
        });

        if (!existing) {
          await this.prisma.systemSettings.create({
            data: {
              key: setting.key,
              value: String(setting.value),
              type: setting.type,
              category: setting.category,
            },
          });
        }

        // Cache the setting
        this.settingsCache.set(setting.key, setting);
      } catch (error) {
        this.logger.error(`Failed to initialize setting ${setting.key}:`, error);
      }
    }

    this.logger.log('Default settings initialized');
  }

  /**
   * Get a single setting by key
   */
  async getSetting(key: string): Promise<SettingValue | null> {
    // Check cache first
    if (this.settingsCache.has(key)) {
      return this.settingsCache.get(key)!;
    }

    try {
      const setting = await this.prisma.systemSettings.findUnique({
        where: { key },
      });

      if (!setting) {
        return null;
      }

      const value = this.parseSettingValue(setting.value, setting.type as any);
      const settingValue: SettingValue = {
        key: setting.key,
        value,
        type: setting.type as any,
        category: setting.category as any,
      };

      // Cache it
      this.settingsCache.set(key, settingValue);

      return settingValue;
    } catch (error) {
      this.logger.error(`Failed to get setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Get all settings by category
   */
  async getSettingsByCategory(category: string) {
    try {
      const settings = await this.prisma.systemSettings.findMany({
        where: { category },
      });

      return settings.map((setting) => ({
        key: setting.key,
        value: this.parseSettingValue(setting.value, setting.type as any),
        type: setting.type,
        category: setting.category,
      }));
    } catch (error) {
      this.logger.error(`Failed to get settings for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    try {
      const settings = await this.prisma.systemSettings.findMany({
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      });

      const grouped: Record<string, any> = {
        system: {},
        email: {},
        security: {},
        'rate-limit': {},
      };

      settings.forEach((setting) => {
        const value = this.parseSettingValue(setting.value, setting.type as any);
        grouped[setting.category][setting.key] = value;
      });

      return grouped;
    } catch (error) {
      this.logger.error('Failed to get all settings:', error);
      return {};
    }
  }

  /**
   * Update a single setting
   */
  async updateSetting(key: string, value: any): Promise<void> {
    try {
      const existing = await this.prisma.systemSettings.findUnique({
        where: { key },
      });

      if (!existing) {
        throw new Error(`Setting ${key} not found`);
      }

      const stringValue = String(value);

      await this.prisma.systemSettings.update({
        where: { key },
        data: { value: stringValue },
      });

      // Update cache
      this.settingsCache.set(key, {
        key,
        value: this.parseSettingValue(stringValue, existing.type as any),
        type: existing.type as any,
        category: existing.category as any,
      });

      this.logger.log(`Setting ${key} updated to ${stringValue}`);
    } catch (error) {
      this.logger.error(`Failed to update setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(settings: Record<string, any>): Promise<void> {
    try {
      for (const [key, value] of Object.entries(settings)) {
        await this.updateSetting(key, value);
      }
    } catch (error) {
      this.logger.error('Failed to update settings:', error);
      throw error;
    }
  }

  /**
   * Check if maintenance mode is enabled
   */
  async isMaintenanceModeEnabled(): Promise<boolean> {
    const setting = await this.getSetting('maintenance_mode');
    return setting?.value === true;
  }

  /**
   * Parse setting value based on its type
   */
  private parseSettingValue(
    value: string,
    type: 'boolean' | 'string' | 'number'
  ): string | boolean | number {
    switch (type) {
      case 'boolean':
        return value === 'true' || value === '1';
      case 'number':
        return parseFloat(value);
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Clear the settings cache
   */
  clearCache(): void {
    this.settingsCache.clear();
    this.logger.log('Settings cache cleared');
  }
}
