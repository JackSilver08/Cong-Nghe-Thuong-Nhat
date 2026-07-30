import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const allowedOrigins = new Set([
  'https://newshub-jack.netlify.app',
  'https://congnghethuongnhat.netlify.app',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  Deno.env.get('SITE_URL') ?? '',
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
  'access-control-allow-origin': allowedOrigins.has(origin) ? origin : 'https://congnghethuongnhat.netlify.app',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'vary': 'Origin',
  };
};

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'content-type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Chỉ chấp nhận POST.' }, 405);

  const authorization = req.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return json(req, { error: 'Bạn chưa đăng nhập.' }, 401);

  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: callerData, error: callerError } = await authClient.auth.getUser(token);
  if (callerError || !callerData.user) return json(req, { error: 'Phiên đăng nhập không hợp lệ.' }, 401);

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .maybeSingle();
  if (callerProfile?.role !== 'admin') return json(req, { error: 'Chỉ admin được quản lý tài khoản.' }, 403);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? '');
  const userId = String(body.userId ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return json(req, { error: 'Tài khoản không hợp lệ.' }, 400);

  const { data: targetProfile, error: targetError } = await adminClient
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .maybeSingle();
  if (targetError || !targetProfile) return json(req, { error: 'Không tìm thấy tài khoản.' }, 404);

  if (action === 'role') {
    const role = String(body.role ?? '');
    const allowedRoles = new Set(['user', 'author', 'editor', 'moderator', 'admin']);
    if (!allowedRoles.has(role)) return json(req, { error: 'Vai trò không hợp lệ.' }, 400);
    if (targetProfile.role === role) return json(req, { ok: true, message: 'Quyền không thay đổi.' });

    if (targetProfile.role === 'admin' && role !== 'admin') {
      const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((count ?? 0) <= 1) {
        return json(req, { error: 'Không thể hạ quyền quản trị viên cuối cùng.' }, 409);
      }
    }

    const { error } = await adminClient.from('profiles').update({ role }).eq('id', userId);
    if (error) return json(req, { error: error.message }, 400);
    await adminClient.from('admin_audit_logs').insert({
      actor_id: callerData.user.id,
      target_user_id: userId,
      action: 'user.role_changed',
      old_value: { role: targetProfile.role },
      new_value: { role },
    });
    return json(req, { ok: true, message: 'Đã cập nhật quyền tài khoản.' });
  }

  if (action === 'password') {
    const password = String(body.password ?? '');
    if (password.length < 8 || password.length > 72) {
      return json(req, { error: 'Mật khẩu phải có từ 8 đến 72 ký tự.' }, 400);
    }
    const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (error) return json(req, { error: error.message }, 400);
    return json(req, { ok: true, message: `Đã đổi mật khẩu cho ${targetProfile.email ?? 'tài khoản'}.` });
  }

  if (action === 'delete') {
    if (targetProfile.role === 'admin') return json(req, { error: 'Không thể xóa tài khoản admin.' }, 403);
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return json(req, { error: error.message }, 400);
    return json(req, { ok: true, message: 'Đã xóa tài khoản.' });
  }

  return json(req, { error: 'Thao tác không được hỗ trợ.' }, 400);
});
