import type { Request, Response } from 'express';
import { asyncHandler, HttpError } from '../../core';
import { Resend } from 'resend';
import { TicketModel } from './ticket.model';
import { UserModel } from '../users/user.model';
import { validateIdParam } from '../users/user.validation';
import {
  validateCreateTicketBody,
  validateTicketListQuery,
  validateUpdateTicketBody,
  validateCreateTicketMessageBody,
} from './ticket.validation';
import { gmail } from '../../provider/google/gmail';

/**
 * Resend client for sending email notifications.
 * Uses the API key from RESEND_API_KEY env var.
 */
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Ticket controller — owns the HTTP layer for ticket resources. It shapes the
 * request, calls the model, and shapes the response. No Prisma, no query
 * building, no business rules here — those live in the model. Failures are
 * thrown as HttpError; asyncHandler forwards them to the error handler.
 */
export const TicketController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = validateTicketListQuery(req.query as Record<string, unknown>);
    if (!result.ok) throw new HttpError(400, result.errors.join(', '));

    const { tickets, meta } = await TicketModel.paginatedList(result.value);
    res.json({ tickets, meta });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const result = validateIdParam({ id: req.params.id });
    if (!result.ok) throw new HttpError(400, result.errors.join(', '));

    const ticket = await TicketModel.findById(result.value);
    if (!ticket) throw new HttpError(404, 'Ticket not found');

    res.json({ ticket });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const result = validateCreateTicketBody(req.body);
    if (!result.ok) throw new HttpError(400, result.errors.join(', '));

    const { assignedToId, ...ticketData } = result.value;

    // Validate assignedToId if provided — must reference a live (non-deleted) user.
    if (assignedToId) {
      const assignee = await UserModel.findById(assignedToId);
      if (!assignee) {
        throw new HttpError(400, '"assignedToId" does not reference a valid user');
      }
      if (assignee.deletedAt) {
        throw new HttpError(400, 'Assigned-to user is deactivated');
      }
    }

    const ticket = await TicketModel.createTicket(
      { ...ticketData, assignedToId: assignedToId ?? null },
      (req as any).user.id,
    );

    res.status(201).json({ ticket });
  }),

  /**
   * Update a ticket's assignee and/or status. Both fields are optional in the
   * body, but at least one must be present (enforced by the validator). When a
   * non-null `assignedToId` is provided, it must reference a live, non-deleted
   * user — the same guard as create. `assignedToId: null` is allowed and pulls
   * the ticket back to the bench. Returns the full ticket with relations so the
   * client can re-render the rail without a separate fetch.
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const idResult = validateIdParam({ id: req.params.id });
    if (!idResult.ok) throw new HttpError(400, idResult.errors.join(', '));

    const bodyResult = validateUpdateTicketBody(req.body);
    if (!bodyResult.ok) throw new HttpError(400, bodyResult.errors.join(', '));

    const { assignedToId, status } = bodyResult.value;

    // Validate assignedToId if a non-null id was provided. null means
    // "unassign" and needs no lookup; undefined means "don't touch it".
    if (assignedToId) {
      const assignee = await UserModel.findById(assignedToId);
      if (!assignee) {
        throw new HttpError(400, '"assignedToId" does not reference a valid user');
      }
      if (assignee.deletedAt) {
        throw new HttpError(400, 'Assigned-to user is deactivated');
      }
    }

    const ticket = await TicketModel.updateTicket(idResult.value, {
      // Only pass keys the client actually sent. undefined means "no change";
      // null means "explicitly clear the assignee".
      ...(assignedToId !== undefined ? { assignedToId } : {}),
      ...(status !== undefined ? { status } : {}),
    });

    if (!ticket) throw new HttpError(404, 'Ticket not found');

    res.json({ ticket });
  }),

  /**
   * Reply to a ticket by adding a message. Creates a new message and returns
   * the updated ticket with messages included.
   */
  reply: asyncHandler(async (req: Request, res: Response) => {
    const idResult = validateIdParam({ id: req.params.id });
    if (!idResult.ok) throw new HttpError(400, idResult.errors.join(', '));

    const bodyResult = validateCreateTicketMessageBody(req.body);
    if (!bodyResult.ok) throw new HttpError(400, bodyResult.errors.join(', '));

    const { content, messageType, senderEmail, senderName } = bodyResult.value;

    const ticketExists = await TicketModel.findById(idResult.value);
    if (!ticketExists) throw new HttpError(404, 'Ticket not found');

    const ticket = await TicketModel.addMessage(idResult.value, {
      content,
      messageType,
      senderEmail: senderEmail ?? null,
      senderName: senderName ?? null,
    });

    if (!ticket) throw new HttpError(404, 'Ticket not found');

    // Auto-update status based on message type if needed
    let resultTicket = ticket;
    if (messageType === 'AGENT_REPLY' && ticket.status === 'OPEN') {
      const updatedTicket = await TicketModel.updateTicket(idResult.value, {
        status: 'IN_PROGRESS',
      });
      if (updatedTicket) {
        resultTicket = updatedTicket;
      }
    }

    // console.log(ticketExists.senderEmail, 'ticketExists.senderEmail');

    // Send email notification to customer for agent replies
    {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'support@example.com';

        const messageParts = [
          `From: Your Name <${fromEmail}>`,
          `To: ${ticketExists.senderEmail}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: Re: ${resultTicket.subject}`,
          '',
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Hi ${resultTicket.senderName || 'there'},</p>
              <p>We've received an update on your ticket: <strong>${resultTicket.subject}</strong></p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0; white-space: pre-wrap;">${content}</p>
              </div>
              <p>You can view the full conversation by logging into your account.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #666; font-size: 12px;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </div>
          `, // <-- Your EJS compiled template HTML
        ];
        const message = messageParts.join('\n');

        // 2. Base64 encode the email for Google's API
        const encodedMessage = Buffer.from(message)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        // 3. Send it via HTTP POST request (Never blocked by Render!)
        const info = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        });

        console.log('Message sent: %s', info);
      } catch (emailErr) {
        // Log error but don't fail the request - the ticket reply was successful
        console.error('Failed to send email notification:', emailErr);
      }
    }

    res.json({ ticket: resultTicket });
  }),

  /**
   * Get messages for a ticket.
   */
  getMessages: asyncHandler(async (req: Request, res: Response) => {
    const idResult = validateIdParam({ id: req.params.id });
    if (!idResult.ok) throw new HttpError(400, idResult.errors.join(', '));

    const messages = await TicketModel.getMessages(idResult.value);
    res.json({ messages });
  }),
};
