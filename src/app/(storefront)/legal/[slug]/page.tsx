import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LEGAL_DOCS } from '@/lib/legal-content';
import { buildMetadata } from '@/lib/seo';

// Dynamic under the per-store storefront layout (MT-6); content is static data.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = LEGAL_DOCS[slug];
  if (!doc) return buildMetadata({ title: 'Not found', noIndex: true });
  return buildMetadata({ title: doc.title, path: `/legal/${slug}`, description: doc.intro });
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = LEGAL_DOCS[slug];
  if (!doc) notFound();

  return (
    <main className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Last updated {new Date(doc.updated).toLocaleDateString('en-MY', { dateStyle: 'long' })}
      </p>
      <p className="mt-6 leading-relaxed text-muted-foreground">{doc.intro}</p>

      <div className="mt-8 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold">{section.heading}</h2>
            <ul className="mt-2 space-y-2">
              {section.body.map((line, i) => (
                <li key={i} className="leading-relaxed text-muted-foreground">
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
