import { describeScaffold } from './index';

describe('@sams/server scaffold', () => {
  it('uses the shared API prefix', () => {
    expect(describeScaffold().apiPrefix).toBe('/api/v1');
  });
});
