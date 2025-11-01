
//app/admin/layout.tsxはServer Componentとして扱う('use client'は付けない)

//AdminShell は管理画面の見た目全体（ヘッダーやサイドバーなど）を包む UI コンポーネント。
import AdminShell from './_components/AdminShell';


//全体の概要
// 管理画面全体の共通レイアウト（枠）を提供する Server Component であり、
// useRouteGuard やフック類を使わず、
// 純粋に見た目の構造だけを定義しているコンポーネントです。

//layoutは"枠"だけ。デザインの箱だけを作る役割
// 「管理画面ページの外枠をサーバー側で描くだけの“箱”。
// 中身（ページの中身）は後で子コンポーネントが入る。」

//フックを使う“ロジック”の部分は子コンポーネントやページ側に任せ、
// フックは一切使わない=Router未マウント問題を回避する為。

//useApi は API を叩く各ページで使用（一覧/作成/編集など）。
// layout / AdminShell は API通信をしないのでuseApiをimport不要

//Next.js × Supabase の管理画面を作る上での構成について
// (layout.tsx＝枠、AdminShell＝UI、useRouteGuard＝認証、useApi＝通信)

//処理の流れ
// 'use client' を付けない → Server Component 扱い
// レイアウトの外枠（ヘッダー・サイドバーなど）を AdminShell に委ねる
// 中身（children）に各ページ（一覧・編集など）を差し込む
// フックは呼ばない → サーバーで安全に動く

export default function AdminLayout({ children }: {children:React.ReactNode }) {
  //認証チェック (useRouteGuard) はページ側で呼ぶ。ここでは絶対に呼ばない
  //children に /admin/* 配下のページが入る（一覧、投稿作成など）。
  //それらを AdminShell で包み、共通の外枠を提供する。
  return <AdminShell>{children}</AdminShell>;
}
