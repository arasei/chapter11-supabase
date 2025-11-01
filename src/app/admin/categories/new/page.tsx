"use client";

import { CategoryForm } from "../../posts/_components/CategoryForm";
//画面遷移
import { useRouter } from 'next/navigation';
//送信中フラグ
import { useState } from 'react';
//API呼び出し(認証付き)
import { useApi } from '@/app/_hooks/useApi';

//全体の概要
//ブログの管理画面で「新しいカテゴリーを追加するフォーム」
//管理者が新しいカテゴリー名を入力して送信すると、Supabaseの認証付きAPIを通じてカテゴリーを作成し、
// 作成完了後に一覧ページへ自動的に遷移するNext.jsのクライアントサイド管理ページ

//処理の流れ
//管理者が「カテゴリー名」を入力して「作成」ボタンを押すと、
//その名前がバックエンドAPIに送られて新しいカテゴリーが作られ、
//作成が成功すると「カテゴリー一覧」ページに戻る、という流れ

//「カテゴリー追加フォーム」と「APIへの登録処理」と「完了後の画面遷移」がセットになった管理用ページ

const CreateCategories: React.FC = () => {
  //ページ遷移を行うためのルーター取得。
  const router = useRouter();
  // /api をベースにした API クライアントを取得。
  // /admin 配下には Bearer トークンが自動付与されるように
  const { api } = useApi("/api");// /api をベースに固定
  //送信中フラグ
  //多重送信やボタンの無効化制御に使う
  const [isLoading, setIsLoading] = useState(false);

  //CategoryFormから渡される送信ハンドラ。
  const handleSubmit = async (name: string) => {
    //trimで文字列の前後空白除去
    //空チェック
    //二重送信防止
    const trimmed = name.trim();
    if (!trimmed) {
      alert('カテゴリー名を入力してください');
      return;
    }
    if (isLoading) return;

    //送信開始→POST。
    setIsLoading(true);
    try {
      //useApi が Content-Type/Authorization を自動付与。(headers/JSON.stringify は不要。)
      //毎回ヘッダーや JSON.stringify を書かなくて済む。
      const res = await api.post('/admin/categories', { name: trimmed });

      //HTTP 成功/失敗で分岐し、成功時は一覧へ遷移。
      if (res.ok) {
        alert('カテゴリーを作成しました。');
        router.push('/admin/categories');//一覧へ戻す
      } else {
        const text = await res.text().catch(() => '');
        alert(`エラーが発生しました (${res.status}) ${text ? `: ${text}` : ''}`);
      }
    // ネットワークエラー・ラッパ内部エラーを捕捉し、最後にフラグ解除。
    //例外が発生しても UI を復帰させるため。
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "通信エラーが発生しました";
      //未ログイン(トークン無し)やネットワークエラー時
      alert(msg);
      console.error('作成エラー:', e);
    } finally {
      setIsLoading(false);
    }
  };

  //見出し＋フォーム。
  // 送信ハンドラと disabled を渡す。
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