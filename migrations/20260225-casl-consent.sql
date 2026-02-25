-- =============================================================================
-- Migration: 20260225-casl-consent.sql
-- CASL (Canada's Anti-Spam Legislation) compliance for seoh.ca newsletter
-- Fixes V-38: No CASL-compliant opt-in for newsletter/email signup
--
-- This migration creates the newsletter_subscribers table with mandatory
-- consent fields required by CASL:
--   • consent_given      — explicit boolean opt-in (must be true)
--   • consent_timestamp  — exact UTC timestamp when consent was given
--   • consent_ip         — IP address of subscriber at time of consent
--
-- Source: https://fightspam.gc.ca/eic/site/030.nsf/eng/home
-- Applies to: krya database
-- =============================================================================

\connect krya

-- Create the newsletter_subscribers table
CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
    id                  TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email               TEXT         NOT NULL,

    -- CASL-required consent fields
    "consentGiven"      BOOLEAN      NOT NULL DEFAULT false,
    "consentTimestamp"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "consentIp"         TEXT         NOT NULL,
    "consentSource"     TEXT         NOT NULL DEFAULT 'seoh.ca',

    -- Unsubscribe / opt-out tracking
    "unsubscribedAt"    TIMESTAMPTZ,
    "unsubscribeToken"  TEXT         NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

    -- Timestamps
    "createdAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Unique constraint: one record per email address
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_email_key"
    ON "NewsletterSubscriber"(email);

-- Performance index: quickly query active (consented, not unsubscribed) list
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_active_idx"
    ON "NewsletterSubscriber"("consentGiven")
    WHERE "consentGiven" = true AND "unsubscribedAt" IS NULL;

-- Auto-update updatedAt on row changes
CREATE OR REPLACE FUNCTION update_newsletter_subscriber_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_newsletter_subscriber_updated_at'
    ) THEN
        CREATE TRIGGER trg_newsletter_subscriber_updated_at
            BEFORE UPDATE ON "NewsletterSubscriber"
            FOR EACH ROW EXECUTE FUNCTION update_newsletter_subscriber_updated_at();
    END IF;
END $$;

-- Grant access to the krya DB role
GRANT SELECT, INSERT, UPDATE ON "NewsletterSubscriber" TO krya;

-- =============================================================================
-- Verification query (run after applying to confirm table was created)
-- =============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'NewsletterSubscriber'
-- ORDER BY ordinal_position;
