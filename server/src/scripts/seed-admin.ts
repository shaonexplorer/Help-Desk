import 'dotenv/config';
import { auth } from '../auth';
import prisma from '../prisma';

/**
 * Seed the initial admin user. Uses Better Auth's own sign-up handler (a
 * synthetic Request through `auth.handler`) so the password hash and the linked
 * Account row are created exactly as the client sign-in flow expects — no manual
 * hashing. The role is set afterward via a direct Prisma update, since the
 * sign-up endpoint doesn't accept custom fields.
 *
 * Idempotent: re-running updates the existing user instead of duplicating it.
 */

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'password123';
const ADMIN_ROLE = 'ADMIN';

export async function seedAdmin() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: ADMIN_ROLE },
    });
    // eslint-disable-next-line no-console
    console.log(`Admin user already present — updated role to ${ADMIN_ROLE}: ${ADMIN_EMAIL}`);
    return;
  }

  const url = new URL(
    '/api/auth/sign-up/email',
    process.env.BETTER_AUTH_URL ?? 'http://localhost:5000',
  );
  const body = new URLSearchParams({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    name: 'Admin',
  });

  const request = new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  const response = await auth.handler(request);
  const result = (await response.json()) as { user?: { id: string } | null } | null;

  if (!response.ok || !result?.user) {
    throw new Error(`Admin sign-up failed (${response.status}): ${JSON.stringify(result)}`);
  }

  await prisma.user.update({
    where: { id: result.user.id },
    data: { role: ADMIN_ROLE },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded admin user (${ADMIN_ROLE}): ${ADMIN_EMAIL}`);
}

seedAdmin()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
