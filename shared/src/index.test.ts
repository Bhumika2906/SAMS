import { API_PREFIX, SAMS_WORKSPACE } from './index';

describe('@sams/shared scaffold', () => {
  it('exports the v1 API prefix', () => {
    expect(API_PREFIX).toBe('/api/v1');
  });

  it('identifies the shared workspace', () => {
    expect(SAMS_WORKSPACE).toBe('shared');
  });
});
