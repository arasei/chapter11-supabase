"use client";

import { CategoryForm } from "../../posts/_components/CategoryForm";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApi } from '@/app/_hooks/useApi';


//新しいカテゴリーを作成する為のページを表示するコンポーネント。
//CategoryFormコンポーネントを表示することで、ユーザーがカテゴリーを追加できる画面を構成している。
const CreateCategories: React.FC = () => {
  const router = useRouter();
  const { apiFetch } = useApi();///api/admin 配下はトークン自動付与
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert('カテゴリー名を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch('/api/admin/categories',{
        method: 'POST',
        headers: {'Content-Type': 'application/json' },
        body: JSON.stringify({ name:trimmed }),
      });

      if (res.ok) {
        alert('カテゴリーを作成しました。');
        router.push('/admin/categories');//一覧へ戻す(不要の場合は削除可能)
      } else {
        const text = await res.text().catch(() => '');
        alert(`エラーが発生しました (${res.status}) ${text ? `: ${text}` : ''}`);
      }
    } catch (e: any) {
      //未ログイン(トークン無し)やネットワークエラー時
      alert(e?.message ?? '通信エラーが発生しました');
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