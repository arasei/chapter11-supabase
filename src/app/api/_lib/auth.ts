//app/api/_lib/auth.ts

//全体の概要
//フロントから送られた Authorization: Bearer <token> を取り出して Supabase で検証し、
// 正しければユーザー情報を返し、不正なら 401 を返す共通ガードと、
// 任意でユーザーのロールを検査して 403 を返せる補助関数を提供するサーバー側ユーティリティ

//フロントから送った Authorization: Bearer <token> をサーバーで検証 → OKなら処理、NGなら 401/403
//ヘッダーから Bearer を抜く → supabase.auth.getUser(token) で検証（トークンが無効/期限切れならエラー）
//共通のガード

import { NextRequest } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

//サーバー用 Supabase クライアント(公開鍵でOK)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

//Authorization: Bearer <token> を取り出す
function getBearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice(7);
}

//必須: ログイン済みチェック
export async function requireUser(req: NextRequest): Promise<
  | { user: User; token: string }
  | { error: string; status: 401 | 400 }
> {
  const token = getBearer(req);
  if (!token) return { error: 'Missing Authorization header', status: 401 };

  //Supabase にトークン検証を委譲する（期限切れ/不正はここで弾かれる）
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { error: 'Invalid or expired token', status: 401 };
  }
  return { user: data.user, token };
}

//任意: 役割（ロール）での制限
export function assertRole(user: User, role: string): { ok: true } | { error: string; status: 403 } {
  const r = (user.user_metadata?.role as string | undefined) ?? '';
  if (r !== role) return { error: 'Forbidden', status: 403 };
  return { ok: true };
}