//app/api/_lib/auth.ts

//全体の概要
//フロントから送られた Authorization: Bearer <token> を取り出して Supabase で検証し、
// 正しければユーザー情報を返し、不正なら 401 を返す共通ガードと、
// 任意でユーザーのロールを検査して 403 を返せる補助関数を提供するサーバー側ユーティリティ

//フロントから送った Authorization: Bearer <token> をサーバーで検証 → OKなら処理、NGなら 401/403
//ヘッダーから Bearer を抜く → supabase.auth.getUser(token) で検証（トークンが無効/期限切れならエラー）
//共通のガード


import { createClient, type User } from "@supabase/supabase-js";


//サーバー用 Supabase クライアント(公開鍵でOK)(※ service_role は絶対に使わない）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

//どんなリクエストでも「headers を持っていれば OK」にする（Request/NextRequest両対応）
//type ReqLike = { headers: Headers } によって Request / NextRequest どちらでもそのまま渡せる（as any 不要）。
type ReqLike = { headers: Headers };

//Authorization: Bearer <token> を取り出す
//Authorization ヘッダから Bearer トークンを取り出す（大小文字や余分な空白に強い）
function getBearerFromHeaders(headers: Headers): string | null {
  const raw = headers.get("authorization") ?? headers.get("Authorization");
  if (!raw) return null;
  const [scheme, token] = raw.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

//必須: ログイン済みチェック
export async function requireUser(
  req: ReqLike
): Promise<{ user: User; token: string } | { error: string; status: 401 }> {
  const token = getBearerFromHeaders(req.headers);
  if (!token) return { error: "Missing Authorization header", status: 401 as const };


  //Supabase にトークン検証を委譲する（期限切れ/不正はここで弾かれる）
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { error: 'Invalid or expired token', status: 401 as const };
  }
  return { user: data.user, token };
}

//任意: 役割（ロール）での制限
export function assertRole(
  user: User,
  role: string
): { ok: true } | { error: string; status: 403 } {
  const r = (user.user_metadata?.role as string | undefined) ?? '';
  if (r !== role) return { error: 'Forbidden', status: 403 as const };
  return { ok: true };
}