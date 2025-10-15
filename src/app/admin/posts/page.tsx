"use client";


import Link from "next/link";
import useSWR from "swr";
import { useApi } from "@/app/_hooks/useApi";
import type { Post } from "@/app/_types/Post";// DTO型を使い回し



//全体の概要
// このコンポーネントは、Supabase の認証トークンを使ってログイン中の管理者だけがアクセスできる記事一覧ページを表示し、
// 記事ごとにリンク付きで詳細ページに飛べるようにする管理画面機能です。
//このページは、「未ログイン状態で叩くと apiFetch が例外→エラーメッセージ表示」になる。
//JWT 付与済み apiFetch で /api/admin/posts を取得して一覧表示。
// 未ログイン/権限なしはエラーメッセージを表示。Abortも安全に処理。



export default function AdminPostPage() {
  const { api } = useApi('/api');

  const { data, error, isLoading } = useSWR<{ posts: Post[] }>(
    '/admin/posts',
    (key) => api.get(key).then((r) => {
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
      return r.json();
    }),
    { revalidateOnFocus: false }
  );

  if (isLoading) return <div className="p-4">読み込み中...</div>;
  if (error) return <div className="p-4 text-red-600">{String(error)}</div>;

  const posts = Array.isArray(data?.posts) ? data!.posts : [];

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-9 mt-2">
        <h1 className="text-lg font-bold mb-9 mt-2">記事一覧</h1>
        <Link href="/admin/posts/new" className="py-2 px-4 border rounded-lg text-white bg-blue-700">
          新規作成
        </Link>
      </div>

      {posts.length ? (
        posts.map((post) => (
          <div key={post.id}>
            <Link href={`/admin/posts/${post.id}`}>
              <h2 className="font-black">{post.title}</h2>
            </Link>
            <p>{new Date(post.createdAt).toLocaleDateString('ja-JP')}</p>
          </div>
        ))
      ) : (
        <p>記事がありません</p>
      )}
    </div>
  );
}
