'use client';

import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

//ログイン不要ページ(必要に応じて調整)
const PUBLIC_ROUTES = new Set<string>(['/login', '/contact', '/']);

//ログインしていないユーザー（session === null）を検出したら、
// 自動的に/loginページへリダイレクトさせるルートガード用のカスタムフック
//ログインしてないユーザーを/loginへ飛ばすルートガード

export const useRouteGuard = () => {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  //useSupabaseSessionフックを呼び出して現在のログインセッションを取得する。
  //(undefined/null/objectのどれかが取得される)
  const { session } = useSupabaseSession();//三値: undefined / null / object

  useEffect(() => {
    //sessionがundefinedの場合は読み込み中なので何もしない
    //まだセッション判定中なら何もしない
    if (session === undefined) return;

    //未ログイン && 非公開ページ → /login?next=...
    //sessionがnull（ログインしていない状態）の場合は、
    // router.replace('/login')を実行してログインページにリダイレクトする。
    //未ログインかつ非公開ページならログインへ
    if (session === null && !PUBLIC_ROUTES.has(pathname)) {
      const next = pathname + (search?.toString() ? `?${search.toString()}` : '');
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }

    //ログイン済みで /loginに居たら管理トップへ
    if (session && pathname === '/login') {
      router.replace('/admin');
    }
  }, [session,pathname,search, router]);//session,pathname,search, routerが変わるたびに上記ロジックを再評価する。
};

