import type { Metadata } from 'next';
import { ShieldCheck, FlaskConical, Leaf } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { SITE } from '@/lib/constants';

export const metadata: Metadata = buildMetadata({
  title: 'About',
  description: `Learn about ${SITE.name} — science-backed supplements made with clean, third-party-tested ingredients.`,
  path: '/about',
});

export default function AboutPage() {
  const values = [
    { icon: FlaskConical, title: 'Evidence-led', body: 'Formulas grounded in published research and effective doses — no proprietary-blend hiding.' },
    { icon: Leaf, title: 'Clean ingredients', body: 'No unnecessary fillers. Clear labels you can actually read and understand.' },
    { icon: ShieldCheck, title: 'Third-party tested', body: 'Every batch is tested for purity and label accuracy in audited facilities.' },
  ];
  return (
    <main className="container max-w-3xl py-16">
      <h1 className="text-4xl font-bold tracking-tight">About {SITE.name}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        {SITE.name} exists to make high-quality supplementation simple and
        trustworthy. We build {SITE.tagline.toLowerCase()} — and we&apos;re honest
        about what they can and can&apos;t do. Supplements support a healthy diet
        and lifestyle; they don&apos;t replace them, and they aren&apos;t medicine.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {values.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border bg-card p-6">
            <Icon className="size-7 text-primary" aria-hidden />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm text-muted-foreground">
        These statements have not been evaluated by the relevant health authority.
        Our products are not intended to diagnose, treat, cure, or prevent any
        disease. Consult a healthcare professional before use.
      </p>
    </main>
  );
}
