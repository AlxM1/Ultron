import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SEO H",
  description:
    "How SEO H (seoh.ca) collects, uses, and protects your personal information. PIPEDA and GDPR-compliant privacy policy.",
  robots: { index: true, follow: true },
};

// ---------------------------------------------------------------------------
// ⚠️  DRAFT — V-37 | Pending Alex's review before publishing
// ---------------------------------------------------------------------------
// Placeholders that must be replaced before going live:
//   COMPANY_LEGAL_NAME, COMPANY_ADDRESS, PRIVACY_EMAIL, DPO_NAME, EFFECTIVE_DATE
// ---------------------------------------------------------------------------

const LAST_UPDATED = "DRAFT — not yet effective";

type SectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};

function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="mb-10">
      <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2">
        {title}
      </h2>
      <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-base font-medium text-gray-100 mb-2">{title}</h3>
      <div className="space-y-2 text-gray-300 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left text-gray-400 font-medium py-2 pr-4 last:pr-0 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-4 last:pr-0 text-gray-300 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
    >
      {children}
    </a>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-gray-300">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-white/10 bg-black/80 sticky top-0 backdrop-blur-sm z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <a
            href="https://seoh.ca"
            className="text-white font-bold text-lg tracking-tight hover:text-cyan-400 transition-colors"
          >
            SEO H
          </a>
          <span className="text-xs text-gray-500 bg-yellow-900/30 text-yellow-400 border border-yellow-700/40 rounded px-2 py-0.5">
            DRAFT — Not Published
          </span>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-10 pb-20">
        {/* Title block */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-gray-400 text-sm">
            This Privacy Policy describes how{" "}
            <strong className="text-gray-200">[COMPANY_LEGAL_NAME]</strong> ("SEO H", "we", "us",
            or "our") collects, uses, and protects your personal information when you use{" "}
            <strong className="text-gray-200">seoh.ca</strong> (the "Platform"). We comply with
            Canada's{" "}
            <strong className="text-gray-200">
              Personal Information Protection and Electronic Documents Act (PIPEDA)
            </strong>
            , Canada's Anti-Spam Legislation{" "}
            <strong className="text-gray-200">(CASL)</strong>, and apply principles equivalent to
            the <strong className="text-gray-200">GDPR</strong> for users in the EU/UK.
          </p>
        </div>

        {/* ── Table of Contents ─────────────────────────────────── */}
        <nav className="mb-10 p-5 rounded-xl border border-white/10 bg-white/5 text-sm">
          <p className="text-gray-400 font-medium mb-3">Contents</p>
          <ol className="list-decimal list-inside space-y-1 text-cyan-400 marker:text-gray-600">
            {[
              ["#contact", "Who We Are & Contact"],
              ["#collection", "What We Collect"],
              ["#use", "How We Use Your Information"],
              ["#sharing", "How We Share Your Information"],
              ["#cookies", "Cookies & Tracking"],
              ["#security", "Data Storage & Security"],
              ["#retention", "Data Retention"],
              ["#rights", "Your Rights"],
              ["#children", "Children's Privacy"],
              ["#changes", "Changes to This Policy"],
            ].map(([href, label], i) => (
              <li key={href}>
                <a href={href} className="hover:text-cyan-300 transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ── 1. Contact ─────────────────────────────────────────── */}
        <Section id="contact" title="1. Who We Are & How to Contact Us">
          <p>
            <strong className="text-gray-100">[COMPANY_LEGAL_NAME]</strong> is the data controller
            for personal information collected through the Platform.
          </p>
          <div className="mt-3 p-4 rounded-lg border border-white/10 bg-white/5 font-mono text-xs space-y-1">
            <p>
              <span className="text-gray-500">Company:</span>{" "}
              <span className="text-gray-200">[COMPANY_LEGAL_NAME]</span>
            </p>
            <p>
              <span className="text-gray-500">Address:</span>{" "}
              <span className="text-gray-200">[COMPANY_ADDRESS]</span>
            </p>
            <p>
              <span className="text-gray-500">Privacy Officer:</span>{" "}
              <span className="text-gray-200">[DPO_NAME]</span>
            </p>
            <p>
              <span className="text-gray-500">Email:</span>{" "}
              <a
                href="mailto:[PRIVACY_EMAIL]"
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                [PRIVACY_EMAIL]
              </a>
            </p>
          </div>
          <p className="mt-3 text-gray-400">
            We aim to respond to all privacy inquiries within <strong>10 business days</strong>.
          </p>
        </Section>

        {/* ── 2. Collection ──────────────────────────────────────── */}
        <Section id="collection" title="2. What Information We Collect">
          <SubSection title="2.1 Information You Provide">
            <DataTable
              headers={["Category", "Examples", "Purpose"]}
              rows={[
                ["Contact / Identity", "Name, email address", "Account creation, newsletter"],
                [
                  "Account credentials",
                  "Managed via Authentik SSO — we never store raw passwords",
                  "Authentication",
                ],
                ["Communications", "Support emails, contact form submissions", "Customer support"],
                [
                  "Newsletter signup",
                  "Email address, signup date",
                  "Newsletter delivery (CASL opt-in)",
                ],
              ]}
            />
          </SubSection>

          <SubSection title="2.2 Automatically Collected Data">
            <DataTable
              headers={["Category", "Examples", "Retention"]}
              rows={[
                [
                  "Usage analytics",
                  "Pages visited, features used, session duration",
                  "12 months",
                ],
                [
                  "Technical data",
                  "IP address (anonymized), browser type, OS, referring URL",
                  "30 days (raw IP)",
                ],
                ["Auth logs", "Login timestamps, session tokens", "90 days"],
                ["Error logs", "Application errors, response times", "90 days"],
              ]}
            />
            <p className="text-gray-500 text-xs mt-2">
              IP addresses are anonymized before analytics reporting and raw values are not
              retained beyond 30 days.
            </p>
          </SubSection>

          <SubSection title="2.3 YouTube Content Metadata (Content Intelligence Features)">
            <p>
              Our content intelligence tools analyze <strong>publicly available</strong> YouTube
              content to provide GEO (Generative Engine Optimization) insights. We process:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Video metadata (title, description, publish date, view counts)</li>
              <li>Publicly available transcripts and auto-generated captions</li>
              <li>Channel-level statistics (subscriber counts, engagement metrics)</li>
            </ul>
            <p className="mt-2 text-gray-400">
              We only access public content via the official YouTube Data API. We do not access
              private, unlisted, or members-only content. YouTube creators who have concerns about
              their public content metadata may contact us at{" "}
              <a
                href="mailto:[PRIVACY_EMAIL]"
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                [PRIVACY_EMAIL]
              </a>
              .
            </p>
          </SubSection>

          <SubSection title="2.4 What We Do NOT Collect">
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Payment card numbers or banking information</li>
              <li>Sensitive personal information (health data, government IDs, biometrics)</li>
              <li>Personal information from children under 13</li>
              <li>Private messages or non-public social media content</li>
            </ul>
          </SubSection>
        </Section>

        {/* ── 3. Use ─────────────────────────────────────────────── */}
        <Section id="use" title="3. How We Use Your Information">
          <DataTable
            headers={["Purpose", "Legal Basis"]}
            rows={[
              ["Creating and managing your account", "Contractual necessity"],
              ["Authenticating your identity via Authentik SSO", "Contractual necessity / Security"],
              ["Delivering Platform features and services", "Contractual necessity"],
              ["Sending newsletters (opt-in only)", "Consent (CASL express consent)"],
              ["Responding to support or privacy inquiries", "Legitimate interest / Legal obligation"],
              ["Detecting and preventing fraud, abuse, or security incidents", "Legitimate interest / Legal obligation"],
              ["Improving Platform features and performance", "Legitimate interest"],
              ["Legal and regulatory compliance", "Legal obligation"],
            ]}
          />
          <div className="mt-4 p-4 rounded-lg border border-red-900/30 bg-red-950/20 text-sm">
            <p className="text-red-400 font-medium mb-1">We never:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Sell your personal information to third parties</li>
              <li>
                Use your data for automated decision-making with significant legal effects without
                human review
              </li>
              <li>Share your data for third-party advertising purposes</li>
            </ul>
          </div>
        </Section>

        {/* ── 4. Sharing ─────────────────────────────────────────── */}
        <Section id="sharing" title="4. How We Share Your Information">
          <p>
            We share personal information only with trusted service providers under written data
            processing agreements, and only for purposes described in this Policy.
          </p>
          <SubSection title="Service Providers">
            <DataTable
              headers={["Type", "Purpose", "Data Shared"]}
              rows={[
                ["Cloud hosting / infrastructure", "Platform hosting, database", "Account data, logs"],
                ["Authentication (Authentik SSO)", "Identity management", "Email, session tokens"],
                ["Email delivery", "Transactional & newsletter emails", "Email address, name"],
                ["Analytics platform", "Usage analytics", "Anonymized usage data"],
                ["Error monitoring", "App stability", "Error logs (no PII by default)"],
              ]}
            />
          </SubSection>
          <p>
            All providers are required to: process data only on our instructions, implement
            appropriate security, not sub-process without approval, and delete data upon contract
            termination.
          </p>
          <p className="mt-3">
            We may also disclose information where required by law, court order, or to protect the
            safety and rights of our users and the public. We will notify users of such requests
            where legally permitted.
          </p>
        </Section>

        {/* ── 5. Cookies ─────────────────────────────────────────── */}
        <Section id="cookies" title="5. Cookies & Tracking Technologies">
          <DataTable
            headers={["Type", "Purpose", "Duration", "Required?"]}
            rows={[
              ["Essential / Session", "Authentication, CSRF protection", "Session / up to 7 days", "Yes"],
              ["Preference", "UI theme, display settings", "1 year", "No"],
              ["Analytics", "Platform usage statistics", "Up to 12 months", "No (opt-in)"],
            ]}
          />
          <p className="mt-3">
            We do <strong className="text-gray-100">not</strong> use third-party advertising or
            cross-site tracking cookies.
          </p>
          <p className="mt-2">
            You can manage non-essential cookie preferences via the cookie settings link in the
            Platform footer, or through your browser settings. Disabling essential cookies will
            prevent authentication from working.
          </p>
        </Section>

        {/* ── 6. Security ────────────────────────────────────────── */}
        <Section id="security" title="6. Data Storage & Security">
          <p>
            Personal information is stored on servers located in{" "}
            <strong className="text-gray-100">Canada</strong> or in jurisdictions providing
            equivalent data protection. Data in transit is encrypted using TLS 1.2+.
          </p>
          <SubSection title="Security Measures">
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Encrypted connections (TLS 1.2+) for all data in transit</li>
              <li>Encrypted backups</li>
              <li>Hashed credentials via Authentik SSO — we never store plaintext passwords</li>
              <li>Role-based access control with principle of least privilege</li>
              <li>PostgreSQL restricted to private network access only</li>
              <li>Regular infrastructure security reviews</li>
            </ul>
          </SubSection>
          <SubSection title="Breach Notification">
            <p>
              In the event of a data breach posing real risk of significant harm, we will notify
              the{" "}
              <strong className="text-gray-100">
                Office of the Privacy Commissioner of Canada (OPC)
              </strong>{" "}
              as required under PIPEDA, and affected individuals directly. For EU/UK residents, we
              will notify the relevant supervisory authority within{" "}
              <strong className="text-gray-100">72 hours</strong> as required by GDPR.
            </p>
          </SubSection>
        </Section>

        {/* ── 7. Retention ───────────────────────────────────────── */}
        <Section id="retention" title="7. Data Retention">
          <p>We retain data only as long as necessary for the purposes described in this Policy.</p>
          <DataTable
            headers={["Data Category", "Retention Period"]}
            rows={[
              ["Active account data", "Duration of active account"],
              ["Account data after deletion", "30 days after deletion request"],
              ["Authentication / session logs", "90 days rolling"],
              ["Newsletter records", "Until unsubscribe + 30 days"],
              ["CASL consent records", "3 years (regulatory requirement)"],
              ["Usage analytics (identifiable)", "12 months rolling"],
              ["Aggregated / anonymized analytics", "Indefinitely"],
              ["YouTube content metadata", "24 months, then refreshed or deleted"],
              ["Support correspondence", "3 years"],
              ["Financial / billing records", "7 years (Canadian tax law)"],
              ["Breach records", "Minimum 2 years from breach date"],
            ]}
          />
          <p className="mt-3 text-gray-500 text-xs">
            Upon expiry, data is securely deleted or irreversibly anonymized.
          </p>
        </Section>

        {/* ── 8. Rights ──────────────────────────────────────────── */}
        <Section id="rights" title="8. Your Rights & Choices">
          <SubSection title="Canadian Residents (PIPEDA)">
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>
                <strong className="text-gray-200">Access:</strong> Request a copy of your personal
                information
              </li>
              <li>
                <strong className="text-gray-200">Correction:</strong> Request correction of
                inaccurate or incomplete data
              </li>
              <li>
                <strong className="text-gray-200">Withdraw consent:</strong> Withdraw consent for
                non-essential processing at any time
              </li>
              <li>
                <strong className="text-gray-200">Challenge compliance:</strong> File a complaint
                with the OPC if you believe we have handled your data improperly
              </li>
            </ul>
            <p className="mt-3">
              We respond to verified requests within{" "}
              <strong className="text-gray-200">30 days</strong>.
            </p>
          </SubSection>

          <SubSection title="EU / UK Residents (GDPR)">
            <DataTable
              headers={["Right", "What it means"]}
              rows={[
                ["Access (Art. 15)", "Copy of your data and how it's processed"],
                ["Rectification (Art. 16)", "Correct inaccurate data"],
                ["Erasure (Art. 17)", "Delete your data where no overriding grounds apply"],
                ["Restriction (Art. 18)", "Limit processing while disputes are resolved"],
                ["Portability (Art. 20)", "Receive your data in a machine-readable format"],
                ["Object (Art. 21)", "Object to processing based on legitimate interest"],
              ]}
            />
            <p className="mt-3">
              We respond to GDPR requests within{" "}
              <strong className="text-gray-200">one calendar month</strong> (extendable by two
              months for complex requests, with notice). Email{" "}
              <a
                href="mailto:[PRIVACY_EMAIL]"
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                [PRIVACY_EMAIL]
              </a>{" "}
              with subject "GDPR Data Subject Request".
            </p>
          </SubSection>

          <SubSection title="Newsletter Unsubscribe (CASL)">
            <p>
              Every marketing email includes a one-click unsubscribe link. Opt-outs are processed
              within <strong className="text-gray-200">10 business days</strong> as required by
              CASL. You may also unsubscribe by emailing{" "}
              <a
                href="mailto:[PRIVACY_EMAIL]"
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                [PRIVACY_EMAIL]
              </a>
              .
            </p>
          </SubSection>
        </Section>

        {/* ── 9. Children ────────────────────────────────────────── */}
        <Section id="children" title="9. Children's Privacy">
          <p>
            The Platform is not directed to children under{" "}
            <strong className="text-gray-100">13</strong> (or under 16 for EU residents). We do not
            knowingly collect personal information from children. If you believe a child has
            provided us with their information, contact us at{" "}
            <a
              href="mailto:[PRIVACY_EMAIL]"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              [PRIVACY_EMAIL]
            </a>{" "}
            and we will delete it promptly.
          </p>
        </Section>

        {/* ── 10. Changes ────────────────────────────────────────── */}
        <Section id="changes" title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. For material changes, we will
            update the "Last Updated" date and notify registered users via email and/or a prominent
            Platform notice before the changes take effect.
          </p>
          <p>
            Continued use of the Platform after the effective date constitutes acceptance of the
            updated Policy.
          </p>
        </Section>

        {/* ── Supervisory Authorities ─────────────────────────────── */}
        <section className="mt-10 p-5 rounded-xl border border-white/10 bg-white/5 text-sm space-y-3">
          <h2 className="text-base font-semibold text-white">Supervisory Authorities</h2>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Canada</p>
            <p className="text-gray-200">
              Office of the Privacy Commissioner of Canada (OPC)
            </p>
            <p className="text-gray-400">
              30 Victoria Street, Gatineau, QC K1A 1H3 · 1-800-282-1376
            </p>
            <InlineLink href="https://www.priv.gc.ca">priv.gc.ca</InlineLink>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">EU</p>
            <InlineLink href="https://edpb.europa.eu/about-edpb/about-edpb/members_en">
              Find your local EU Data Protection Authority
            </InlineLink>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">UK</p>
            <InlineLink href="https://ico.org.uk">
              Information Commissioner's Office (ICO)
            </InlineLink>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer className="mt-16 pt-6 border-t border-white/10 text-xs text-gray-600 text-center space-y-1">
          <p>
            © {new Date().getFullYear()} [COMPANY_LEGAL_NAME] — seoh.ca
          </p>
          <p>
            Questions?{" "}
            <a
              href="mailto:[PRIVACY_EMAIL]"
              className="text-gray-500 hover:text-cyan-400 transition-colors"
            >
              [PRIVACY_EMAIL]
            </a>
          </p>
          <p className="text-yellow-700 mt-2">
            ⚠ DRAFT V-37 — Pending legal review. Not published.
          </p>
        </footer>
      </main>
    </div>
  );
}
