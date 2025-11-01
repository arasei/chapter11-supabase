"use client";


import Link from "next/link";//ページ遷移用
import useSWR from "swr";//データ取得用
import { useApi } from "@/app/_hooks/useApi";//認証付きAPIラッパ
import type { Post } from "@/app/_types/Post";//記事の型(DTO型を使い回し)



//全体の概要
// 認証付きAPIから記事一覧を取得して表示し、
// 各記事の編集ページと新規作成ページへ移動できる、管理者向けのNext.jsクライアントページ。

//イメージ
// 管理者が記事を確認・管理するための一覧ページです。
// ブログの「管理画面トップ」のような役割

//処理の流れ
//ページを開くと、まずAPIから記事一覧を取得します。
//取得できたら、タイトルと作成日を並べて表示し、タイトルをクリックすると編集ページへ移動できます。
//右上の**「新規作成」**ボタンから、新しい記事を作るページへ移動できます。
//読み込み中は「読み込み中…」を、失敗したらエラーメッセージを表示します。



export default function AdminPostPage() {
  // /apiベースURLで認証付きのAPIクライアントを取得。
  const { api } = useApi('/api');
  //SWRの設定
  // キー：/admin/posts（一覧API）
  // フェッチャ：api.get → ステータス確認 → JSON返却
  // オプション：フォーカス時の自動再取得をオフ
  const { data, error, isLoading } = useSWR<{ posts: Post[] }>(
    '/admin/posts',
    (key) => api.get(key).then((r) => {
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
      return r.json();
    }),
    { revalidateOnFocus: false }
  );

  //状態分岐でローディング・エラーを早期リターン表示。
  if (isLoading) return <div className="p-4">読み込み中...</div>;
  if (error) return <div className="p-4 text-red-600">{String(error)}</div>;

  //Array.isArray()で安全に配列を取り出し、無ければ空配列に。
  //Array.isArray() : その値が配列かどうかを安全に確認する関数
  const posts = Array.isArray(data?.posts) ? data!.posts : [];

  return (
    //ヘッダー部分
    // タイトルと「新規作成」ボタン。
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-9 mt-2">
        <h1 className="text-lg font-bold mb-9 mt-2">記事一覧</h1>
        <Link href="/admin/posts/new" className="py-2 px-4 border rounded-lg text-white bg-blue-700">
          新規作成
        </Link>
      </div>

      {/*一覧表示*/}
      {/*記事があるときは map で並べ、タイトルをクリックで編集ページへ。なければ空表示。*/}
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
