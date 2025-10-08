"use client";

import { CategoryForm } from "../../posts/_components/CategoryForm";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApi } from '@/app/_hooks/useApi';

//全体の概要
//新しいカテゴリーを作成する為のページを表示するコンポーネント。
//CategoryFormコンポーネントを表示することで、ユーザーがカテゴリーを追加できる画面を構成している。
const CreateCategories: React.FC = () => {
  const router = useRouter();
  // /api をベースに固定（/admin 配下には Bearer トークンが自動付与されます）
  const { api } = useApi("/api");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert('カテゴリー名を入力してください');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    try {
      // ← headers/JSON.stringify は不要。ラッパが自動で付与します。
      const res = await api.post('/admin/categories', { name: trimmed });

      if (res.ok) {
        alert('カテゴリーを作成しました。');
        router.push('/admin/categories');//一覧へ戻す(不要の場合は削除可能)
      } else {
        const text = await res.text().catch(() => '');
        alert(`エラーが発生しました (${res.status}) ${text ? `: ${text}` : ''}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "通信エラーが発生しました";
      //未ログイン(トークン無し)やネットワークエラー時
      alert(msg);
      console.error('作成エラー:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold mb-4">カテゴリー作成</h1>
      <CategoryForm
        onSubmit={handleSubmit} 
        submitLabel="作成"
        disabled={isLoading}//送信中はボタン無効化
      />
    </div>
  );
};

export default CreateCategories;