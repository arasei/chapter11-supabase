"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { CreatePost, Category } from "@/app/_types/Post";
import { useApi } from "@/app/_hooks/useApi";
//画像を保存する為のクラウド
import { supabase } from "@/utils/supabase";
//画像のファイル名を重複しない様にするためのID生成
import { v4 as uuidv4 } from "uuid";

//全体の概要
//記事の新規作成／編集フォームを表示し、Supabase からカテゴリ一覧取得・画像アップロード＆プレビュー・入力バリデーションを行い、
// 送信時に CreatePost 形式へ整形して親コンポーネントへ渡す Next.js クライアント用フォームコンポーネント

//イメージ
//「カテゴリ取得 → 入力＆バリデーション → 画像アップ＆プレビュー → 送信整形」まで、
// 記事作成に必要な流れを1つのフォームにまとめた部品

//処理の流れ
//まずサーバーからカテゴリ一覧を読み込み、フォームに選択肢を出します。
//画像を選ぶと**クラウド(Supabase)**にアップロードされ、プレビューが出ます。
//タイトル・本文・カテゴリを入力して「送信」を押すと、データをバックエンドが受け取りやすい形（CreatePost）に組み直して渡します。
//処理中はフォームが自動で無効化され、重複送信を防ぎます。

//Storageバケット名の定数
//Supabaseの中の「画像を保存する場所(フォルダ)」の名前
const BUCKET = "post_thumbnail";

//フォームの受け取りprops型
//このフォームが外から受け取るデータの型
export type PostFormProps = {
  initialData: CreatePost;//フォームの初期表示データ(編集時など)
  onSubmit: (data: CreatePost) => Promise<void>;//フォームが送信されたときの処理
  onDelete?: () => void;//削除ボタンを押した時の処理
  submitLabel: string;//ボタンに表示する文字(例:「作成」「更新」)
  isSubmitting?: boolean;
  disabled?: boolean;
};

// RHF 内部で管理するフォーム値の型
//このフォームで扱う入力項目
//タイトル・内容・画像キー・カテゴリー(複数選択)
type FormValues = {
  title: string;
  content: string;
  thumbnailImageKey: string;
  categoryIds: number[]; // ← UI では number[] を扱う
};

