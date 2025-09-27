"use client";

import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CategoryForm } from "../../posts/_components/CategoryForm"
import { useApi } from '@/app/_hooks/useApi'

//全体の概要
//このコードは、特定のカテゴリーの情報をAPIから取得し、
//管理者がそのカテゴリー名を編集・削除できる機能を提供するNext.jsのクライアントコンポーネントです。

type CategoryRes = { category?: { name?: string }};

//カテゴリー編集(更新、削除)ページ
const EditCategoryPage: React.FC = () => {
  // /admin/categories/[id]のid
  const params = useParams<{ id:string }>();
  //ルートのIDを取得(例:/admin/categories/3の「3」を取得)(カテゴリーIDを取得、idはAPIへのリクエストに使用)
  const  id  = params?.id;
  const router = useRouter();//ページ遷移を制御する為のフック。更新・削除後に/admin/categoriesへリダイレクトするのに使用。
  // /api/admin/*へはJWTを自動付与して fetch
  const { apiFetch } = useApi();
  const [name, setName] = useState("");//初期値は空
  const [isLoading, setIsLoading] = useState(false);
  const [ initialLoading, setInitialLoading] = useState(true);

  //カテゴリー名をAPIから取得(初回のみ)(認証付き)
  useEffect(() => {
    if (!id) return;//idがundefinedの場合、処理を中止
    const ac = new AbortController();

    (async () => {
      try {
        setInitialLoading(true);
        const res = await apiFetch(`/api/admin/categories/${id}`, { signal: ac.signal });
        if (!res.ok) throw new Error(`取得失敗 (${res.status})`);
        const data: CategoryRes = await res.json();
        setName(data.category?.name ?? '');
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.error('カテゴリー取得エラー:',e);
        alert('カテゴリー情報の取得に失敗しました');
      }finally {
        setInitialLoading(false);
      }
    })();
    return () => ac.abort();
  }, [id, apiFetch]);

  //編集処理(PUT)
  //フォーム送信時にPUTリクエストを送り、成功すれば一覧画面へ遷移。
  const handleUpdate = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      alert('カテゴリー名を入力してください');
      return;
    }
    setIsLoading(true);//開始時にtrue
    
    try {
      const res = await apiFetch(`/api/admin/categories/${id}`,{
        method: "PUT",
        headers: {"Content-Type": "application/json"},//json形式で送る
        body: JSON.stringify({ name:trimmed }),
      });

      if (!res.ok) {
        alert("カテゴリーを更新しました");
        router.push("/admin/categories");//指定したURL(ここではカテゴリー一覧)に画面遷移する為の関数
      } else {
        const text = await res.text().catch(() => '');
        alert(`更新に失敗しました。(${res.status}) ${text ? `: ${text}` : ''}`);
      }
    } catch (error) {
      console.error("更新処理エラー:",error);
      alert("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  //削除処理(DELETE)
  const handleDelete = async () => {
    const ok = confirm("本当に削除してもよろしいですか？");//ユーザーに確認ポップアップを出す
    if (!ok) return;//okでない場合(キャンセルされたら=falseされたら)その時点で関数の処理を終了する(何もしない)
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/admin/categories/${id}`,{
        method: "DELETE",
      });
      //カテゴリー削除に成功時にはカテゴリー一覧画面に移動
      if(res.ok) {
        alert("カテゴリーを削除しました");
        router.push("/admin/categories");//新しいURLを履歴に追加してページ遷移する(前のページに戻れる)
      } else {
        const text = await res.text().catch(() => '');
        alert(`削除に失敗しました。 (${res.status}）${text ? `: ${text}` : ''}`);
      }
      //エラーハンドリングとして例外処理(try-catch)を実施
    } catch (error) {
      console.error("削除処理エラー:",error);
      alert("通信エラーが発生しました");
    } finally {
      setIsLoading (false);
    }
  };

  if (!id) return <div className="p-4">IDが不正です。</div>;
  if (initialLoading) return <div className="p-4">読み込み中…</div>;

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold mb-4">
        カテゴリー編集
      </h1>

      <CategoryForm
        onSubmit={handleUpdate}
        onDelete={handleDelete}
        defaultValue={name}
        submitLabel="更新"
        disabled={isLoading}
      />
    </div>
  );
};

export default EditCategoryPage;