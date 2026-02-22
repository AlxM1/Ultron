-- =============================================================================
-- Migration: 2026-02-22-fixes.sql
-- Applies DB schema changes that were patched live and need to survive rebuilds
-- =============================================================================

-- ============================================================================
-- SECTION 1: AgentSmith — scheduled_triggers table
-- The QueueService references this table but it was never created in the
-- live agentsmith DB (only existed in init-db.sql template).
-- Connect to: agentsmith
-- ============================================================================
\connect agentsmith

CREATE TABLE IF NOT EXISTS scheduled_triggers (
    id              VARCHAR(50)  PRIMARY KEY,
    workflow_id     VARCHAR(50)  NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    node_id         VARCHAR(50)  NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    timezone        VARCHAR(50)  NOT NULL DEFAULT 'UTC',
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    last_run        TIMESTAMP WITH TIME ZONE,
    next_run        TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_triggers_workflow
    ON scheduled_triggers(workflow_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_triggers_next_run
    ON scheduled_triggers(next_run)
    WHERE is_active = true;

-- Auto-update updated_at on row changes
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_scheduled_triggers_updated_at'
    ) THEN
        CREATE TRIGGER update_scheduled_triggers_updated_at
            BEFORE UPDATE ON scheduled_triggers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: AgentSmith — webhooks.updated_at column
-- The Drizzle schema and QueueService both expect this column but it was
-- missing from the live DB (created without it).
-- ============================================================================

ALTER TABLE webhooks
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Back-fill existing rows
UPDATE webhooks SET updated_at = created_at WHERE updated_at IS NULL;

-- Auto-update trigger (guard in case it already exists from init-db.sql)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_webhooks_updated_at'
    ) THEN
        CREATE TRIGGER update_webhooks_updated_at
            BEFORE UPDATE ON webhooks
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: Krya — full schema (14 tables)
-- Managed by Prisma in production; this block lets the schema be bootstrapped
-- on a fresh DB without running prisma migrate.
-- Connect to: krya
-- ============================================================================
\connect krya

