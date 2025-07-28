import { describe, it, expect, vi } from 'vitest';

describe('Simple test', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test crypto mocking', () => {
    expect(global.crypto).toBeDefined();
    expect(global.crypto.subtle).toBeDefined();
  });
});

describe('Encryption module import', () => {
  it('should import EncryptionManager', async () => {
    try {
      const module = await import('../encryption');
      expect(module).toBeDefined();
      expect(module.EncryptionManager).toBeDefined();
    } catch (error) {
      console.log('Import error:', error);
      throw error;
    }
  });
});