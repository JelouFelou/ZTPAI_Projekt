import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import * as argon2 from 'argon2';
import { PrismaService } from '../src/prisma/prisma.service.js';

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'Set TEST_DATABASE_URL to a separate migrated PostgreSQL test database',
  );
const prisma = new PrismaService({ datasourceUrl: url });
const execute = promisify(execFile);
afterAll(() => prisma.$disconnect());

it.each([12, 128])(
  'admin script creates a %i-character Argon2id password without overwriting accounts',
  async (length) => {
    const email = `admin-password-${randomUUID()}@example.invalid`;
    const password = 'a'.repeat(length);
    const options = {
      env: {
        ...process.env,
        DATABASE_URL: url,
        ADMIN_EMAIL: email,
        ADMIN_PASSWORD: password,
        ADMIN_FIRST_NAME: 'Test',
        ADMIN_LAST_NAME: 'Admin',
      },
    };
    try {
      await execute(
        process.execPath,
        [resolve('scripts/create-admin.mjs')],
        options,
      );
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(user.role).toBe('ADMIN');
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      await expect(argon2.verify(user.passwordHash, password)).resolves.toBe(
        true,
      );
      await expect(
        execute(process.execPath, [resolve('scripts/create-admin.mjs')], {
          env: { ...options.env, ADMIN_PASSWORD: 'different-valid-password' },
        }),
      ).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('No account was modified'),
      });
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { email } }))
          .passwordHash,
      ).toBe(user.passwordHash);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  },
);
