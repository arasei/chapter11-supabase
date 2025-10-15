"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { useMemo, useState } from "react";
import { PostForm } from "../_components/PostForm";
import type { Post, CreatePost } from "@/app/_types/Post";
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

  // /api を base に固定。/admin 配下は Bearer 付与を自動化
  const { api } = useApi("/api");
  const { mutate } = useSWRConfig();

  // ---- 取得（SWR） ----
  const postKey = id ? `/admin/posts/${id}` : null;
  const { data, error, isLoading } = useSWR<PostRes>(
    postKey,
    async (key: string) => {
      const res = await api.get(key);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`取得に失敗しました（${res.status}）${text ? `: ${text}` : ""}`);
      }
      return res.json();
    }
  );

  // フォーム初期値（SWRの結果から生成）
  const initialData: CreatePost | null = useMemo(() => {
    const p = data?.post;
    if (!p) return null;
    return {
      title: p.title,
      content: p.content,
      thumbnailImageKey: p.thumbnailImageKey,
      categories: p.postCategories.map((pc) => ({ id: pc.category.id })),
    };
  }, [data]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- 更新（PUT） ----
  const handleUpdate = async (payload: CreatePost) => {
    if (!id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.put(`/admin/posts/${id}`, payload);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`更新に失敗しました（${res.status}）${text ? `: ${text}` : ""}`);
      }
      // 一覧・詳細のキャッシュを更新
      mutate("/admin/posts");
      mutate(`/admin/posts/${id}`);
      alert("更新しました");
      router.push("/admin/posts");
    } catch (e: unknown) {
      console.error("更新処理エラー:", e);
      alert(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- 削除（DELETE） ----
  const handleDelete = async () => {
    if (!id || isSubmitting) return;
    if (!confirm("本当に削除しますか？")) return;

    setIsSubmitting(true);
    try {
      const res = await api.delete(`/admin/posts/${id}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`削除に失敗しました（${res.status}）${text ? `: ${text}` : ""}`);
      }
      // 一覧キャッシュを更新
      mutate("/admin/posts");
      alert("削除しました");
      router.push("/admin/posts");
    } catch (e: unknown) {
      console.error("削除処理エラー:", e);
      alert(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- 画面ステート ----
  if (!id) return <p className="p-4">IDが不正です。</p>;
  if (isLoading) return <p className="p-4">読み込み中...</p>;
  if (error) return <p className="p-4 text-red-600">{error.message}</p>;
  if (!initialData) return <p className="p-4">データが見つかりませんでした。</p>;

  return (
    <PostForm
      initialData={initialData}
      onSubmit={handleUpdate}
      onDelete={handleDelete}
      submitLabel={isSubmitting ? "更新中..." : "更新"}
      isSubmitting={isSubmitting}
    />
  );
};

export default EditPostPage;
