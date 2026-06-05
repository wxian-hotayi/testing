import { describe, it, expect } from 'vitest';
import { resolveTenantFromHost, rootDomainFromSiteUrl } from './resolve';

const ROOT = 'myapp.com';

describe('resolveTenantFromHost', () => {
  it('treats the root + www as the default (platform) site', () => {
    expect(resolveTenantFromHost('myapp.com', ROOT)).toEqual({ kind: 'default' });
    expect(resolveTenantFromHost('www.myapp.com', ROOT)).toEqual({ kind: 'default' });
  });

  it('extracts the store slug from a subdomain', () => {
    expect(resolveTenantFromHost('acme.myapp.com', ROOT)).toEqual({
      kind: 'subdomain',
      slug: 'acme',
    });
    expect(resolveTenantFromHost('ACME.myapp.com:443', ROOT)).toEqual({
      kind: 'subdomain',
      slug: 'acme',
    });
  });

  it('treats a non-root host as a custom domain', () => {
    expect(resolveTenantFromHost('shop.acme.com', ROOT)).toEqual({
      kind: 'custom',
      host: 'shop.acme.com',
    });
  });

  it('handles localhost dev (default + subdomain)', () => {
    expect(resolveTenantFromHost('localhost:3000', 'localhost')).toEqual({ kind: 'default' });
    expect(resolveTenantFromHost('acme.localhost:3000', 'localhost')).toEqual({
      kind: 'subdomain',
      slug: 'acme',
    });
  });

  it('falls back to default for empty host', () => {
    expect(resolveTenantFromHost(null, ROOT)).toEqual({ kind: 'default' });
  });
});

describe('rootDomainFromSiteUrl', () => {
  it('extracts hostname', () => {
    expect(rootDomainFromSiteUrl('https://myapp.com')).toBe('myapp.com');
    expect(rootDomainFromSiteUrl('http://localhost:3000')).toBe('localhost');
  });
});
