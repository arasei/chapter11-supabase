"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryForm } from "../../posts/_components/CategoryForm"
import { useApi } from '@/app/_hooks/useApi'
import useSWR, { mutate } from "swr";

//全体の概要
//このコードは、特定のカテゴリーの情報をAPIから取得し、
//管理者がそのカテゴリー名を編集・削除できる機能を提供するNext.jsのクライアントコンポーネントです。

type CategoryRes = { category?: { name?: string }};

//カテゴリー編集(更新、削除)ページ
export default function EditCategoryPage () {
  // /admin/categories/[id]のid
  const params = useParams<{ id:string }>();
  //ルートのIDを取得(例:/admin/categories/3の「3」を取得)(カテゴリーIDを取得、idはAPIへのリクエストに使用)
  const  id  = params?.id;
  const router = useRouter();//ページ遷移を制御する為のフック。更新・削除後に/admin/categoriesへリダイレクトするのに使用。
  // /api をベースに、認証ヘッダーなどは useApi 側で自動付与
  const { api } = useApi("/api");// ← ここで /api を固定しておく
  
  const { data, error, isLoading } = useSWR<CategoryRes>(
    id ? `/admin/categories/${id}` : null,
    (key) => api.get(key).then((r) => {
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
      return r.json();
    }),
    { revalidateOnFocus: false }
  );


  const [busy, setBusy] = useState(false);


  //編集処理(PUT)
  //フォーム送信時にPUTリクエストを送り、成功すれば一覧画面へ遷移。
  const handleUpdate = async (newName: string) => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await api.put('/admin/categories/${id}', { name });
      if (!res.ok) throw new Error('更新に失敗しました(${res.status})');
      //一覧のキャッシュも更新したい場合にキーを指定して再検証
      mutate('/admin/categories');
      alert('カテゴリーを更新しました')
      router.push('/admin/categories')//指定したURL(ここではカテゴリー一覧)に画面遷移する為の関数
    } catch(e: any) {
      alert(e?.message ?? '通信エラー');
    } finally {
      setBusy(false);
    }
  };

  //削除処理(DELETE)
  const handleDelete = async () => {
    if (busy || !confirm('本当に削除しますか？')) return;
    setBusy(true);
    try {
      //カテゴリー削除に成功時にはカテゴリー一覧画面に移動
      const res = await api.delete('/admin/categories/${id}');
      if (res.ok) throw new Error('削除に失敗しました(${res.status})');
      mutate('/admin/categories');
      alert('削除しました');
      router.push('/admin/categories')
    } catch (e: any) {
      //エラーハンドリングとして例外処理(try-catch)を実施
      alert(e?.message ?? '通信エラー')
    } finally {
      setBusy(false);
    }
  };

  if (!id) return <div className="p-4">IDが不正です。</div>;
  if (isLoading) return <div className="p-4">読み込み中...</div>
  if (error) return <div className="p-4 text-red-600">{String(error)}</div>

  const defaultValue = data?.category?.name ?? '';

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold mb-4">カテゴリー編集</h1>
      <CategoryForm
        defaultValue={defaultValue}
        onSubmit={handleUpdate}
        onDelete={handleDelete}
        submitLabel="更新"
        disabled={busy}
      />
    </div>
  );
};