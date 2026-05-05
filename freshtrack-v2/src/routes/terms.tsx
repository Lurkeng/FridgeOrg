import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalBlock } from "@/components/ui/LegalBlock";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--ft-bone)] px-5 py-10 text-[var(--ft-ink)]">
      <article className="mx-auto max-w-3xl border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-6 sm:p-10">
        <Link to="/auth" className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--ft-signal)]">
          FreshTrack
        </Link>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)]">Legal</p>
        <h1 className="mt-1 font-display text-4xl font-black tracking-[-0.04em]">Terms of Service</h1>
        <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[rgba(21,19,15,0.48)]">
          Last updated: 2 May 2025
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[rgba(21,19,15,0.72)]">
          These Terms of Service govern your use of FreshTrack. By creating an account or using
          the service, you agree to these terms. Please read them carefully.
        </p>

        <section className="mt-8 space-y-5">
          <LegalBlock title="What FreshTrack Is" kicker="About this service">
            FreshTrack is a household food inventory, shopping, and waste tracking tool designed
            for Norwegian households. It helps you manage your fridge and freezer inventory, build
            shopping lists, log waste, and discover recipes — with a focus on Norwegian grocery
            routines and reducing household food waste.
          </LegalBlock>

          <LegalBlock title="Eligibility" kicker="Who can use FreshTrack">
            You must be at least <strong>16 years old</strong> to create an account and use
            FreshTrack. This reflects the digital consent age under GDPR in Norway (
            <a href="https://lovdata.no/dokument/NL/lov/2018-06-15-38" target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--ft-pickle)] underline-offset-2">
              Personopplysningsloven § 5
            </a>
            ). By creating an account, you confirm that you meet this requirement.
          </LegalBlock>

          <LegalBlock title="Acceptable Use" kicker="What you may and may not do">
            You may use FreshTrack only for personal household food planning. You agree not to:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Use the service for commercial scraping, data harvesting, or automated bulk
                requests
              </li>
              <li>
                Share household invite codes with people outside your household or with parties
                you do not trust
              </li>
              <li>
                Attempt to access, modify, or disrupt another user's household data
              </li>
              <li>
                Reverse-engineer, decompile, or attempt to extract the source code of the service
              </li>
              <li>
                Use the service in any way that violates applicable Norwegian or EU law
              </li>
            </ul>
          </LegalBlock>

          <LegalBlock title="Household Sharing" kicker="Shared access">
            All members of a household can view and edit shared inventory, shopping lists,
            purchase history, waste logs, and saved recipes. You are responsible for who you
            invite. Only share your household invite code with people you trust and intend to
            give full access to your household data.
          </LegalBlock>

          <LegalBlock title="AI Recipe Suggestions" kicker="Disclaimer">
            FreshTrack may offer AI-generated recipe suggestions powered by Anthropic's Claude.
            These suggestions are provided for convenience and inspiration only. They are{" "}
            <strong>not dietary advice, medical advice, or food safety guidance</strong>. When
            you request an AI suggestion, your prompt is processed by Anthropic — see{" "}
            <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--ft-pickle)] underline-offset-2">
              Anthropic's Privacy Policy
            </a>
            . Always verify that recipes suit your dietary needs, allergies, and health
            conditions before preparing or consuming food. FreshTrack is not liable for any harm
            resulting from following AI-generated recipe suggestions.
          </LegalBlock>

          <LegalBlock title="Price Data" kicker="Kassalapp disclaimer">
            Norwegian grocery prices displayed in FreshTrack are sourced from Kassalapp's public
            price database. Prices are <strong>informational only and may change before you
            reach the checkout</strong>. FreshTrack has no affiliation with any listed stores and
            does not guarantee the accuracy, completeness, or timeliness of any price information.
            Always verify prices in store or on the retailer's website before making purchasing
            decisions.
          </LegalBlock>

          <LegalBlock title="Expiry Date Reminders" kicker="Food safety">
            Expiry dates and freshness reminders in FreshTrack are provided as planning aids
            only. They are not food safety guarantees. Always check product packaging, smell,
            texture, and official food safety guidance before eating or serving food.
          </LegalBlock>

          <LegalBlock title="Beta Software — No Warranty" kicker="Service level">
            FreshTrack is beta software provided "as is" without warranty of any kind, express
            or implied. We do not guarantee uninterrupted availability, data integrity, or
            fitness for any particular purpose. There is no Service Level Agreement (SLA).
            Features may be added, changed, or removed at any time. The service may be
            discontinued with reasonable notice. We recommend maintaining your own backups of
            critical household data.
          </LegalBlock>

          <LegalBlock title="Limitation of Liability" kicker="Our liability">
            To the maximum extent permitted by law, FreshTrack shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including loss
            of data, arising from your use of or inability to use the service.
          </LegalBlock>

          <LegalBlock title="Governing Law" kicker="Jurisdiction">
            These terms are governed by and construed in accordance with the laws of Norway.
            Any disputes arising from or related to these terms or your use of FreshTrack shall
            be subject to the exclusive jurisdiction of Oslo City Court (Oslo tingrett), Norway.
          </LegalBlock>

          <LegalBlock title="Changes to These Terms" kicker="Updates">
            FreshTrack may update these Terms of Service from time to time. When we make
            material changes, we will notify you by email{" "}
            <strong>at least 14 days before the new terms take effect</strong>. Continued use
            of the service after changes take effect constitutes your acceptance of the updated
            terms. The "last updated" date at the top of this page reflects the current version.
          </LegalBlock>
        </section>
      </article>
    </main>
  );
}
