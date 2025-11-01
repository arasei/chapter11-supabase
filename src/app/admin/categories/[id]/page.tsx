"use client";

//画面遷移
import { useParams, useRouter } from "next/navigation";
//編集中フラグ
import { useState } from "react";
//フォーム送信
import { CategoryForm } from "../../posts/_components/CategoryForm"
//API呼び出し
import { useApi } from '@/app/_hooks/useApi'
//再検証・キャッシュ更新
import useSWR, { mutate } from "swr";

//全体の概要
//URLパラメータから取得したカテゴリーIDをもとにAPI経由でカテゴリー情報を取得し、
// 管理者がそのカテゴリー名を編集または削除できるNext.jsのクライアントサイド管理ページ

//カテゴリー編集ページ」として動作します。
//ブログ管理画面で「カテゴリーを編集」ボタンを押すと開くような画面

//処理の流れ
//URLの末尾（/admin/categories/3）から カテゴリーID「3」 を取得。
//そのIDを使ってAPIに問い合わせ、今のカテゴリー名を取得。
//取得した名前をフォームの初期値として表示。
//管理者が新しい名前に変更して「更新」を押すと、PUT リクエストでサーバーに送信。
//成功したら「カテゴリー一覧」に戻り、画面を再読み込みして最新データを表示。
//「削除」ボタンを押せば確認ダイアログのあとに削除APIを呼び出し、一覧へ戻る。

//カテゴリーIDをもとに情報を取得し、管理者が編集または削除できるページ」
//ブログなどの管理画面でよく使う「編集フォームページ」の仕組みをNext.jsで実装したものです。



//APIレスポンスの型(簡易)
//category.nameを想定
//フォームの初期値に使う為
type CategoryRes = { category?: { name?: string }};

//カテゴリー編集(更新、削除)ページ
export default function EditCategoryPage () {
  // /admin/categories/[id]のidパラメータを取得
  //どのカテゴリーを編集するか判断・API参照に必要。
  const params = useParams<{ id:string }>();
  //ルートのIDを取得(例:/admin/categories/3の「3」を取得)(カテゴリーIDを取得、idはAPIへのリクエストに使用)
  //取り出したidを変数に格納
  const  id  = params?.id;
  //ページ遷移する為のルーターを取得(更新・削除成功後に一覧へ戻す)
  //更新・削除後に/admin/categoriesへリダイレクトするのに使用。
  const router = useRouter();
  //ベースURL /api 付きのAPIクライアントを取得。
  // /api をベースに、認証ヘッダーなどは useApi 側で自動付与
  const { api } = useApi("/api");// ← ここで /api を固定しておく
  
  //該当カテゴリーの現在値を取得し、フォーム初期値に使うため。
  const { data, error, isLoading } = useSWR<CategoryRes>(
    //id が取れたら /admin/categories/${id}（useApi の base=/api が前置するように）
    id ? `/admin/categories/${id}` : null,
    //api.get → ステータスチェック → r.json()を行う
    (key) => api.get(key).then((r) => {
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
      return r.json();
    }),
    { revalidateOnFocus: false }//フォーカス時の再検証を無効化
  );

  //処理中フラグ。
  //多重送信・多重削除を防止。
  const [busy, setBusy] = useState(false);


  //編集処理・更新(PUT)
  //フォーム送信時にPUTリクエストを送り、(空文字や多重送信を防ぎながら)成功すれば一覧画面へ遷移。
  const handleUpdate = async (newName: string) => {
    //trimで文字列の前後にある不要な空白を取り除く
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await api.put(`/admin/categories/${id}`, { name });
      if (!res.ok) throw new Error(`更新に失敗しました(${res.status})`);
      //mutateにより上記のput後、一覧を最新状態に自動更新する(再フェッチ)
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
  //確認ダイアログ後に削除、成功したら一覧再検証＆遷移。
  const handleDelete = async () => {
    if (busy || !confirm('本当に削除しますか？')) return;
    setBusy(true);
    try {
      //カテゴリー削除に成功時にはカテゴリー一覧画面に移動
      const res = await api.delete(`/admin/categories/${id}`);
      if (!res.ok) throw new Error(`削除に失敗しました(${res.status})`);
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

  //早期リターンでID未取得・ローディング・エラーの表示を分岐。
  if (!id) return <div className="p-4">IDが不正です。</div>;
  if (isLoading) return <div className="p-4">読み込み中...</div>
  if (error) return <div className="p-4 text-red-600">{String(error)}</div>

  //フォームの初期値。取得できなければ空文字。
  const defaultValue = data?.category?.name ?? '';


  //見出し＋フォーム。
  // 送信・削除ハンドラとボタン無効化を渡す。
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