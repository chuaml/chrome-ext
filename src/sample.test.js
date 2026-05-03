import { describe, it, expect } from 'vitest';

describe('Sample Test', () => {
    it('should pass', () => {
        expect(1 + 1).toBe(2);
    });

    it('should have access to JSDOM', () => {
        const element = document.createElement('div');
        element.id = 'test-id';
        expect(element.id).toBe('test-id');
    });
});
