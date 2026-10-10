import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

export default {
  tests: 'tests/**/*.e2e.ts',
  targets: [
    {
      engine: web(),
      app: {
        url: 'http://127.0.0.1:5173',
        command: {
          executable: process.platform === 'win32' ? 'npm.cmd' : 'npm',
          args: ['run', 'dev'],
          log: '.e2e/logs/app.log',
          reuseExisting: true,
        },
      },
    },
  ],
} satisfies E2EConfig;
