import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma';

// Fail fast at startup rather than run with a weak / missing secret that
// an attacker could forge session cookies for. Generate with:
//   openssl rand -base64 32
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    'BETTER_AUTH_SECRET is missing or too short (min 32 chars). ' +
      'Generate one with: openssl rand -base64 32',
  );
}

export const auth = betterAuth({
  // Database adapter using Prisma client
  database: prismaAdapter(prisma, {
    provider: 'postgresql', // or "mysql", "postgresql", ...etc
  }),

  trustedOrigins: ['http://localhost:3000', 'http://localhost:3002'],

  // Validated above — never pass an unset / short value through.
  secret,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5000',

  // Enable email & password authentication (minimal UI needed)
  emailAndPassword: { enabled: true },

  // Store sessions in the database (creates a Session table)
  session: {
    storeSessionInDatabase: true,
    // Optional: customize session expiration (default 7 days)
    expiresIn: 7 * 24 * 60 * 60, // seconds
  },

  // You can add more plugins later (e.g., twoFactor, social providers)
});
