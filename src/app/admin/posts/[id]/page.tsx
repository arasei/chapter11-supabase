"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PostForm } from "../_components/PostForm";
import { Post, CreatePost } from "@/app/_types/Post";
import { useApi } from '@/app/_hooks/useApi';


//全体の概要
//管理者が特定の記事の内容を取得し、フォームで編集・削除できるページを実装したコード

type PostRes = { post: Post | null };


const EditPostPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  //URL の /admin/posts/[id]
  //URLから記事のIDを取得。動的ルートのパラメータを扱う
  const id = params?.id;
  const router = useRouter();//ページ遷移を制御するためのルーターオブジェクトを取得。


  const { apiFetch } = useApi();//api/admin 配下は JWT を自動付与して fetch

  //編集フォームに初期表示する記事データをstateで管理。初期値はnull（未取得状態）
  const [initialData, setInitialData] = useState<CreatePost | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); //送信中状態を管理
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    //AbortController を追加し、アンマウント時のリクエスト競合を回避
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await apiFetch(`/api/admin/posts/${id}`, { signal: ac.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`取得に失敗しました (${res.status}) ${text ? `: ${text}` : ''}`);
        }

        const data: PostRes = await res.json();
        const post = data.post;

        if (!post) {
          setInitialData(null);
          setErrorMsg("データが見つかりませんでした。");
          return;//ここで早期リターン
        }

        setInitialData({
          title: post.title,
          content: post.content,
          thumbnailImageKey: post.thumbnailImageKey,
          categories: post.postCategories.map((pc) => ({ id: pc.category.id })),
        });
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('記事取得エラー:', e);
        setErrorMsg(e instanceof Error ? e.message : '記事の取得に失敗しました');
        setInitialData(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [id, apiFetch]);

  //更新(PUT)
  const handleUpdate = async (data: CreatePost) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json' },
        body: JSON.stringify(data),// data.thumbnailImageKey を送る
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`更新に失敗しました(${res.status}) ${text ? `: ${text}` : ''}`);
      }
      alert('更新しました');
      router.push('/admin/posts');
    } catch (e: unknown) {
      console.error('更新処理エラー:', e);
      alert(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  //削除(DELETE)
  const handleDelete = async () => {
    if (isSubmitting) return;
    const ok = confirm('本当に削除しますか？');
    if (!ok) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`削除に失敗しました (${res.status}) ${text ? `: ${text}` : ''}`);
      }
      alert('削除しました');
      router.push('/admin/posts');
    } catch (e: unknown) {
      console.error('削除処理エラー:', e);
      alert(e instanceof Error ? e.message : '削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!id) return <p className="p-4">IDが不正です。</p>;
  if (loading) return <p className="p-4">読み込み中...</p>;
  if (errorMsg) return <p className="p-4 text-red-600">{errorMsg}</p>;
  if (!initialData) return <p className="p-4">データが見つかりませんでした。</p>;

  return (
    <PostForm
      initialData={initialData}
      onSubmit={handleUpdate}
      onDelete={handleDelete}
      submitLabel={isSubmitting ? '更新中...' : '更新'}
      isSubmitting={isSubmitting}
    />
  );
};

export default EditPostPage;
