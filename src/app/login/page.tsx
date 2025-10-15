'use client'

import { supabase } from "@/utils/supabase"
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

//全体の概要
//ユーザーが入力したメールアドレスとパスワードを使って Supabase 認証にログインし、
//成功したら管理画面にリダイレクトするログインフォーム
//ログインを react-hook-form 化


type FormValues = { email: string; password: string };

export default function Loginpage() {
  const router = useRouter();//useRouter() でルーター機能を取得。replace() でリダイレクトに使用。
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ defaultValues: { email: '', password: ''} });

  const onSubmit = async ({ email, password } : FormValues) => {
        //Supabase Auth の パスワードログイン API を呼び出し。
    //入力値の email と password を渡す。
    const { error } = await supabase.auth.signInWithPassword({email, password });
    if (error) { alert('ログインに失敗しました'); return; }
    //成功時の処理
      //管理画面 /admin/posts に遷移（履歴を残さない replace）。
    router.replace('/admin/posts');
  };




  return (
    <div className="flex justify-center pt-[240px]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-[400px]">
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

        <div>
          <button disabled={isSubmitting} className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
            {isSubmitting ? '送信中...' : 'ログイン'}
          </button>
        </div>
      </form>
    </div>
  );
}