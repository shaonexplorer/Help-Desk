import { Resend } from 'resend';
import prisma from '../../prisma';
import type { TicketRow } from '../tickets/ticket.model';
import { TicketModel } from '../tickets/ticket.model';

/**
 * Resend client for fetching email content and verifying webhooks.
 * The API key should be in RESEND_API_KEY env var.
 */
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Extract a name from an email "from" field (e.g., "John Doe <john@example.com>" -> "John Doe")
 */
function extractNameFromEmail(from: string): string | null {
  const match = from.match(/^([^<]+)</);
  if (match) {
    const name = match[1].trim();
    return name.length > 0 ? name : null;
  }
  return null;
}

/**
 * Extract email address from "from" field (e.g., "John Doe <john@example.com>" -> "john@example.com")
 */
function extractEmailFromEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  return from; // fallback: assume it's just an email
}

/**
 * Determine ticket category from email subject/content.
 * Simple keyword-based classification.
 */
function inferCategory(
  subject: string,
  text?: string | null,
): 'BUG' | 'FEATURE_REQUEST' | 'SUPPORT' | 'BILLING' | 'OTHER' {
  const combined = `${subject} ${text ?? ''}`.toLowerCase();

  if (
    combined.includes('bug') ||
    combined.includes('error') ||
    combined.includes('crash') ||
    combined.includes('broken') ||
    combined.includes('not working') ||
    combined.includes('issue')
  ) {
    return 'BUG';
  }
  if (
    combined.includes('feature') ||
    combined.includes('request') ||
    combined.includes('enhancement') ||
    combined.includes('suggestion') ||
    combined.includes('improvement')
  ) {
    return 'FEATURE_REQUEST';
  }
  if (
    combined.includes('billing') ||
    combined.includes('invoice') ||
    combined.includes('payment') ||
    combined.includes('charge') ||
    combined.includes('refund') ||
    combined.includes('subscription')
  ) {
    return 'BILLING';
  }
  return 'SUPPORT';
}

/**
 * Determine ticket priority from email subject/content.
 * Defaults to MEDIUM.
 */
function inferPriority(
  subject: string,
  text?: string | null,
): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
  const combined = `${subject} ${text ?? ''}`.toLowerCase();

  if (
    combined.includes('urgent') ||
    combined.includes('critical') ||
    combined.includes('emergency') ||
    combined.includes('down') ||
    combined.includes('outage') ||
    combined.includes('blocker')
  ) {
    return 'URGENT';
  }
  if (
    combined.includes('high') ||
    combined.includes('important') ||
    combined.includes('asap') ||
    combined.includes('immediately')
  ) {
    return 'HIGH';
  }
  if (
    combined.includes('low') ||
    combined.includes('minor') ||
    combined.includes('cosmetic') ||
    combined.includes('typos')
  ) {
    return 'LOW';
  }
  return 'MEDIUM';
}

/**
 * Find or create a user for the email sender.
 * If the sender exists in our system, use them.
 * Otherwise, create a placeholder user (we can't create a real Better Auth user without password).
 * For now, we'll require the sender to exist or use a fallback.
 */
async function findOrCreateSenderUser(
  fromEmail: string,
  _fromName: string | null,
): Promise<string> {
  // Try to find existing user by email
  const existing = await prisma.user.findUnique({
    where: { email: fromEmail },
    select: { id: true, deletedAt: true },
  });

  if (existing && !existing.deletedAt) {
    return existing.id;
  }

  // If user exists but is deactivated, we can't assign to them
  // For inbound emails from unknown senders, we'll need a default creator
  // This could be a "system" user or we could create the user via Better Auth
  // For now, let's find any admin user as fallback
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', deletedAt: null },
    select: { id: true },
  });

  if (admin) {
    return admin.id;
  }

  // Last resort: find any active user
  const anyUser = await prisma.user.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });

  if (anyUser) {
    return anyUser.id;
  }

  throw new Error('No active users exist to assign ticket creator');
}

/**
 * Create a ticket from an inbound email.
 * This is the main service function called by the controller.
 */
export async function createTicketFromEmail(emailId: string): Promise<TicketRow> {
  // Fetch the full email content from Resend
  const { data: email, error } = await resend.emails.receiving.get(emailId);

  if (error || !email) {
    throw new Error(`Failed to fetch email ${emailId}: ${error?.message ?? 'Unknown error'}`);
  }

  const { from, subject, text, html } = email;

  // Use text content as description, fall back to HTML stripped
  let description = text ?? '';
  if (!description && html) {
    // Simple HTML to text conversion for basic cases
    description = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .trim();
  }

  if (!description) {
    description = '(No content)';
  }

  // Extract sender info
  const senderEmail = extractEmailFromEmail(from);
  const senderName = extractNameFromEmail(from);

  // Find or create the creator user
  const createdById = await findOrCreateSenderUser(senderEmail, senderName);

  // Infer category and priority
  const category = inferCategory(subject, text);
  const priority = inferPriority(subject, text);

  // Create the ticket using the existing TicketModel
  const ticket = await TicketModel.createTicket(
    {
      subject: `${subject}`,
      description: `From: ${from}\n\n${description}`,
      priority,
      category,
      assignedToId: null, // Unassigned by default - will be triaged
      senderEmail,
      senderName,
    },
    createdById,
  );

  return ticket;
}
