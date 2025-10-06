"use client";

import { useEffect, useState, useMemo, type ChangeEvent } from "react";
import { CreatePost, Category } from "@/app/_types/Post";
import { useApi } from "@/app/_hooks/useApi";
import { supabase } from "@/utils/supabase";
import { v4 as uuidv4 } from "uuid";//固有ID生成ライブラリ

const BUCKET = "post_thumbnail"; // ← あなたのバケット名（private）

//全体の概要
//記事のタイトル・本文・サムネイルURL・カテゴリーを入力でき、
// /api/admin/categories への取得は useApi で JWT を自動付与して実行。
//送信中は全ての入力やボタンを操作不能にする投稿フォームコンポーネント

//PostFormが受け取るpropsの型定義
export type PostFormProps = {
  initialData: CreatePost;//フォームの初期値(新規作成・編集共通)。
  //送信時の処理関数
  //onSubmitがPromise<void>を返す型(非同期送信処理を想定)
  onSubmit: (data: CreatePost) => Promise<void>;
  onDelete?: () => void;//削除ボタン押下時の関数(省略可)
  submitLabel: string;//ボタンのラベル文字列
  isSubmitting?: boolean;//親から送信中フラグを渡せる(任意)
  disabled?: boolean;//親から強制無効化(任意)
};

