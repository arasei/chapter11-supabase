'use client';
//Client:ここでガードを呼ぶ

import Link from "next/link";
//現在のURLパス（例: /admin/posts）を取得するためのフック。
// 現在のページがどれかを判別して、ナビゲーションにハイライトを付けるために使う。
import { usePathname } from "next/navigation";
import { useRouteGuard } from "../_hooks/useRouteGuard";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";


//全体の概要
// 管理画面の共通レイアウト（サイドバー付き）で、
// ログイン状態をガードしつつ現在のURLに応じてメニュー(「記事一覧」または「カテゴリー一覧」)をハイライトし、
// 子コンテンツ(children)をメイン領域に描画するクライアントコンポーネント


//このコンポーネントは、「ログインしている人だけが使える管理画面の外枠」。
//左にメニュー、右にページの中身。
//URLを見て、今どのページか自動で色付けしてくれる。
//ログインしていない人は、この枠に入る前にログインページへ案内される

//処理の流れ
// まず「ログインしてる？」をチェック → してなければログイン画面へ。
// 判定中は「読み込み中…」だけ出してチラつきを防止。
// ログインしていれば、左にメニュー（記事一覧／カテゴリー一覧）、右に**各ページの中身（children）**が表示されます。
// URL に合わせて、該当メニューに青いハイライトが付きます。

//useApi は API を叩く各ページで使用（一覧/作成/編集など）。
//layout / AdminShell は API を叩かないのでuseApiは不要
//useRouteGuard() と useSupabaseSession() を使って認証制御。


//末尾のスラッシュ(/)を取って比較し、
// /admin/posts/* のようなネストURLでも親メニューをアクティブ(ハイライトできる様に)にする。
const normalize = (p: string) => (p.replace(/\/+$/, '') || '/');
const isActive = (base: string, current: string) => {
  const b = normalize(base);
  const c = normalize(current);
  if (b === '/') return c === '/';
  return c === b || c.startsWith(b + '/');
};


//管理画面のレイアウトコンポーネントを定義
//この外枠に入る全ての管理ページを一括でガード。
//children = このレイアウトの中に表示したいページの中身
export default function AdminShell({ children }: { children: React.ReactNode}) {
  //ここでルートガードを実行(Clientなので可能)
  //ガードはClientコンポーネントで呼ぶ
  useRouteGuard();

  //認証状態と現在のURLを取得。
  const { session, isLoading } = useSupabaseSession();
  const pathname = usePathname();//現在のパス（例: /admin/categories）を取得してリンクのハイライトに使う。

  //session判定中はレイアウトの骨格だけ出してチラつき防止
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <aside className="flex min-h-screen"/>
        <main className="flex-1 bg-white p-8">読み込み中...</main>
      </div>
    );
  }


  //未ログインなら何も描画しない（useRouteGuardが /loginに遷移中の為）。
  if (!session) return null;

  return (
    <div className="flex min-h-screen">
      {/* サイドバーエリア*/}
      <aside className="w-60 bg-gray-100">
        <nav aria-label="管理メニュー">
          <ul className="space-y-0">
            <li>
              {/*記事一覧ページへのリンク。現在のパスが /admin/posts の場合にだけ bg-blue-100 を付けてハイライトする*/}
              <Link
                href="/admin/posts"
                className={`block w-full py-4 px-4 ${isActive('/admin/posts', pathname) ? 'bg-blue-100' : ''}`}
                aria-current={isActive('/admin/posts', pathname) ? 'page' : undefined}
              >
                記事一覧
              </Link>
            </li>
            <li>
              {/*「カテゴリー一覧」のメニューリンクを作成。現在のURLが /admin/categories の場合はハイライトする*/}
              <Link
                href="/admin/categories"
                className={`block w-full py-4 px-4 ${isActive('/admin/categories', pathname) ? 'bg-blue-100' : ''}`}
                aria-current={isActive('/admin/categories', pathname) ? 'page' : undefined}
              >
                カテゴリー一覧
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* メイン表示エリア */}
      {/*children がこの <AdminSideBar> コンポーネント内に表示されます。*/}
      <main className="flex-1 bg-white p-8">{children}</main>
    </div>
  );
}
