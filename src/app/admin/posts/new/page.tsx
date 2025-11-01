"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";//ページの移動(リダイレクト用)
import { PostForm } from "../_components/PostForm";//記事作成フォームの共通パーツ。新規作成・編集で再利用。
import { CreatePost } from "@/app/_types/Post";//投稿データの型定義(CreatePost)。型安全にデータを扱うため。
import { useApi } from "@/app/_hooks/useApi";//APIと通信するための共通フック(自動で認証情報付き)

//全体の概要
// 管理者が新しい記事を作成するページで、フォーム入力内容をAPIに送信し、
// 投稿が完了したら記事一覧ページに移動する処理を行うコンポーネント

//新しい記事を投稿するための管理画面(入力フォーム＋送信処理)

//イメージ
// 新しい記事を投稿するための入り口」。入力フォームは共通部品（PostForm）を使い、
// ボタンを押すとAPIにデータが送られます。

//処理の流れ
//ページが開くと、まず空のフォーム（タイトル・本文・画像など）が表示されます。
//管理者が内容を入力して「作成」ボタンを押すと、
//そのデータがAPI（/admin/posts）に送信され、
//投稿が成功すると**「投稿が完了しました」というメッセージが出て、
//最後に記事一覧ページへ移動**します。


//管理者が新規記事を作成するページ
const NewPostPage: React.FC = () => {
  const router = useRouter();//投稿が終わった後に一覧ページへ戻すために使う。
  // /api をベースに固定（/admin 配下は Bearer 自動付与）
  const { api } = useApi("/api"); 
  //投稿中かどうかを管理。
  //ボタンを押した後にtrueにして連続クリックを防ぐ。
  const [isSubmitting, setIsSubmitting] = useState(false);//送信中状態を管理

  //新規作成時の送信処理
  // 新規作成(API: POST /api/admin/posts)
  // フォーム送信時に呼び出される関数(POSTリクエスト)
  // PostFormから渡ってくる入力データ(タイトル・内容・画像)を受け取る。
  const handleCreate = async (data: CreatePost) => {
    //すでに送信中なら、処理を止めて二重投稿を防ぐ。
    if (isSubmitting) return; //2重送信防止の為
    //「送信中」に変更。
    // そしてボタンが無効化され、「投稿中...」のラベル表示。
    setIsSubmitting(true);//送信開始→ボタンdisabledにする。

    try {
      //useApiを使って記事データをサーバー(バックエンドのAPI)へ送信する。
      // /api/admin/postsにPOSTリクエストを送る仕組み。
      // 認証ヘッダー＆JSON化はフック側で自動で付与
      const res = await api.post("/admin/posts", data);
      
      //もしレスポンスが失敗した場合の処理(res.okがfalseの時)
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`投稿に失敗しました（${res.status}）${text ? `: ${text}` : ""}`);
      }
      
      //投稿が成功した時の処理
      // メッセージを出して記事一覧ページ(/admin/posts)へ移動(リダイレクト)
      alert("投稿が完了しました");
      router.push("/admin/posts");
    //投稿が失敗時の処理
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "投稿に失敗しました";
      alert(msg);
    //成功・失敗どちらの場合でも最後に「送信中フラグ」を解除してボタンを押せる様に
    } finally {
      setIsSubmitting(false);//送信完了→ボタン復活
    }
  };

  //新規作成時の初期データ
  // フォームに渡す初期値を設定。
  // 新規作成用なので全て空状態でスタートに
  // フォーム初期値（thumbnailImageKey を使用）
  const initialData: CreatePost = {
    title: "",
    content: "",
    thumbnailImageKey: "",
    categories: [], // カテゴリーは空配列
  };

  //共通フォーム(PostForm)を呼び出して表示する処理
  // 必要なプロパティ（初期データ・送信処理・ボタンラベル）を渡す。
  return (
    <PostForm
      initialData={initialData}  // 空の初期データを渡す
      onSubmit={handleCreate}     // 投稿処理(handleCreate)を渡す
      submitLabel={isSubmitting ? "投稿中.." : "作成"}   //ボタン表示(送信中なら「投稿中...」)を渡す。
      isSubmitting={isSubmitting}//送信中の状態フラグを渡す。
    />
  );
};

export default NewPostPage;