//PostFormコンポーネント本体。propsを分割代入で受け取る。
export const PostForm: React.FC<PostFormProps> = ({
  initialData,
  onSubmit,
  onDelete,
  submitLabel,
  isSubmitting: isSubmittingProp,
  disabled: disabledProp,
}) => {
  //入力値と状態管理
  //各フォームフィールドのstateを初期データ(initialData)からセット。
  const [title, setTitle] = useState(initialData.title);
  const [content, setContent] = useState(initialData.content);
  //アップロードする画像の「キー」を保持するstate(初期値は既存データを流用)
  //「キー」を入れる前提
  const [thumbnailImageKey, setThumbnailImageKey] = useState(initialData.thumbnailImageKey ?? "");
  // プレビュー用の署名付きURL（private バケットなので createSignedUrl を使う）
  const [previewUrl, setPreviewUrl] = useState<string>("");
  //カテゴリー
  //選択されたカテゴリーIDを保持。
  //初期データからidだけを抽出してstate(配列)に保持
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    initialData.categories.map((c) => c.id)
  );


  //全カテゴリー一覧を保持するstate

  //カテゴリー取得(管理API→JWT付与)
  const { apiFetch } = useApi();
  //APIから取得したカテゴリー一覧を格納
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  //送信中
  //投稿中フラグ。これがtrueになると全UIがdisabledになる。
  // 送信中（内部管理）※親からもらった isSubmitting があればそれを優先
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);//投稿中かどうか
  const isSubmitting = isSubmittingProp ?? isSubmittingLocal;

  // 実効的な disabled（取得中/送信中/親からの強制）
  const disabled = useMemo(
    () => !!disabledProp || isSubmitting || catLoading,
    [disabledProp, isSubmitting, catLoading]
  );

  //カテゴリー一覧取得
  // カテゴリー一覧をAPIから取得（初回のみ）
  //初回レンダリング時にカテゴリー一覧をAPIから取得しstateにセット。
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setCatLoading(true);
        setCatError(null);
        const res = await apiFetch("/api/admin/categories", { signal: ac.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`カテゴリー取得に失敗しました（${res.status}）${text ? `: ${text}` : ""}`);
        }
        const data = await res.json();
        setAllCategories(Array.isArray(data.categories) ? data.categories : []);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("カテゴリー取得エラー:", e);
        setCatError(e instanceof Error ? e.message : "カテゴリーの取得に失敗しました");
        setAllCategories([]);
      } finally {
        setCatLoading(false);
      }
    })();
    return () => ac.abort();
  }, [apiFetch]);

  //既存キーがある場合はプレビュー用の署名URLを発行
  useEffect(() => {
    (async () => {
      if (!thumbnailImageKey) {
        setPreviewUrl("");
        return;
      }
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(thumbnailImageKey, 60 * 60); // 1時間有効
      if (error) {
        console.warn("signed url 生成失敗:", error.message);
        setPreviewUrl("");
        return;
      }
      setPreviewUrl(data?.signedUrl ?? "");
    })();
  }, [thumbnailImageKey]);

  // --- 画像選択＆アップロード（private バケット） ---
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    

    // private/xxxx 形式でユニークパスを作成
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `private/${uuidv4()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (error) {
      alert(`アップロードに失敗しました: ${error.message}`);
      e.target.value = "";
      return;
    }

    // ★ 成功 → data.path をキーとして保存
    setThumbnailImageKey(data.path);

    // プレビュー用に署名URL発行
    const signed = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 60 * 60);
    setPreviewUrl(signed.data?.signedUrl ?? "");
  };


  //カテゴリー選択変更
  //handleChangeCategoryは<select multiple>の選択が変わった時に呼ばれる
  //複数選択の<select>から選択されたoptionのvalueを数値配列として取得
  const handleChangeCategory = (e: ChangeEvent<HTMLSelectElement>) => {
  
    //target.selectedOptions は、ユーザーが選択した <option> 要素のリスト。
    //Array.from でこの selectedOptions を配列に変換し、option.value を Number に変換して数値の配列にします。
    //選ばれたカテゴリーIDの数値配列を作っている。
    const selected: number[] = Array.from(e.target.selectedOptions, (option) => Number(option.value));
    setSelectedCategories(selected);//選択状態のカテゴリーIDをReactのstateに保存
  };

  //送信
  //フォーム送信時に実行される関数。
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0) {
      //カテゴリー未選択ならalertでエラー。
      alert("カテゴリーを選択してください。");
      return;
    }
    if (isSubmitting) return;//二重送信防止(親から来たフラグも考慮)

    //isSubmittingをtrueにしてUIをロック。
    setIsSubmittingLocal(true);//投稿中に切り替え
    try {
      //onSubmitはpropsで渡された非同期関数を実行。
      // ★ サーバーが「キー」を受け取る想定
      //    いったん既存 CreatePost のフィールド名が thumbnailUrl のままなら、
      //    “キーをそのまま thumbnailUrl に詰めて送る” でも動きます。
      await onSubmit({
        title,
        content,
        thumbnailImageKey,// ← URL ではなく “キー” を送る
        categories: selectedCategories.map((id) => ({ id }))
      });
    } finally {
      setIsSubmittingLocal(false);//投稿終了後に解除
    }
  };

  return (
    //フォーム全体の開始タグ。送信時にhandleSubmitが呼ばれる。
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <h1 className="text-lg font-bold mb-4">記事フォーム</h1>

      {catError && <p className="text-red-600">{catError}</p>}
      {catLoading && <p>カテゴリーを読み込み中…</p>}

      {/*以下フォーム項目は共通パターンです*/}
      {/*ラベルと入力欄*/}
      {/*入力値変更時にstateが更新される*/}
      <label>タイトル</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border border-stone-300 rounded-lg p-3 w-full"
        disabled={disabled}
      />

      <label>内容</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="border border-stone-300 rounded-lg p-3 w-full"
        disabled={disabled}
      />

      {/* 画像アップロード（キー保持） */}
      <label
        htmlFor="thumbnailImageInput"
        className="block text-sm font-medium text-gray-700"
      >
        サムネイル画像
      </label>
      {/*type="file"とすることで、ファイルのアップロードのUIを表示できる。*/}
      <input
        type="file"
        id="thumbnailImageInput"
        onChange={handleImageChange}
        accept="image/*"
        disabled={disabled}
      />

      {/* プレビュー（private なので署名URLを使用） */}
      {previewUrl && (
        <div className="mt-2">
          <img
            src={previewUrl}
            alt="サムネイルプレビュー"
            className="h-32 w-32 object-cover rounded border"
          />
          <p className="text-xs text-gray-500 break-all">key: {thumbnailImageKey}</p>
        </div>
      )}

      {/*カテゴリー選択欄。取得したallCategoriesを順番に表示*/}
      {/*選択状態はselectedCategoriesに基づく。*/}
      {/*チェック時にトグル関数が呼ばれる*/}
      <label>カテゴリー（複数選択可）</label>
      <select
        multiple
        value={selectedCategories.map(String)} //valueはstring[]で渡す。
        onChange={handleChangeCategory}
        className="border border-stone-300 rounded-lg p-3 w-full"
        disabled={disabled}//投稿中は選択できない
      >
        {allCategories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name || "(名前なし)"}
          </option>
        ))}
      </select>

      {/*送信ボタン部分。submitLabelによって作成/更新の文言が切り替わる。*/}
      <div className="flex space-x-4 pt-4">
        <button
          type="submit"
          className="py-2 px-4 rounded-lg text-white bg-blue-700"
          disabled={disabled}//投稿中は押せない
        >
          {isSubmitting ? "送信中..." : submitLabel}
        </button>

        {/*onDeleteが渡されている時だけ削除ボタンを表示。*/}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="py-2 px-4 rounded-lg text-white bg-red-600"
            disabled={disabled}//投稿中は削除もできない
          >
            削除
          </button>
        )}
      </div>
    </form>
  );
};
