'use client';

import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

//全体の概要
// 現在のログイン状態（session）を監視し、未ログイン(session === nullを検出)で非公開ページに来たら ログインページ(/login?next=… )に自動リダイレクト、
// 逆にログイン済みで /login に居たら管理トップへ戻す Next.js 用ルートガードフックです。


//処理の流れ
// まず「今ログインしてる？」をフックでチェック。
// まだ分からない（判定中）なら何もしない。
// 未ログインで非公開ページに来たら、ログイン画面へ移動（元いたURLを next に付ける）。
// 逆にログイン済みでログイン画面に居たら、管理トップへ戻す。
// → つまり、**「見て良い人だけ通すドアマン」**の役割です。

//ログイン不要なパスのリスト
//ログイン不要ページ(必要に応じて調整)
const PUBLIC_ROUTES = new Set<string>(['/login', '/contact', '/']);


//必要な現在地（pathname・search）とセッション状態を取得。
export const useRouteGuard = () => {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  //useSupabaseSessionフックを呼び出して現在のログインセッションを取得する。
  //(undefined/null/objectのどれかが取得される)
  const { session } = useSupabaseSession();//三値: undefined / null / object

  useEffect(() => {
    //まだsessionがundefinedの場合は読み込み中なので何もしない
    if (session === undefined) return;//判定中は何もしない

    //未ログイン && 非公開ページ → /login?next=...
    //sessionがnull（ログインしていない状態）の場合は、
    // router.replace('/login')を実行してログインページにリダイレクトする。
    //未ログインかつ非公開ページならログインページへ
    if (session === null && !PUBLIC_ROUTES.has(pathname)) {
      const next = pathname + (search?.toString() ? `?${search.toString()}` : '');
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }

    //ログイン済みで /login(ログインページ)に居たら管理トップへ
    if (session && pathname === '/login') {
      router.replace('/admin');
    }
  }, [session,pathname,search, router]);//session,pathname,search, routerが変わるたびに上記ロジックを再評価する。
};

