"use client";

//ページ遷移用
import Link from "next/link";
//データ取得用
import useSWR from "swr";
//認証付きAPIラッパ
import { useApi } from '@/app/_hooks/useApi';

//全体の概要
//APIから取得したカテゴリー一覧を管理者に表示し、
// それぞれのカテゴリー編集ページへのリンクと新規作成ボタンを提供するNext.jsのクライアントサイド管理ページ

//「カテゴリー管理画面の一覧ページ」 
//管理者がどんなカテゴリーが登録されているかを確認し、必要に応じて編集や新規追加ができる

//処理の流れ
//ページを開くと、/admin/categories というAPIにアクセス。
//登録されているカテゴリー一覧を取得。
//一覧を画面に並べ、それぞれのカテゴリー名をクリックすると「編集ページ」へ移動。
//右上の「新規作成」ボタンから、新しいカテゴリー追加ページに進める。



//管理者専用のカテゴリーページ
//APIから返るカテゴリー要素の型を定義。
type Category = {
  id: number;
  name: string;
};

export default function AdminCategoriesPage() {
  ///api ベースURLのAPIクライアントを取得。( /admin配下はトークンが自動付与されます。)
  const { api } = useApi('/api');///apiをベースに固定。

  // fetcher は「キー（URL文字列）」を受け取り、api.get(key) で返す
  const { data, error, isLoading } = useSWR<{ categories: Category[] }>(
    //キー：/admin/categories を指定
    '/admin/categories',
    //api.get→ステータスチェック→json()
    (key: string) => api.get(key).then((r) => {
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
      return r.json();
    }),
    { revalidateOnFocus: false }//フォーカス時再検証OFF（必要に応じてON)
  );

  //ローディング／エラーの早期リターン。
  if (isLoading) return <div className="p-4">読み込み中…</div>;
  if (error) return <div className="p-4 text-red-600">{String(error)}</div>;

  //取得データの安全な取り出し（配列でなければ空配列に）。
  const categories = Array.isArray(data?.categories) ? data!.categories : [];


  
  return (
    //ヘッダー部と「新規作成」ボタン。
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-9 mt-2">
        <h1 className="text-lg font-bold mb-9 mt-2">カテゴリー一覧</h1>
        <Link href="/admin/categories/new" className="py-2 px-4 rounded-lg text-white bg-blue-700">
          新規作成
        </Link>
      </div>

      {/*条件分岐で「一覧 or 空表示」。*/}
      {/*一覧はmapでリンク化し編集ページへ。*/}
      {/* カテゴリーが1件以上ある場合の表示 */}
      {categories.length ? (
        //カテゴリー一覧配列をmapで1件ずつ繰り返し処理
        categories.map((c) => (
          //各カテゴリー名を表示し、クリックするとそのカテゴリー編集ページ(/admin/categories/{id})へ遷移するリンク
          <Link key={c.id} href={`/admin/categories/${c.id}`} className="block border-b py-4">
            <h2 className="font-black">{c.name}</h2>
          </Link>
        ))
      ) : (
        //カテゴリーが1件もない場合は「カテゴリーがありません」と表示
        <p>カテゴリーがありません</p>
      )}
    </div>
  );
}
