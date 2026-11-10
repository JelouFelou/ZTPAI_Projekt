import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { isEmail } from 'class-validator';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const firstName = process.env.ADMIN_FIRST_NAME?.trim();
const lastName = process.env.ADMIN_LAST_NAME?.trim();

if (
  !email ||
  !isEmail(email) ||
  email.length > 320 ||
  !password ||
  password.length < 12 ||
  password.length > 128 ||
  !firstName ||
  firstName.length > 100 ||
  !lastName ||
  lastName.length > 100
) {
  console.error(
    'Set ADMIN_EMAIL, ADMIN_PASSWORD (12–128 characters), ADMIN_FIRST_NAME and ADMIN_LAST_NAME (1–100 characters).',
  );
  process.exitCode = 1;
} else {
  const prisma = new PrismaClient();
  try {
    await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        role: 'ADMIN',
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      },
    });
    console.log(
      'Administrator created. Sign in using the normal login endpoint.',
    );
  } catch (error) {
    console.error(
      error?.code === 'P2002'
        ? 'This email already exists. No account was modified.'
        : 'Could not create the administrator. Check the database connection and migrations.',
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
