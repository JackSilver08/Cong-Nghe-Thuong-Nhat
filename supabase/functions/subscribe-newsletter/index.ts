import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  parseRssItems,
  renderDigestHtml,
  renderDigestText,
} from '../_shared/newsletter.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('NEWSLETTER_FROM') ?? 'NewsHub <onboarding@resend.dev>';
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://congnghethuongnhat.netlify.app').replace(/\/$/, '');
const UNSUB_BASE = `${SUPABASE_URL}/functions/v1/unsubscribe`;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ALLOWED_ORIGINS = new Set([
  SITE_URL,
  'https://congnghethuongnhat.netlify.app',
  'http://localhost:4321',
]);

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'access-control-allow-origin': ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'content-type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Chỉ chấp nhận POST' }, 405);
  if (!RESEND_API_KEY) return json(req, { error: 'Dịch vụ email chưa được cấu hình' }, 503);

  const body = await req.json().catch(() => ({}));
  const email = String((body as any).email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(req, { error: 'Địa chỉ thư điện tử không hợp lệ' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: existing, error: lookupError } = await supabase
    .from('newsletter_subscribers')
    .select('id, unsubscribe_token, unsubscribed_at')
    .ilike('email', email)
    .maybeSingle();
  if (lookupError) return json(req, { error: 'Không kiểm tra được đăng ký' }, 500);

  // Không gửi lặp email chào mừng khi một địa chỉ đang hoạt động đăng ký lại.
  if (existing && !existing.unsubscribed_at) {
    return json(req, { subscribed: true, alreadySubscribed: true });
  }

  let subscriber = existing;
  if (existing) {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({
        unsubscribed_at: null,
        confirmed: true,
        confirmed_at: new Date().toISOString(),
        source: 'footer',
      })
      .eq('id', existing.id)
      .select('id, unsubscribe_token')
      .single();
    if (error) return json(req, { error: 'Không thể đăng ký lại' }, 500);
    subscriber = data;
  } else {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email,
        source: 'footer',
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      })
      .select('id, unsubscribe_token')
      .single();
    if (error) {
      // Che chi tiết database và trả kết quả trung tính nếu hai request đua nhau.
      if (error.code === '23505') return json(req, { subscribed: true, alreadySubscribed: true });
      return json(req, { error: 'Không lưu được đăng ký' }, 500);
    }
    subscriber = data;
  }

  const rssRes = await fetch(`${SITE_URL}/rss.xml`, { headers: { accept: 'application/xml' } });
  if (!rssRes.ok) return json(req, { subscribed: true, emailSent: false }, 202);
  const items = parseRssItems(await rssRes.text(), SITE_URL)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 5);
  if (items.length === 0) return json(req, { subscribed: true, emailSent: false }, 202);

  const unsubscribeUrl = `${UNSUB_BASE}?token=${subscriber.unsubscribe_token}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: `Chào mừng bạn — 5 bài mới nhất từ Công Nghệ Thường Nhật`,
      html: renderDigestHtml({
        items,
        siteUrl: SITE_URL,
        unsubscribeUrl,
        intro: 'Cảm ơn bạn đã đăng ký. Đây là 5 bài mới nhất; từ tuần sau, bạn sẽ nhận bản tin vào sáng Thứ Hai.',
      }),
      text: renderDigestText({ items, siteUrl: SITE_URL, unsubscribeUrl }),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Resend welcome email failed:', response.status, detail);
    return json(req, { subscribed: true, emailSent: false }, 202);
  }
  return json(req, { subscribed: true, emailSent: true }, 201);
});
