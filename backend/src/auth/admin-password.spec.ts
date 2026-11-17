import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execute = promisify(execFile);

it.each([11, 129])(
  'admin script rejects a %i-character password before database access',
  async (length) => {
    await expect(
      execute(process.execPath, [resolve('scripts/create-admin.mjs')], {
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
          ADMIN_EMAIL: 'validation@example.invalid',
          ADMIN_PASSWORD: 'a'.repeat(length),
          ADMIN_FIRST_NAME: 'Test',
          ADMIN_LAST_NAME: 'Admin',
        },
      }),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('12–128 characters'),
    });
  },
);
