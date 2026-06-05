import { describe, it, expect } from 'vitest';
import { formatMoney, toMinor, toMajor, percentOff, platformFeeSen } from './money';

describe('money', () => {
  describe('formatMoney', () => {
    it('formats sen as RM with 2 decimals', () => {
      // Normalize whitespace to be resilient to ICU spacing differences.
      expect(formatMoney(9900).replace(/\s/g, '')).toBe('RM99.00');
      expect(formatMoney(17900).replace(/\s/g, '')).toBe('RM179.00');
    });
    it('hides decimals when asked', () => {
      expect(formatMoney(9900, { showDecimals: false }).replace(/\s/g, '')).toBe('RM99');
    });
    it('handles zero', () => {
      expect(formatMoney(0).replace(/\s/g, '')).toBe('RM0.00');
    });
  });

  describe('toMinor / toMajor', () => {
    it('converts RM → sen and back', () => {
      expect(toMinor(99)).toBe(9900);
      expect(toMinor(17.9)).toBe(1790);
      expect(toMajor(9900)).toBe(99);
    });
    it('rounds to the nearest sen (no float drift)', () => {
      expect(toMinor(0.1 + 0.2)).toBe(30); // 0.30000000000000004 → 30
    });
  });

  describe('percentOff', () => {
    it('computes rounded percentage savings', () => {
      expect(percentOff(12900, 9900)).toBe(23);
      expect(percentOff(10000, 7500)).toBe(25);
    });
    it('returns 0 for non-positive original', () => {
      expect(percentOff(0, 100)).toBe(0);
    });
  });

  describe('platformFeeSen', () => {
    it('computes basis-point commission, rounded', () => {
      expect(platformFeeSen(10000, 200)).toBe(200); // 2% of RM100
      expect(platformFeeSen(9999, 200)).toBe(200); // 199.98 → 200
    });
    it('is zero for non-positive amount or bps', () => {
      expect(platformFeeSen(0, 200)).toBe(0);
      expect(platformFeeSen(10000, 0)).toBe(0);
      expect(platformFeeSen(-5, 200)).toBe(0);
    });
    it('never exceeds the charged amount', () => {
      expect(platformFeeSen(100, 20000)).toBe(100);
    });
  });
});
