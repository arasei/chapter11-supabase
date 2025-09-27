"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from '@/app/_hooks/useApi';

//全体の概要
//管理者専用のカテゴリー一覧ページを実装し、APIから取得したカテゴリーを一覧表示し、
// それぞれの編集ページへのリンクを提供するNext.jsのクライアントコンポーネント

type Category = {
  id: number;
  name: string;
};
//カテゴリー一覧ページ
const AdminCategoriesPage: React.FC = () => {
  const { apiFetch } = useApi();///api/admin 配下はトークン自動付与
  const [categories, setCategories] = useState<Category[]>([]);//Category型の配列でstateを管理する、初期値は空配列
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  //初回レンダリング時にtokenの値が取得された時(ログイン完了など)fetchCategoriesが実行されAPIからカテゴリー一覧を取得
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await apiFetch('/api/admin/categories', { signal: ac.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`取得に失敗しました（${res.status}）${text ? `: ${text}` : ''}`);
        }

        const data = await res.json();
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.error('カテゴリー取得エラー:', e);
        setErrorMsg(e?.message ?? 'カテゴリーの取得に失敗しました');
        setCategories([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [apiFetch]);

  if (loading) return <div className="p-4">読み込み中…</div>;


  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-9 mt-2">
        <h1 className="text-lg font-bold mb-9 mt-2">カテゴリー一覧</h1>
        <Link
          href="/admin/categories/new"
          className="py-2 px-4 border  rounded-lg  text-white bg-blue-700"
        >
          新規作成
        </Link>
      </div>

      {errorMsg && <p className="text-red-600">{errorMsg}</p>}

      {/* カテゴリーが1件以上ある場合の表示 */}
      <div>
        {categories.length > 0 ? (
          //カテゴリー一覧配列をmapで1件ずつ繰り返し処理
          categories.map((category) => (
            //各カテゴリー名を表示し、クリックするとそのカテゴリー編集ページ(/admin/categories/{id})へ遷移するリンク
            <Link
              key={category.id}
              href={`/admin/categories/${category.id}`}
              className="block border-b border-gray-300 py-4"
            >
              <h2 className="font-black">{category.name}</h2>
            </Link>
          ))
        ) : (
          //カテゴリーが1件もない場合は「カテゴリーがありません」と表示
          <p>カテゴリーがありません</p>
        )}
      </div>
    </div>
  );
};
export default AdminCategoriesPage;