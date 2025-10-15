"use client";

import Link from "next/link";
import useSWR from "swr";
import { useApi } from '@/app/_hooks/useApi';

//全体の概要
//管理者専用のカテゴリー一覧ページを実装し、APIから取得したカテゴリーを一覧表示し、
// それぞれの編集ページへのリンクを提供するNext.jsのクライアントコンポーネント
//データ取得を SWR に移行

//管理者専用のカテゴリーページ
type Category = {
  id: number;
  name: string;
};

export default function AdminCategoriesPage() {
  // /apiをベースに固定。/admin配下はトークンが自動付与されます。
  const { api } = useApi('/api');

  // fetcher は「キー（URL文字列）」を受け取り、api.get(key) で返す
  const { data, error, isLoading } = useSWR<{ categories: Category[] }>(
    '/admin/categories',
    (key: string) => api.get(key).then((r) => {
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
      return r.json();
    }),
    { revalidateOnFocus: false }
  );

  if (isLoading) return <div className="p-4">読み込み中…</div>;
  if (error) return <div className="p-4 text-red-600">{String(error)}</div>;

  const categories = Array.isArray(data?.categories) ? data!.categories : [];

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-9 mt-2">
        <h1 className="text-lg font-bold mb-9 mt-2">カテゴリー一覧</h1>
        <Link href="/admin/categories/new" className="py-2 px-4 rounded-lg text-white bg-blue-700">
          新規作成
        </Link>
      </div>

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
