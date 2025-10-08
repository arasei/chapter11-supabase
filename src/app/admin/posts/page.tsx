"use client";


import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/app/_hooks/useApi";
import type { Post } from "@/app/_types/Post";// DTO型を使い回し



//全体の概要
// このコンポーネントは、Supabase の認証トークンを使ってログイン中の管理者だけがアクセスできる記事一覧ページを表示し、
// 記事ごとにリンク付きで詳細ページに飛べるようにする管理画面機能です。
//このページは、「未ログイン状態で叩くと apiFetch が例外→エラーメッセージ表示」になる。
//JWT 付与済み apiFetch で /api/admin/posts を取得して一覧表示。
// 未ログイン/権限なしはエラーメッセージを表示。Abortも安全に処理。


//記事一覧ページ
const AdminPostPage: React.FC = () => {
  // /api を base に固定。/admin 配下は Bearer トークンが自動付与されます
  const { api } = useApi("/api");
  const [posts, setPosts] = useState<Post[]>([]);//初期値は空配列に。空配列なら.map()が正常に動作し何も表示されないだけで済むため安全。
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // apiFetch → api.get に変更（/api は付けない）
        const res = await api.get("/admin/posts", { signal: ac.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (res.status === 401) throw new Error("未ログインです（401）。");
          if (res.status === 403) throw new Error("アクセス権限がありません（403）。");
          throw new Error(`取得に失敗しました（${res.status}）${text ? `: ${text}` : ""}`);
        }

        const data: unknown = await res.json();
        // 不正形式でも安全に
        // 安全に配列かを判定してセット
        const list = (data as { posts?: unknown }).posts;
        setPosts(Array.isArray(list) ? (list as Post[]) : []);
      } catch (e: unknown) {
        // アンマウント時などの中断は無視
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("記事取得エラー:", e);
        setErrorMsg(e instanceof Error ? e.message : "記事取得でエラーが発生しました。");
        setPosts([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [api.get]);//[api]依存だと毎回実行されて無限取得になるのを防ぐ為[api.get]に

  if (loading) {
    return <div className="p-4">読み込み中...</div>
  }


  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-9 mt-2">
        <h1 className="text-lg font-bold mb-9 mt-2">記事一覧</h1>
        <Link
          href="/admin/posts/new"
          className="py-2 px-4 border rounded-lg text-white bg-blue-700"
        >
          新規作成
        </Link>
      </div>

      {errorMsg && <p className="text-red-600">{errorMsg}</p>}

      <div>
        {/*記事が1件以上ある場合の表示*/}
        {posts.length > 0 ?(
          posts.map((post) => (
            //各記事を順番に表示
            <div key={post.id}>
              <Link href={`/admin/posts/${post.id}`}>
                <h2 className="font-black">{post.title}</h2>
              </Link>
              <p>
                {new Date(post.createdAt).toLocaleDateString("ja-JP")}
              </p>
            </div>
          ))
        ) : (
          //記事がない場合の表示
          <p>記事がありません</p>
        )}
      </div>
    </div>
  );
};

export default AdminPostPage;