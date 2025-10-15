"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { CreatePost, Category } from "@/app/_types/Post";
import { useApi } from "@/app/_hooks/useApi";
import { supabase } from "@/utils/supabase";
import { v4 as uuidv4 } from "uuid";

const BUCKET = "post_thumbnail";

export type PostFormProps = {
  initialData: CreatePost;
  onSubmit: (data: CreatePost) => Promise<void>;
  onDelete?: () => void;
  submitLabel: string;
  isSubmitting?: boolean;
  disabled?: boolean;
};

// フォーム内部で扱う型（RHF 用）
type FormValues = {
  title: string;
  content: string;
  thumbnailImageKey: string;
  categoryIds: number[]; // ← UI では number[] を扱う
};

export const PostForm: React.FC<PostFormProps> = ({
  initialData,
  onSubmit,
  onDelete,
  submitLabel,
  isSubmitting: isSubmittingProp,
  disabled: disabledProp,
}) => {
  // カテゴリ一覧取得（管理API → JWT 自動付与）
  const { api } = useApi("/api");
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  // RHF 初期化
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: initialData.title,
      content: initialData.content,
      thumbnailImageKey: initialData.thumbnailImageKey ?? "",
      categoryIds: initialData.categories.map((c) => c.id),
    },
    mode: "onTouched",
  });

  // initialData が変わったらフォーム値を同期（編集画面の初回ロードなど）
  useEffect(() => {
    reset({
      title: initialData.title,
      content: initialData.content,
      thumbnailImageKey: initialData.thumbnailImageKey ?? "",
      categoryIds: initialData.categories.map((c) => c.id),
    });
  }, [initialData, reset]);

  // カテゴリ一覧取得
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

  // プレビュー URL を、フォーム値の thumbnailImageKey から生成
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

  // 画像選択＆アップロード → フォーム値にキーを格納
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

  // 実効的に UI を無効化する条件
  const isBusy = useMemo(
    () => !!disabledProp || isSubmittingProp || isSubmitting || catLoading,
    [disabledProp, isSubmittingProp, isSubmitting, catLoading]
  );

  // 送信（FormValues → CreatePost に変換して親 onSubmit へ）
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

  return (
    <form onSubmit={handleSubmit(onSubmitRHF)} className="space-y-4 p-4">
      <h1 className="text-lg font-bold mb-4">記事フォーム</h1>

      {catError && <p className="text-red-600">{catError}</p>}
      {catLoading && <p>カテゴリーを読み込み中…</p>}

      <fieldset disabled={isBusy} className="space-y-4">
        {/* タイトル */}
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
