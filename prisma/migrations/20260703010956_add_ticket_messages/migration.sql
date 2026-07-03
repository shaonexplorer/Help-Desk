-- CreateEnum
CREATE TYPE "public"."TicketMessageType" AS ENUM ('INBOUND_EMAIL', 'AGENT_REPLY', 'AUTOMATED_REPLY');

-- CreateTable
CREATE TABLE "public"."ticket_message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" "public"."TicketMessageType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderEmail" TEXT,
    "senderName" TEXT,
    "ticketId" TEXT NOT NULL,

    CONSTRAINT "ticket_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_message_ticketId_idx" ON "public"."ticket_message"("ticketId");

-- AddForeignKey
ALTER TABLE "public"."ticket_message" ADD CONSTRAINT "ticket_message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
