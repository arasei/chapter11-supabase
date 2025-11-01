"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { useMemo, useState } from "react";
import { PostForm } from "../_components/PostForm";
import type { Post, CreatePost } from "@/app/_types/Post";
import { useApi } from '@/app/_hooks/useApi';


//全体の概要
//URL から取得した記事IDを使って記事データを API で取得し、
// フォームで内容を編集・削除できる管理用の Next.js クライアントページ

//記事編集ページ
//「IDで記事を引っ張ってきて、フォームで編集 or 削除して、終わったら一覧へ戻す」 ための標準的な管理画面

//処理の流れ
//URL の末尾から 記事ID を読み取り、
//その ID で 記事の現在データ を API から取ってきてフォームに入れ、
//ユーザーが内容を直して 更新ボタンで保存、または 削除ボタンで削除、
//完了したら 一覧ページ に戻る——という一連の流れを、エラー時の表示や送信中の抑止まで含めてまとめている。

type PostRes = { post: Post | null };


const EditPostPage: React.FC = () => {
  //動的ルートの id を取得→ローカル変数に格納。
  //URL の /admin/posts/[id]
  //URLから記事のIDを取得。動的ルートのパラメータを扱う
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();//ページ遷移を制御するためのルーターオブジェクトを取得。

  //認証付き API クライアント
  // /api を base に固定。/admin 配下は Bearer 付与を自動化
  const { api } = useApi("/api");
  const { mutate } = useSWRConfig();

  // ---- 取得（SWR） ----
  //SWR のキー：ID があれば /admin/posts/${id}、なければ null（フェッチ停止）
  const postKey = id ? `/admin/posts/${id}` : null;
  const { data, error, isLoading } = useSWR<PostRes>(
    postKey,
    //api.get → ステータス検査 → JSON 返却
    async (key: string) => {
      const res = await api.get(key);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`取得に失敗しました（${res.status}）${text ? `: ${text}` : ""}`);
      }
      return res.json();
    }
  );

  //取得データを PostForm 用の CreatePost 形に整形（メモ化）。
  // フォーム初期値（SWRの結果から生成）
  //フォームの initialData を毎レンダリング再生成しないため。
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

  //送信中フラグで多重送信を防止
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- 更新（PUT） ----
  //PUT で更新→一覧と詳細を mutate → 一覧へ遷移。
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
  //DELETE で削除→一覧を mutate → 一覧へ遷移。
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
  //早期リターンで状態別の表示。
  if (!id) return <p className="p-4">IDが不正です。</p>;
  if (isLoading) return <p className="p-4">読み込み中...</p>;
  if (error) return <p className="p-4 text-red-600">{error.message}</p>;
  if (!initialData) return <p className="p-4">データが見つかりませんでした。</p>;
  
  //PostForm に初期値とハンドラを渡して描画。送信中はボタン文言を変更。
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
