'use client'

import { supabase } from "@/utils/supabase"//Supabaseクライアント
import { useRouter } from 'next/navigation'//ページ遷移ルーター
import { useForm } from 'react-hook-form'//フォーム管理ライブラリ

//全体の概要
// ユーザーが入力したメールアドレスとパスワードを使って Supabase 認証にログインし、
// 成功したら管理画面(/admin/posts)に遷移するNext.jsのクライアント用ログインフォーム


//処理の流れ
// 画面のフォームにメールとパスワードを入力。
//「ログイン」ボタンで送信すると、Supabase にログイン要求を出す。
// うまくいけば管理画面（/admin/posts）へ自動で移動。
// 間違っていれば「ログインに失敗しました」と表示。
// 送信中はボタンが無効になり、ラベルが**送信中…**に変わる。

//フォームが扱う入力の型。
//入力ミスをコンパイル時に検出しやすくする為
type FormValues = { email: string; password: string };

//ログインページのコンポーネント本体
export default function Loginpage() {
  const router = useRouter();//useRouter() でルーター機能を取得。replace() でリダイレクトに使用。
  //useFormで初期値とエラー/送信中状態を管理。
  //registerは各<input>と連携する為の関数
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ defaultValues: { email: '', password: ''} });

  //送信時の処理。
  const onSubmit = async ({ email, password } : FormValues) => {
    //Supabaseのパスワード認証を呼ぶ。
    //入力値の email と password を渡す。
    const { error } = await supabase.auth.signInWithPassword({email, password });
    if (error) { alert('ログインに失敗しました'); return; }
    //成功時の処理
    // 管理画面 /admin/posts に遷移（戻るボタンに履歴を残さない replace）。
    router.replace('/admin/posts');
  };




  return (
    <div className="flex justify-center pt-[240px]">
      {/*handleSubmit は RHF がバリデーション後に onSubmit を呼ぶ。*/}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-[400px]">
        {/*メール入力欄*/}
        {/*必須チェックのみ*/}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900">
            メールアドレス
          </label>
          <input
            type="email"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            {...register('email', { required: '必須です' })}
          />
          {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
        </div>

        {/*パスワード入力欄*/}
        {/*必須チェックのみ*/}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900">
            パスワード
          </label>
          <input
            type="password"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            {...register('password', { required: '必須です' })}
          />
          {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
        </div>

        {/*送信ボタン*/}
        {/*送信中は無効＋ラベル変更*/}
        <div>
          <button disabled={isSubmitting} className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
            {isSubmitting ? '送信中...' : 'ログイン'}
          </button>
        </div>
      </form>
    </div>
  );
}