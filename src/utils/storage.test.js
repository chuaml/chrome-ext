import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from './storage.js';

// Mock chrome API
const chromeMock = {
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
            clear: vi.fn()
        }
    }
};

vi.stubGlobal('chrome', chromeMock);

describe('Storage Utility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getDomainSettings & Migration', () => {
        it('should return empty settings if nothing exists', async () => {
            chromeMock.storage.local.get.mockResolvedValue({});
            const settings = await storage.getDomainSettings('google.com');
            expect(settings.snippets).toEqual([]);
            expect(settings.tags).toEqual([]);
        });

        it('should migrate old css_domain format to snippets', async () => {
            const oldCss = 'body { background: red; }';
            chromeMock.storage.local.get.mockResolvedValue({
                'css_google.com': oldCss
            });

            const settings = await storage.getDomainSettings('google.com');

            expect(settings.snippets.length).toBe(1);
            expect(settings.snippets[0].code).toBe(oldCss);
            expect(settings.snippets[0].name).toBe('Default Snippet');

            // Verify storage update
            expect(chromeMock.storage.local.set).toHaveBeenCalled();
            expect(chromeMock.storage.local.remove).toHaveBeenCalledWith('css_google.com');
        });

        it('should not migrate if snippets already exist', async () => {
            const existingSnippets = [{ id: '1', name: 'Existing', code: '...', enabled: true }];
            chromeMock.storage.local.get.mockResolvedValue({
                'snippets_google.com': existingSnippets,
                'css_google.com': 'old css'
            });

            const settings = await storage.getDomainSettings('google.com');
            expect(settings.snippets).toEqual(existingSnippets);
            expect(chromeMock.storage.local.set).not.toHaveBeenCalled();
        });
    });

    describe('Import / Export', () => {
        it('should export all storage data', async () => {
            const mockData = { key1: 'val1', key2: 'val2' };
            chromeMock.storage.local.get.mockResolvedValue(mockData);

            const exported = await storage.exportConfig();
            expect(exported).toEqual(mockData);
            expect(chromeMock.storage.local.get).toHaveBeenCalledWith(null);
        });

        it('should clear and set new data on import', async () => {
            const newData = { key3: 'val3' };
            await storage.importConfig(newData);

            expect(chromeMock.storage.local.clear).toHaveBeenCalled();
            expect(chromeMock.storage.local.set).toHaveBeenCalledWith(newData);
        });

        it('should throw error on invalid import format', async () => {
            await expect(storage.importConfig(null)).rejects.toThrow('Invalid configuration format');
            await expect(storage.importConfig('not an object')).rejects.toThrow('Invalid configuration format');
        });
    });
});
