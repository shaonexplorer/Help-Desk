import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma';

export const auth = betterAuth({
  // Database adapter using Prisma client
  database: prismaAdapter(prisma, {
    provider: 'postgresql', // or "mysql", "postgresql", ...etc
  }),

  trustedOrigins: ['http://localhost:3000', 'http://localhost:3002'],

  // Load secret and base URL from environment (fallback defaults)
  secret: process.env.BETTER_AUTH_SECRET,
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
