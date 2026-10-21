import { API_PREFIX, UserRole } from './index';

describe('@sams/shared', () => {
  it('exports the v1 API prefix', () => {
    expect(API_PREFIX).toBe('/api/v1');
  });

  it('defines the four user roles', () => {
    expect(UserRole.Applicant).toBe('Applicant');
    expect(UserRole.AdministratorUser).toBe('AdministratorUser');
    expect(UserRole.FacultyVerifier).toBe('FacultyVerifier');
    expect(UserRole.Management).toBe('Management');
  });
});