//フォームのメインコンポーネント
//フォーム本体の宣言（props 受け取り）
//以下より実際のフォーム処理がスタート
export const PostForm: React.FC<PostFormProps> = ({
  initialData,
  onSubmit,
  onDelete,
  submitLabel,
  isSubmitting: isSubmittingProp,
  disabled: disabledProp,
}) => {
  // カテゴリ一覧取得（管理API → JWT 自動付与）
  //サーバーからカテゴリー一覧を取ってくる準備
  //認証付き API クライアント、カテゴリ一覧＆状態（読み込み中・エラー）
  const { api } = useApi("/api");//サーバーに安全にアクセスするための共通処理
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);//読み込み中かどうか
  const [catError, setCatError] = useState<string | null>(null);//エラーが起きたらその内容を表示するため

  //RHF 初期化
  //react-hook-formでセットアップしている。
  // register:各入力欄を登録
  // handleSubmit:送信ボタンを押した時の処理をまとめる
  // reset:入力内容をリセットする関数
  // errors:入力エラーがあるかどうかを管理
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  //defaultValuesで初期値を設定
  //defaultValues に initialData を反映
  } = useForm<FormValues>({
    defaultValues: {
      title: initialData.title,
      content: initialData.content,
      thumbnailImageKey: initialData.thumbnailImageKey ?? "",
      categoryIds: initialData.categories.map((c) => c.id),
    },
    mode: "onTouched",
  });


  //initialDataが更新された時にフォーム内容(値)も更新(リセット)する。
  // 編集ページの初回ロード、編集ページでデータを再取得した時などに反映される。
  useEffect(() => {
    reset({
      title: initialData.title,
      content: initialData.content,
      thumbnailImageKey: initialData.thumbnailImageKey ?? "",
      categoryIds: initialData.categories.map((c) => c.id),
    });
  }, [initialData, reset]);

  // カテゴリ一覧取得
  //サーバー(API)からカテゴリー一覧を取得する処理(中断可能)
  // エラーを画面表示用ステートへ
  //AbortControllerはページを離れた時に処理を中断するための安全策
  //取得が成功したらsetAllCategoriesに保存する。
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setCatLoading(true);
        setCatError(null);
        const res = await api.get("/admin/categories", { signal: ac.signal });
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
    // api.get への参照だけを依存にすると無限ループを避けやすい
  }, [api.get]);

  //選択した画像を一時的にプレビュー表示するための処理
  // thumbnailKeyが変わるたびにSupabaseからURLを発行して画像を表示する(プレビュー)。
  // 署名付きURL をフォーム値の thumbnailImageKey から生成
  const thumbnailKey = watch("thumbnailImageKey");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  useEffect(() => {
    (async () => {
      if (!thumbnailKey) {
        setPreviewUrl("");
        return;
      }
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(thumbnailKey, 60 * 60);
      if (error) {
        console.warn("signed url 生成失敗:", error.message);
        setPreviewUrl("");
        return;
      }
      setPreviewUrl(data?.signedUrl ?? "");
    })();
  }, [thumbnailKey]);

  //画像を選ぶと自動的にSupabaseにアップロードされ、その結果のファイルパスをフォームに登録し、プレビューを更新する。
  //画像選択→Storageへアップロード→フォームにキー保存→プレビュー生成
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    // RHF にキーをセット（dirty 扱い）
    setValue("thumbnailImageKey", data.path, { shouldDirty: true, shouldTouch: true });

    // プレビューも更新
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(data.path, 60 * 60);
    setPreviewUrl(signed.data?.signedUrl ?? "");
  };

  //送信中や読み込み中はボタンを無効にするための状態。
  // 「連打による重複送信」などを防ぐ。
  // 実効的に UI を無効化する条件を集約
  const isBusy = useMemo(
    () => !!disabledProp || isSubmittingProp || isSubmitting || catLoading,
    [disabledProp, isSubmittingProp, isSubmitting, catLoading]
  );

  //フォームを送信した時の処理
  // RHFの送信ハンドラ
  // 入力内容(FormValues)をCreatePost形式に変換して、親(onSubmit)に渡す。
  const onSubmitRHF = async (values: FormValues) => {
    if (!values.categoryIds || values.categoryIds.length === 0) {
      alert("カテゴリーを選択してください。");
      return;
    }
    const payload: CreatePost = {
      title: values.title,
      content: values.content,
      thumbnailImageKey: values.thumbnailImageKey,
      categories: values.categoryIds.map((id) => ({ id })),
    };
    await onSubmit(payload);
  };

  //フォーム本体。

  return (
    //カテゴリのエラー・ローディング表示、fieldset で一括無効化
    //handleSubmitはRHFが提供している送信関数
    <form onSubmit={handleSubmit(onSubmitRHF)} className="space-y-4 p-4">
      <h1 className="text-lg font-bold mb-4">記事フォーム</h1>

      {catError && <p className="text-red-600">{catError}</p>}
      {catLoading && <p>カテゴリーを読み込み中…</p>}

      <fieldset disabled={isBusy} className="space-y-4">
        {/* タイトル */}
        {/*タイトル入力。必須バリデーションあり、エラー表示*/}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            タイトル
          </label>
          <input
            id="title"
            type="text"
            className="border border-stone-300 rounded-lg p-3 w-full"
            aria-invalid={!!errors.title || undefined}
            {...register("title", { required: "必須です" })}
          />
          {errors.title && <p className="text-red-600 text-sm">{errors.title.message}</p>}
        </div>

        {/* 内容 */}
        {/*本文入力。必須チェックあり*/}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            内容
          </label>
          <textarea
            id="content"
            className="border border-stone-300 rounded-lg p-3 w-full"
            aria-invalid={!!errors.content || undefined}
            rows={8}
            {...register("content", { required: "必須です" })}
          />
          {errors.content && <p className="text-red-600 text-sm">{errors.content.message}</p>}
        </div>

        {/* 画像アップロード */}
        {/*画像選択UI、現在のキー表示、プレビュー*/}
        <div>
          <label htmlFor="thumbnailImageInput" className="block text-sm font-medium text-gray-700">
            サムネイル画像
          </label>
          <input
            id="thumbnailImageInput"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          {/* 現在のキーを小さく表示 */}
          {thumbnailKey && (
            <p className="text-xs text-gray-500 break-all mt-1">key: {thumbnailKey}</p>
          )}
          {/* プレビュー */}
          {previewUrl && (
            <div className="mt-2">
              <img
                src={previewUrl}
                alt="サムネイルプレビュー"
                className="h-32 w-32 object-cover rounded border"
              />
            </div>
          )}
        </div>

        {/* カテゴリー（複数選択） */}
        {/*複数カテゴリ選択可、1つ以上選ばないとエラー、string[] → number[] へ整形して保存*/}
        <div>
          <label htmlFor="categoryIds" className="block text-sm font-medium text-gray-700">
            カテゴリー（複数選択可）
          </label>
          <select
            id="categoryIds"
            multiple
            className="border border-stone-300 rounded-lg p-3 w-full"
            // register しつつ、number[] に変換
            {...register("categoryIds", {
              validate: (v) => (v && v.length > 0) || "1つ以上選択してください",
              // onChange で string[] → number[] に整形
              onChange: (e) => {
                const selected = Array.from(e.target.selectedOptions, (o: HTMLOptionElement) =>
                  Number(o.value)
                );
                setValue("categoryIds", selected, { shouldDirty: true, shouldTouch: true });
              },
            })}
            // value は watch から取れるが、register だけでも OK（RHF が状態を持つ）
          >
            {allCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || "(名前なし)"}
              </option>
            ))}
          </select>
          {errors.categoryIds && (
            <p className="text-red-600 text-sm">{errors.categoryIds.message as string}</p>
          )}
        </div>

        {/* ボタン */}
        {/*状況に応じてラベル変更・無効化*/}
        {/*送信ボタン（送信中ラベル切替）と削除ボタン（存在時のみ）*/}
        <div className="flex space-x-4 pt-2">
          <button type="submit" className="py-2 px-4 rounded-lg text-white bg-blue-700">
            {isSubmitting || isSubmittingProp ? "送信中..." : submitLabel}
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="py-2 px-4 rounded-lg text-white bg-red-600"
            >
              削除
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
};
