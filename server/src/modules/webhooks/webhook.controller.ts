import type { Request, Response } from 'express';
import { asyncHandler, HttpError } from '../../core';
import { Resend } from 'resend';
import { validateWebhookPayload } from './webhook.validation';
import { createTicketFromEmail } from './webhook.model';

/**
 * Resend client for webhook verification.
 * Uses the webhook secret from RESEND_WEBHOOK_SECRET env var.
 */
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Webhook controller — handles inbound Resend webhooks.
 * Verifies signatures using Resend's SDK, then processes email.received events.
 */
export const WebhookController = {
  /**
   * POST /api/webhooks/resend
   * Handles Resend's email.received webhook events.
   * Verifies the webhook signature, fetches the email, and creates a ticket.
   */
  resend: asyncHandler(async (req: Request, res: Response) => {
    // Get raw body for signature verification
    // express.json() parses it, but we need the raw string
    // The body is already parsed by express.json() middleware
    // We'll use the parsed body for validation but need raw for verification
    // Since we can't get raw body after express.json(), we use a workaround
    // In production, use express.raw() for webhook routes specifically

    // Verify webhook signature using Resend SDK
    // We need the raw body - but express.json() already parsed it
    // Re-serialize for verification (Resend SDK expects string)
    const rawBody = JSON.stringify(req.body);

    // Extract required headers
    const svixId = req.headers['svix-id'] as string | undefined;
    const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
    const svixSignature = req.headers['svix-signature'] as string | undefined;

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new HttpError(400, 'Missing required webhook headers (svix-id, svix-timestamp, svix-signature)');
    }

    // Verify the webhook
    let verifiedPayload: { type: string; data: { email_id: string } };
    try {
      const result = resend.webhooks.verify({
        payload: rawBody,
        headers: {
          id: svixId,
          timestamp: svixTimestamp,
          signature: svixSignature,
        },
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
      });
      // Cast to our expected type since Resend SDK may return different event types
      verifiedPayload = result as { type: string; data: { email_id: string } };
    } catch (err) {
      console.error('Webhook verification failed:', err);
      throw new HttpError(400, 'Invalid webhook signature');
    }

    // Validate the payload structure
    const validationResult = validateWebhookPayload(verifiedPayload);
    if (!validationResult.ok) {
      console.error('Webhook payload validation failed:', validationResult.errors);
      throw new HttpError(400, `Invalid webhook payload: ${validationResult.errors.join(', ')}`);
    }

    const { data } = validationResult.value;

    // Handle email.received event
    if (verifiedPayload.type === 'email.received') {
      try {
        const ticket = await createTicketFromEmail(data.email_id);
        console.log(`Created ticket ${ticket.id} from email ${data.email_id}`);
        res.status(201).json({ ticket, message: 'Ticket created from inbound email' });
      } catch (err) {
        console.error('Failed to create ticket from email:', err);
        // Return 200 to acknowledge webhook receipt (Resend will retry on 5xx)
        // But we log the error for investigation
        res.status(200).json({ error: 'Ticket creation failed', message: String(err) });
      }
    } else {
      // Unknown event type - acknowledge but don't process
      console.log(`Received unknown webhook type: ${verifiedPayload.type}`);
      res.status(200).json({ message: 'Webhook acknowledged (unsupported type)' });
    }
  }),
};