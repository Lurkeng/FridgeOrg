import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalBlock } from "@/components/ui/LegalBlock";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--ft-bone)] px-5 py-10 text-[var(--ft-ink)]">
      <article className="mx-auto max-w-3xl border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-6 sm:p-10">
        <Link to="/auth" className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--ft-signal)]">
          FreshTrack
        </Link>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)]">Legal</p>
        <h1 className="mt-1 font-display text-4xl font-black tracking-[-0.04em]">Privacy Policy</h1>
        <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[rgba(21,19,15,0.48)]">
          Last updated: 2 May 2025
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[rgba(21,19,15,0.72)]">
          FreshTrack helps households track food inventory, build shopping lists, and reduce waste.
          This policy explains what personal data we collect, how we use it, who we share it with,
          and what rights you have under the General Data Protection Regulation (GDPR).
        </p>

        <section className="mt-8 space-y-5">
          <LegalBlock title="Data Controller" kicker="Who is responsible">
            FreshTrack is operated by the developer and acts as the data controller for all personal
            data processed through this service. For any questions or requests about your data,
            contact us at{" "}
            <a href="mailto:privacy@freshtrack.app" className="underline decoration-[var(--ft-pickle)] underline-offset-2">
              privacy@freshtrack.app
            </a>
            .
          </LegalBlock>

          <LegalBlock title="Data Processors" kicker="Third-party services">
            We use the following sub-processors under data processing agreements or equivalent
            safeguards:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Turso (libSQL)</strong> — database hosting. All user data (inventory,
                shopping lists, purchase history, saved recipes, waste logs, household membership,
                email address, and authentication sessions) is stored in Turso databases.
              </li>
              <li>
                <strong>Anthropic (Claude AI)</strong> — AI-generated recipe suggestions. Only your
                explicit recipe request prompt is sent to Anthropic, and only when you actively
                request an AI suggestion. No other personal data is shared. See{" "}
                <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--ft-pickle)] underline-offset-2">
                  Anthropic's Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Kassalapp</strong> — Norwegian grocery price data. We query Kassalapp's
                public price API to display product prices. This is public data; no personal data
                is sent to Kassalapp.
              </li>
              <li>
                <strong>Cloudflare / Vercel</strong> — hosting and CDN infrastructure. Your
                requests pass through their networks. Both providers operate under standard
                contractual clauses for international data transfers.
              </li>
              <li>
                <strong>Resend</strong> — transactional email. We use Resend to deliver account
                verification and password reset emails. Only your email address is shared for this
                purpose.
              </li>
            </ul>
          </LegalBlock>

          <LegalBlock title="Data We Collect" kicker="What we store">
            We collect and store the following categories of personal data:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Email address and hashed password for account authentication</li>
              <li>Authentication session tokens stored as secure HTTP-only cookies</li>
              <li>Household membership records (which accounts belong to which household)</li>
              <li>Inventory items including food names, quantities, and expiry dates you enter</li>
              <li>Shopping lists and purchase history you record</li>
              <li>Waste logs you submit</li>
              <li>Recipes you save within the app</li>
              <li>
                Theme and language preference stored in your browser's localStorage — not
                transmitted to our servers
              </li>
            </ul>
          </LegalBlock>

          <LegalBlock title="Household Data Sharing" kicker="Who can see your data">
            All inventory, shopping, waste, and recipe data is scoped to the household you create
            or join. Every member of a household can view and edit that shared data. By joining a
            household — either by creating one or accepting an invite via an invite code — you give
            explicit consent to your data being visible to the other members of that household.
            Share invite codes only with people you trust.
          </LegalBlock>

          <LegalBlock title="Legal Basis for Processing" kicker="GDPR Article 6">
            We process your data on the following legal bases under GDPR Article 6:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Contract (Art. 6(1)(b)):</strong> account creation, authentication, and
                core app features
              </li>
              <li>
                <strong>Legitimate interests (Art. 6(1)(f)):</strong> service security, error
                logging, and abuse prevention
              </li>
              <li>
                <strong>Consent (Art. 6(1)(a)):</strong> optional AI recipe suggestions — only
                processed when you explicitly request them
              </li>
            </ul>
          </LegalBlock>

          <LegalBlock title="Cookies and Local Storage" kicker="Browser storage">
            FreshTrack uses:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Auth session cookie</strong> — a single secure, HTTP-only cookie set when
                you sign in. Required for the app to function. Cleared on sign-out or expiry.
              </li>
              <li>
                <strong>Theme / language preference</strong> — stored in your browser's
                localStorage. Never transmitted to our servers.
              </li>
            </ul>
            We do not use advertising cookies, tracking pixels, or any third-party analytics
            cookies.
          </LegalBlock>

          <LegalBlock title="Data Retention" kicker="How long we keep data">
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Active accounts:</strong> data is retained until you delete your account.
              </li>
              <li>
                <strong>Deleted accounts:</strong> all personal data is permanently purged within
                30 days of account deletion. Aggregated, non-identifiable statistics may be
                retained indefinitely.
              </li>
            </ul>
          </LegalBlock>

          <LegalBlock title="Your GDPR Rights" kicker="Rights under GDPR">
            As a data subject under the GDPR, you have the following rights:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Access (Art. 15):</strong> request a copy of the personal data we hold
                about you
              </li>
              <li>
                <strong>Rectification (Art. 16):</strong> ask us to correct inaccurate or
                incomplete data
              </li>
              <li>
                <strong>Erasure (Art. 17):</strong> request deletion of your personal data
                ("right to be forgotten")
              </li>
              <li>
                <strong>Portability (Art. 20):</strong> receive your data in a structured,
                machine-readable format
              </li>
              <li>
                <strong>Restriction (Art. 18):</strong> ask us to restrict processing of your
                data in certain circumstances
              </li>
              <li>
                <strong>Objection (Art. 21):</strong> object to processing based on legitimate
                interests
              </li>
            </ul>
            To exercise any of these rights, email{" "}
            <a href="mailto:privacy@freshtrack.app" className="underline decoration-[var(--ft-pickle)] underline-offset-2">
              privacy@freshtrack.app
            </a>
            . We will respond within 30 days. You also have the right to lodge a complaint with
            the Norwegian Data Protection Authority (Datatilsynet) at{" "}
            <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--ft-pickle)] underline-offset-2">
              datatilsynet.no
            </a>
            .
          </LegalBlock>

          <LegalBlock title="International Transfers" kicker="Data outside the EEA">
            Some processors (Anthropic, Vercel, Resend) are based in the United States. Transfers
            are conducted under the EU Standard Contractual Clauses (SCCs) or equivalent
            safeguards as required by GDPR Chapter V.
          </LegalBlock>

          <LegalBlock title="Policy Changes" kicker="Updates to this policy">
            We may update this policy. If changes are material, we will notify you by email before
            they take effect. The "last updated" date at the top of this page reflects the current
            version.
          </LegalBlock>
        </section>
      </article>
    </main>
  );
}