-- Enums (safe to re-run thanks to DO blocks)
DO $$ BEGIN CREATE TYPE public."GenerationStatus" AS ENUM ('PENDING','PROCESSING','COMPLETED','FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public."GenerationType"   AS ENUM ('TEXT_TO_IMAGE','IMAGE_TO_IMAGE','INPAINTING','OUTPAINTING','UPSCALE','EDIT','3D'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public."ProjectType"       AS ENUM ('CANVAS','VIDEO','WORKFLOW','COLLECTION'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public."SubscriptionStatus" AS ENUM ('ACTIVE','CANCELED','PAST_DUE','UNPAID','TRIALING'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public."SubscriptionTier"   AS ENUM ('FREE','BASIC','PRO','MAX','TEAM','ENTERPRISE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public."TrainedModelType"   AS ENUM ('LORA','DREAMBOOTH','TEXTUAL_INVERSION','FACE','STYLE','PRODUCT','OBJECT','CHARACTER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public."TrainingStatus"     AS ENUM ('PENDING','QUEUED','TRAINING','COMPLETED','FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public."VideoType"          AS ENUM ('TEXT_TO_VIDEO','IMAGE_TO_VIDEO','VIDEO_EXTENSION','LIPSYNC','MOTION_TRANSFER','RESTYLE','UPSCALE'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. User
CREATE TABLE IF NOT EXISTS public."User" (
    id                   text                         NOT NULL PRIMARY KEY,
    name                 text,
    email                text,
    "emailVerified"      timestamp(3) without time zone,
    image                text,
    password             text,
    "authentikId"        text,
    "createdAt"          timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionTier"   public."SubscriptionTier"    NOT NULL DEFAULT 'FREE',
    "creditsRemaining"   integer                      NOT NULL DEFAULT 50,
    "creditsResetAt"     timestamp(3) without time zone,
    "favoriteGenerations" text[]                      DEFAULT ARRAY[]::text[],
    "favoriteVideos"     text[]                       DEFAULT ARRAY[]::text[],
    "favoriteWorkflows"  text[]                       DEFAULT ARRAY[]::text[],
    "favoriteModels"     text[]                       DEFAULT ARRAY[]::text[]
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"        ON public."User"(email);
CREATE UNIQUE INDEX IF NOT EXISTS "User_authentikId_key"  ON public."User"("authentikId");
CREATE        INDEX IF NOT EXISTS "User_email_idx"        ON public."User"(email);

-- 2. Account
CREATE TABLE IF NOT EXISTS public."Account" (
    id                  text NOT NULL PRIMARY KEY,
    "userId"            text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    type                text NOT NULL,
    provider            text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token       text,
    access_token        text,
    expires_at          integer,
    token_type          text,
    scope               text,
    id_token            text,
    session_state       text
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON public."Account"(provider, "providerAccountId");
CREATE        INDEX IF NOT EXISTS "Account_userId_idx"                     ON public."Account"("userId");

-- 3. Session
CREATE TABLE IF NOT EXISTS public."Session" (
    id             text                            NOT NULL PRIMARY KEY,
    "sessionToken" text                            NOT NULL,
    "userId"       text                            NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    expires        timestamp(3) without time zone  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON public."Session"("sessionToken");
CREATE        INDEX IF NOT EXISTS "Session_userId_idx"       ON public."Session"("userId");

-- 4. VerificationToken
CREATE TABLE IF NOT EXISTS public."VerificationToken" (
    identifier text                            NOT NULL,
    token      text                            NOT NULL,
    expires    timestamp(3) without time zone  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key"                ON public."VerificationToken"(token);
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key"     ON public."VerificationToken"(identifier, token);

-- 5. Subscription
CREATE TABLE IF NOT EXISTS public."Subscription" (
    id                    text                            NOT NULL PRIMARY KEY,
    "userId"              text                            NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    tier                  public."SubscriptionTier"       NOT NULL DEFAULT 'FREE',
    "stripeCustomerId"    text,
    "stripeSubscriptionId" text,
    "stripePriceId"       text,
    status                public."SubscriptionStatus"     NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart"  timestamp(3) without time zone,
    "currentPeriodEnd"    timestamp(3) without time zone,
    "cancelAtPeriodEnd"   boolean                         NOT NULL DEFAULT false,
    "createdAt"           timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_key"               ON public."Subscription"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_key"     ON public."Subscription"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON public."Subscription"("stripeSubscriptionId");

-- 6. AIModel
CREATE TABLE IF NOT EXISTS public."AIModel" (
    id          text                            NOT NULL PRIMARY KEY,
    name        text                            NOT NULL,
    slug        text                            NOT NULL,
    description text,
    provider    text                            NOT NULL,
    type        text                            NOT NULL,
    category    text                            NOT NULL,
    "isActive"  boolean                         NOT NULL DEFAULT true,
    "isPremium" boolean                         NOT NULL DEFAULT false,
    parameters  jsonb                           NOT NULL DEFAULT '{}',
    "createdAt" timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "AIModel_slug_key"    ON public."AIModel"(slug);
CREATE        INDEX IF NOT EXISTS "AIModel_isActive_idx" ON public."AIModel"("isActive");
CREATE        INDEX IF NOT EXISTS "AIModel_type_idx"     ON public."AIModel"(type);

-- 7. TrainedModel
CREATE TABLE IF NOT EXISTS public."TrainedModel" (
    id               text                            NOT NULL PRIMARY KEY,
    "userId"         text                            NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    name             text                            NOT NULL,
    description      text,
    type             public."TrainedModelType"       NOT NULL DEFAULT 'LORA',
    status           public."TrainingStatus"         NOT NULL DEFAULT 'PENDING',
    "baseModel"      text                            NOT NULL DEFAULT 'flux-dev',
    "trainingImages" jsonb                           NOT NULL DEFAULT '[]',
    "trainingConfig" jsonb                           NOT NULL DEFAULT '{}',
    "modelUrl"       text,
    "triggerWord"    text,
    "previewImages"  text[]                          DEFAULT ARRAY[]::text[],
    steps            integer                         NOT NULL DEFAULT 1000,
    "isPublic"       boolean                         NOT NULL DEFAULT false,
    "createdAt"      timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"    timestamp(3) without time zone
);
CREATE INDEX IF NOT EXISTS "TrainedModel_userId_idx" ON public."TrainedModel"("userId");
CREATE INDEX IF NOT EXISTS "TrainedModel_status_idx" ON public."TrainedModel"(status);

-- 8. Generation
CREATE TABLE IF NOT EXISTS public."Generation" (
    id               text                            NOT NULL PRIMARY KEY,
    "userId"         text                            NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    "projectId"      text                            REFERENCES public."Project"(id) ON DELETE SET NULL,
    "trainedModelId" text                            REFERENCES public."TrainedModel"(id) ON DELETE SET NULL,
    type             public."GenerationType"         NOT NULL DEFAULT 'TEXT_TO_IMAGE',
    prompt           text                            NOT NULL,
    "negativePrompt" text,
    model            text                            NOT NULL,
    parameters       jsonb                           NOT NULL DEFAULT '{}',
    status           public."GenerationStatus"       NOT NULL DEFAULT 'PENDING',
    "imageUrl"       text,
    "thumbnailUrl"   text,
    width            integer                         NOT NULL DEFAULT 1024,
    height           integer                         NOT NULL DEFAULT 1024,
    seed             bigint,
    likes            integer                         NOT NULL DEFAULT 0,
    "isPublic"       boolean                         NOT NULL DEFAULT false,
    "createdAt"      timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Generation_userId_idx"         ON public."Generation"("userId");
CREATE INDEX IF NOT EXISTS "Generation_projectId_idx"      ON public."Generation"("projectId");
CREATE INDEX IF NOT EXISTS "Generation_trainedModelId_idx" ON public."Generation"("trainedModelId");
CREATE INDEX IF NOT EXISTS "Generation_isPublic_idx"       ON public."Generation"("isPublic");
CREATE INDEX IF NOT EXISTS "Generation_createdAt_idx"      ON public."Generation"("createdAt" DESC);

-- 9. Video
CREATE TABLE IF NOT EXISTS public."Video" (
    id                text                            NOT NULL PRIMARY KEY,
    "userId"          text                            NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    "projectId"       text                            REFERENCES public."Project"(id) ON DELETE SET NULL,
    type              public."VideoType"              NOT NULL DEFAULT 'TEXT_TO_VIDEO',
    prompt            text,
    model             text                            NOT NULL,
    parameters        jsonb                           NOT NULL DEFAULT '{}',
    status            public."GenerationStatus"       NOT NULL DEFAULT 'PENDING',
    "videoUrl"        text,
    "thumbnailUrl"    text,
    "durationSeconds" double precision,
    width             integer                         NOT NULL DEFAULT 1280,
    height            integer                         NOT NULL DEFAULT 720,
    "isPublic"        boolean                         NOT NULL DEFAULT false,
    "createdAt"       timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Video_userId_idx"    ON public."Video"("userId");
CREATE INDEX IF NOT EXISTS "Video_projectId_idx" ON public."Video"("projectId");
CREATE INDEX IF NOT EXISTS "Video_createdAt_idx" ON public."Video"("createdAt" DESC);

-- 10. Project
CREATE TABLE IF NOT EXISTS public."Project" (
    id          text                            NOT NULL PRIMARY KEY,
    "userId"    text                            NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    name        text                            NOT NULL,
    type        public."ProjectType"            NOT NULL DEFAULT 'CANVAS',
    data        jsonb                           NOT NULL DEFAULT '{}',
    thumbnail   text,
    "createdAt" timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON public."Project"("userId");

-- 11. Workflow
CREATE TABLE IF NOT EXISTS public."Workflow" (
    id          text                            NOT NULL PRIMARY KEY,
    "userId"    text                            NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    name        text                            NOT NULL,
    description text,
    nodes       jsonb                           NOT NULL DEFAULT '[]',
    connections jsonb                           NOT NULL DEFAULT '[]',
    thumbnail   text,
    "runCount"  integer                         NOT NULL DEFAULT 0,
    "isPublic"  boolean                         NOT NULL DEFAULT false,
    "createdAt" timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Workflow_userId_idx"   ON public."Workflow"("userId");
CREATE INDEX IF NOT EXISTS "Workflow_isPublic_idx" ON public."Workflow"("isPublic");

-- 12. Notification
CREATE TABLE IF NOT EXISTS public."Notification" (
    id          text                            NOT NULL PRIMARY KEY,
    "userId"    text                            NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    type        text                            NOT NULL,
    title       text                            NOT NULL,
    message     text                            NOT NULL,
    read        boolean                         NOT NULL DEFAULT false,
    data        jsonb                           NOT NULL DEFAULT '{}',
    "createdAt" timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx"      ON public."Notification"("userId", read);
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON public."Notification"("userId", "createdAt" DESC);

-- 13. UsageLog
CREATE TABLE IF NOT EXISTS public."UsageLog" (
    id           text                            NOT NULL PRIMARY KEY,
    "userId"     text                            NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    "actionType" text                            NOT NULL,
    "creditsUsed" integer                        NOT NULL DEFAULT 1,
    metadata     jsonb                           NOT NULL DEFAULT '{}',
    "createdAt"  timestamp(3) without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "UsageLog_userId_createdAt_idx" ON public."UsageLog"("userId", "createdAt");

-- 14. _prisma_migrations (Prisma internal table)
CREATE TABLE IF NOT EXISTS public._prisma_migrations (
    id                  character varying(36)  NOT NULL PRIMARY KEY,
    checksum            character varying(64)  NOT NULL,
    finished_at         timestamp with time zone,
    migration_name      character varying(255) NOT NULL,
    logs                text,
    rolled_back_at      timestamp with time zone,
    started_at          timestamp with time zone NOT NULL DEFAULT now(),
    applied_steps_count integer                NOT NULL DEFAULT 0
);

-- Grants for krya role
GRANT ALL ON SCHEMA public TO krya;
GRANT ALL ON ALL TABLES IN SCHEMA public TO krya;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO krya;
