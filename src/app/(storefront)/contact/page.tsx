import type { Metadata } from 'next';
import { Mail, Clock } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { NewsletterForm } from '@/features/marketing/components/newsletter-form';

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description: 'Get in touch with our support team.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <main className="container max-w-2xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Contact us</h1>
      <p className="mt-2 text-muted-foreground">
        We&apos;re here to help with orders, subscriptions, and product questions.
      </p>

      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Mail className="size-5 text-primary" aria-hidden />
          <div>
            <p className="font-medium">Email</p>
            <a href="mailto:support@vitalis.example" className="text-sm text-primary hover:underline">
              support@vitalis.example
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Clock className="size-5 text-primary" aria-hidden />
          <div>
            <p className="font-medium">Support hours</p>
            <p className="text-sm text-muted-foreground">Mon–Fri, 9am–6pm (MYT)</p>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-2 font-semibold">Prefer updates by email?</h2>
        <NewsletterForm source="contact" />
      </div>
    </main>
  );
}
