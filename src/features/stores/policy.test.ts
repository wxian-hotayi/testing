import { describe, it, expect } from 'vitest';
import {
  slugify,
  validateSlug,
  isValidStoreName,
  isValidHexColor,
  RESERVED_SLUGS,
} from './policy';

describe('slugify', () => {
  it('normalises arbitrary text into a slug', () => {
    expect(slugify('  Acme Supplements!! ')).toBe('acme-supplements');
    expect(slugify('Café—Béta 2')).toBe('caf-b-ta-2');
    expect(slugify('--Hello--')).toBe('hello');
  });
});

describe('validateSlug', () => {
  it('accepts a valid slug', () => {
    expect(validateSlug('acme')).toBeNull();
    expect(validateSlug('acme-supps-2')).toBeNull();
  });
  it('rejects too short / too long', () => {
    expect(validateSlug('ab')).toBe('too_short');
    expect(validateSlug('a'.repeat(64))).toBe('too_long');
  });
  it('rejects bad characters and edge hyphens', () => {
    expect(validateSlug('Acme')).toBe('invalid_chars'); // uppercase
    expect(validateSlug('-acme')).toBe('invalid_chars');
    expect(validateSlug('acme-')).toBe('invalid_chars');
    expect(validateSlug('a c')).toBe('invalid_chars');
  });
  it('rejects reserved slugs', () => {
    for (const r of ['www', 'admin', 'api', 'default', 'app']) {
      expect(validateSlug(r)).toBe('reserved');
    }
    expect(RESERVED_SLUGS.has('checkout')).toBe(true);
  });
});

describe('store name + colour validation', () => {
  it('validates names by length', () => {
    expect(isValidStoreName('A')).toBe(false);
    expect(isValidStoreName('Acme')).toBe(true);
    expect(isValidStoreName('x'.repeat(81))).toBe(false);
  });
  it('validates hex colours', () => {
    expect(isValidHexColor('#16a34a')).toBe(true);
    expect(isValidHexColor('#abc')).toBe(true);
    expect(isValidHexColor('green')).toBe(false);
    expect(isValidHexColor('#12345')).toBe(false);
  });
});
