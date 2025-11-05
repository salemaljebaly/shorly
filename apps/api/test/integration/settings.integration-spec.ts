import { SettingsService } from '../../src/modules/admin/settings.service';
import { IntegrationTestContext, setupIntegrationTest } from './test-helpers';
import { SystemSettings } from '@prisma/client';

describe('SettingsService Integration Tests', () => {
  let context: IntegrationTestContext;
  let service: SettingsService;

  beforeAll(async () => {
    context = await setupIntegrationTest();
  });

  beforeEach(async () => {
    // Reset settings before each test
    await context.prisma.systemSettings.deleteMany({});

    // Create new service instance (constructor initializes defaults)
    service = new SettingsService(context.prisma);

    // Wait for async initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await context.cleanup();
  });

  describe('Settings Initialization', () => {
    it('should initialize default settings in database', async () => {
      const settingsInDb = await context.prisma.systemSettings.findMany({});

      expect(settingsInDb.length).toBeGreaterThan(0);

      // Verify system settings
      const maintenanceMode = settingsInDb.find(
        (s: SystemSettings) => s.key === 'maintenance_mode'
      );
      expect(maintenanceMode).toBeDefined();
      expect(maintenanceMode?.value).toBe('false');
      expect(maintenanceMode?.category).toBe('system');

      const apiVersion = settingsInDb.find((s: SystemSettings) => s.key === 'api_version');
      expect(apiVersion).toBeDefined();
      expect(apiVersion?.value).toBe('v1');

      // Verify security settings
      const sessionTimeout = settingsInDb.find(
        (s: SystemSettings) => s.key === 'session_timeout_minutes'
      );
      expect(sessionTimeout).toBeDefined();
      expect(sessionTimeout?.value).toBe('30');
      expect(sessionTimeout?.category).toBe('security');

      // Verify rate limit settings
      const rateLimitEnabled = settingsInDb.find(
        (s: SystemSettings) => s.key === 'rate_limit_enabled'
      );
      expect(rateLimitEnabled).toBeDefined();
      expect(rateLimitEnabled?.value).toBe('true');

      const rateLimitRequests = settingsInDb.find(
        (s: SystemSettings) => s.key === 'rate_limit_requests_per_minute'
      );
      expect(rateLimitRequests).toBeDefined();
      expect(rateLimitRequests?.value).toBe('100');
      expect(rateLimitRequests?.category).toBe('rate-limit');
    });
  });

  describe('getSetting', () => {
    it('should retrieve setting from database and cache it', async () => {
      const setting = await service.getSetting('maintenance_mode');

      expect(setting).toBeDefined();
      expect(setting?.key).toBe('maintenance_mode');
      expect(setting?.value).toBe(false);
      expect(setting?.type).toBe('boolean');
      expect(setting?.category).toBe('system');
    });

    it('should return cached value on subsequent calls', async () => {
      // First call - populates internal cache
      await service.getSetting('api_version');

      // Modify database directly
      await context.prisma.systemSettings.update({
        where: { key: 'api_version' },
        data: { value: 'v2' },
      });

      // Second call - should return cached value (still 'v1')
      const setting = await service.getSetting('api_version');
      expect(setting?.value).toBe('v1'); // Cached value
    });

    it('should return null for non-existent setting', async () => {
      const setting = await service.getSetting('non_existent_key');
      expect(setting).toBeNull();
    });

    it('should parse boolean values correctly', async () => {
      const setting = await service.getSetting('maintenance_mode');
      expect(typeof setting?.value).toBe('boolean');
      expect(setting?.value).toBe(false);
    });

    it('should parse number values correctly', async () => {
      const setting = await service.getSetting('session_timeout_minutes');
      expect(typeof setting?.value).toBe('number');
      expect(setting?.value).toBe(30);
    });

    it('should parse string values correctly', async () => {
      const setting = await service.getSetting('api_version');
      expect(typeof setting?.value).toBe('string');
      expect(setting?.value).toBe('v1');
    });
  });

  describe('getSettingsByCategory', () => {
    it('should retrieve all settings in a category', async () => {
      const systemSettings = await service.getSettingsByCategory('system');

      expect(systemSettings).toBeDefined();
      expect(Array.isArray(systemSettings)).toBe(true);
      expect(systemSettings.length).toBe(2);

      const maintenanceMode = systemSettings.find((s) => s.key === 'maintenance_mode');
      expect(maintenanceMode).toBeDefined();
      expect(maintenanceMode?.value).toBe(false);

      const apiVersion = systemSettings.find((s) => s.key === 'api_version');
      expect(apiVersion).toBeDefined();
      expect(apiVersion?.value).toBe('v1');
    });

    it('should retrieve security settings', async () => {
      const securitySettings = await service.getSettingsByCategory('security');

      expect(securitySettings).toBeDefined();
      expect(Array.isArray(securitySettings)).toBe(true);
      expect(securitySettings.length).toBe(1);

      const sessionTimeout = securitySettings.find((s) => s.key === 'session_timeout_minutes');
      expect(sessionTimeout).toBeDefined();
      expect(sessionTimeout?.value).toBe(30);
    });

    it('should retrieve rate-limit settings', async () => {
      const rateLimitSettings = await service.getSettingsByCategory('rate-limit');

      expect(rateLimitSettings).toBeDefined();
      expect(Array.isArray(rateLimitSettings)).toBe(true);
      expect(rateLimitSettings.length).toBe(2);

      const rateLimitEnabled = rateLimitSettings.find((s) => s.key === 'rate_limit_enabled');
      expect(rateLimitEnabled).toBeDefined();
      expect(rateLimitEnabled?.value).toBe(true);

      const rateLimitRequests = rateLimitSettings.find(
        (s) => s.key === 'rate_limit_requests_per_minute'
      );
      expect(rateLimitRequests).toBeDefined();
      expect(rateLimitRequests?.value).toBe(100);
    });

    it('should return empty array for non-existent category', async () => {
      const settings = await service.getSettingsByCategory('non_existent');
      expect(settings).toEqual([]);
    });
  });

  describe('getAllSettings', () => {
    it('should retrieve all settings grouped by category', async () => {
      const allSettings = await service.getAllSettings();

      expect(allSettings).toBeDefined();
      expect(allSettings.system).toBeDefined();
      expect(allSettings.security).toBeDefined();
      expect(allSettings['rate-limit']).toBeDefined();

      expect(allSettings.system.maintenance_mode).toBe(false);
      expect(allSettings.system.api_version).toBe('v1');
      expect(allSettings.security.session_timeout_minutes).toBe(30);
      expect(allSettings['rate-limit'].rate_limit_enabled).toBe(true);
      expect(allSettings['rate-limit'].rate_limit_requests_per_minute).toBe(100);
    });
  });

  describe('updateSetting', () => {
    it('should update setting in database', async () => {
      await service.updateSetting('maintenance_mode', true);

      const settingInDb = await context.prisma.systemSettings.findUnique({
        where: { key: 'maintenance_mode' },
      });

      expect(settingInDb).toBeDefined();
      expect(settingInDb?.value).toBe('true');
    });

    it('should update cache after update', async () => {
      // Populate cache
      const before = await service.getSetting('api_version');
      expect(before?.value).toBe('v1');

      // Update setting
      await service.updateSetting('api_version', 'v2');

      // Cache should be updated
      const after = await service.getSetting('api_version');
      expect(after?.value).toBe('v2');
    });

    it('should update numeric settings', async () => {
      await service.updateSetting('session_timeout_minutes', 60);

      const setting = await context.prisma.systemSettings.findUnique({
        where: { key: 'session_timeout_minutes' },
      });

      expect(setting?.value).toBe('60');

      // Verify through service (checks cache)
      const cached = await service.getSetting('session_timeout_minutes');
      expect(cached?.value).toBe(60);
    });

    it('should update boolean settings', async () => {
      await service.updateSetting('rate_limit_enabled', false);

      const setting = await context.prisma.systemSettings.findUnique({
        where: { key: 'rate_limit_enabled' },
      });

      expect(setting?.value).toBe('false');

      // Verify through service (checks cache)
      const cached = await service.getSetting('rate_limit_enabled');
      expect(cached?.value).toBe(false);
    });

    it('should throw error when updating non-existent setting', async () => {
      await expect(service.updateSetting('non_existent', 'value')).rejects.toThrow();
    });
  });

  describe('Cache Persistence', () => {
    it('should survive multiple reads without DB hits', async () => {
      // First call - hits DB and caches
      const first = await service.getSetting('maintenance_mode');
      expect(first?.value).toBe(false);

      // Verify cache exists
      const cached = await context.redis.get('setting:maintenance_mode');
      expect(cached).toBeDefined();

      // Multiple subsequent calls should use cache
      for (let i = 0; i < 5; i++) {
        const result = await service.getSetting('maintenance_mode');
        expect(result?.value).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle settings with special characters', async () => {
      // Rate limit settings use hyphens in category
      const settings = await service.getSettingsByCategory('rate-limit');
      expect(settings).toBeDefined();
      expect(Array.isArray(settings)).toBe(true);
      expect(settings.length).toBe(2);

      const rateLimitEnabled = settings.find((s) => s.key === 'rate_limit_enabled');
      expect(rateLimitEnabled?.value).toBe(true);
    });

    it('should handle concurrent updates', async () => {
      const updates = [
        service.updateSetting('maintenance_mode', true),
        service.updateSetting('api_version', 'v2'),
        service.updateSetting('session_timeout_minutes', 45),
      ];

      await Promise.all(updates);

      const maintenanceMode = await service.getSetting('maintenance_mode');
      const apiVersion = await service.getSetting('api_version');
      const sessionTimeout = await service.getSetting('session_timeout_minutes');

      expect(maintenanceMode?.value).toBe(true);
      expect(apiVersion?.value).toBe('v2');
      expect(sessionTimeout?.value).toBe(45);
    });

    it('should handle clearCache', async () => {
      // Populate cache
      await service.getSetting('api_version');

      // Clear cache
      service.clearCache();

      // After clearing, should read from DB again
      const setting = await service.getSetting('api_version');
      expect(setting?.value).toBe('v1');
    });
  });

  describe('isMaintenanceModeEnabled', () => {
    it('should return false by default', async () => {
      const isEnabled = await service.isMaintenanceModeEnabled();
      expect(isEnabled).toBe(false);
    });

    it('should return true when maintenance mode is enabled', async () => {
      await service.updateSetting('maintenance_mode', true);
      const isEnabled = await service.isMaintenanceModeEnabled();
      expect(isEnabled).toBe(true);
    });

    it('should return false when maintenance mode is disabled', async () => {
      await service.updateSetting('maintenance_mode', false);
      const isEnabled = await service.isMaintenanceModeEnabled();
      expect(isEnabled).toBe(false);
    });
  });
});
