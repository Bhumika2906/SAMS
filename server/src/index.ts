import { API_PREFIX } from '@sams/shared';

export function describeScaffold(): { apiPrefix: typeof API_PREFIX } {
  return { apiPrefix: API_PREFIX };
}

function main(): void {
  const { apiPrefix } = describeScaffold();
  console.info(`SAMS API scaffold (Phase 0). Routes will mount at ${apiPrefix} in Phase 1.`);
}

if (require.main === module) {
  main();
}
