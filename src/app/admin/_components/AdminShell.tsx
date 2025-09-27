'use client';
//Client:ここでガードを呼ぶ

import Link from "next/link";
import { usePathname } from "next/navigation";//現在のURLパス（例: /admin/posts）を取得するためのフック。現在のページがどれかを判別して、ナビゲーションにハイライトを付けるために使う。
import { useRouteGuard } from "../_hooks/useRouteGuard";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";


//全体の概要
//管理画面のレイアウトを構成するためのサイドバー付きのReactコンポーネント。
//現在のURLに応じて「記事一覧」または「カテゴリー一覧」メニューにハイライトを付け、
//指定された子コンポーネント（children）をメインエリアに表示する。

//useApi は API を叩く各ページで使用（一覧/作成/編集など）。
//layout / AdminShell は API を叩かないので不要
////useRouteGuard() と useSupabaseSession() を使って認証制御。


// ネストURLでもハイライトできるように
const normalize = (p: string) => (p.replace(/\/+$/, '') || '/');
const isActive = (base: string, current: string) => {
  const b = normalize(base);
  const c = normalize(current);
  if (b === '/') return c === '/';
  return c === b || c.startsWith(b + '/');
};


//管理画面のレイアウトコンポーネントを定義
//children はこのレイアウトの中に表示したいコンテンツ
export default function AdminShell({ children }: { children: React.ReactNode}) {
  //ここでルートガードを実行(Clientなので可能)
  //ガードはClientコンポーネントで呼ぶ
  useRouteGuard();

  const { session, isLoading } = useSupabaseSession();
  const pathname = usePathname();//現在のパス（例: /admin/categories）を取得してリンクのハイライトに使う。

  //children=「このレイアウト内に表示したいページの中身」
  //判定中はチラつき防止
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <aside className="flex min-h-screen"/>
        <main className="flex-1 bg-white p-8">読み込み中...</main>
      </div>
    );
  }


  //未ログインはuseRouteGuardが /loginに遷移中なので描画しない
  if (!session) return null;

  return (
    <div className="flex min-h-screen">
      {/* サイドバー */}
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
