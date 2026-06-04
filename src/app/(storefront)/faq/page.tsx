import type { Metadata } from 'next';
import { FaqAccordion } from '@/components/ui/faq-accordion';
import { JsonLd } from '@/components/seo/json-ld';
import { buildMetadata } from '@/lib/seo';
import { FAQS } from '@/lib/faq';

export const metadata: Metadata = buildMetadata({
  title: 'FAQ',
  description: 'Answers to common questions about our supplements, shipping, subscriptions, and returns.',
  path: '/faq',
});

export default function FaqPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <main className="container max-w-3xl py-12">
      <JsonLd data={faqJsonLd} />
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        Frequently asked questions
      </h1>
      <FaqAccordion items={FAQS} />
    </main>
  );
}
