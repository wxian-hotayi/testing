import { SITE } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
import { env } from '@/lib/env';

/** Shared, email-client-safe HTML shell (inline styles, table-free, single column). */
function layout(bodyHtml: string, preheader = ''): string {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f6f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a2620;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
<div style="max-width:560px;margin:0 auto;padding:24px;">
  <div style="text-align:center;padding:8px 0 16px;">
    <a href="${base}" style="font-size:20px;font-weight:700;color:#1a8a5f;text-decoration:none;">🌿 ${SITE.name}</a>
  </div>
  <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e3e8e6;">
    ${bodyHtml}
  </div>
  <p style="text-align:center;color:#7a8a84;font-size:12px;margin-top:20px;line-height:1.6;">
    These statements have not been evaluated by the relevant health authority. This product is not intended to diagnose, treat, cure, or prevent any disease.<br>
    © ${SITE.name}. Prices in Malaysian Ringgit (RM).
  </p>
</div></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1a8a5f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${label}</a>`;
}

export function renderWelcomeEmail(firstName: string): {
  subject: string;
  html: string;
} {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  return {
    subject: `Welcome to ${SITE.name} 🌿`,
    html: layout(
      `<h1 style="font-size:22px;margin:0 0 12px;">Welcome${firstName ? `, ${firstName}` : ''}!</h1>
       <p style="line-height:1.6;color:#3a4a44;">Thanks for joining ${SITE.name}. Here's <strong>10% off</strong> your first order with code <strong>WELCOME10</strong>.</p>
       <p style="margin:20px 0;">${button(`${base}/products`, 'Shop now')}</p>`,
      'Welcome — here is 10% off your first order.',
    ),
  };
}

export function renderOrderConfirmationEmail(opts: {
  firstName: string;
  orderNumber: string;
  totalSen: number;
  items: { name: string; quantity: number; totalSen: number }[];
}): { subject: string; html: string } {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const rows = opts.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#3a4a44;">${i.quantity} × ${i.name}</td><td style="padding:6px 0;text-align:right;">${formatMoney(i.totalSen)}</td></tr>`,
    )
    .join('');
  return {
    subject: `Order ${opts.orderNumber} confirmed`,
    html: layout(
      `<h1 style="font-size:22px;margin:0 0 12px;">Thanks${opts.firstName ? `, ${opts.firstName}` : ''}!</h1>
       <p style="line-height:1.6;color:#3a4a44;">Your order <strong>${opts.orderNumber}</strong> is confirmed.</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">${rows}
         <tr><td style="padding:10px 0 0;border-top:1px solid #e3e8e6;font-weight:700;">Total</td>
         <td style="padding:10px 0 0;border-top:1px solid #e3e8e6;text-align:right;font-weight:700;">${formatMoney(opts.totalSen)}</td></tr>
       </table>
       <p style="margin:20px 0;">${button(`${base}/account/orders`, 'View your order')}</p>`,
      `Order ${opts.orderNumber} confirmed.`,
    ),
  };
}

export function renderAbandonedCartEmail(opts: {
  firstName: string;
  cartUrl: string;
  discountCode?: string;
  discountPercent?: number;
}): { subject: string; html: string } {
  const discountBlock = opts.discountCode
    ? `<p style="line-height:1.6;color:#3a4a44;">Here's <strong>${opts.discountPercent ?? 10}% off</strong> to complete your order — use code <strong>${opts.discountCode}</strong>.</p>`
    : '';
  return {
    subject: opts.discountCode
      ? `Your cart + ${opts.discountPercent ?? 10}% off inside`
      : 'You left something behind 👀',
    html: layout(
      `<h1 style="font-size:22px;margin:0 0 12px;">Still thinking it over${opts.firstName ? `, ${opts.firstName}` : ''}?</h1>
       <p style="line-height:1.6;color:#3a4a44;">Your cart is saved and waiting.</p>
       ${discountBlock}
       <p style="margin:20px 0;">${button(opts.cartUrl, 'Return to cart')}</p>`,
      'Your cart is waiting.',
    ),
  };
}
