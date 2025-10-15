'use client'

import { supabase } from '@/utils/supabase';//前の工程で作成したファイル
import { useForm } from 'react-hook-form'

//全体の概要
//ユーザー登録ページの実装
//ユーザーが入力したメールアドレスとパスワードを Supabase の認証機能に渡して新規登録を行い、
//その結果に応じて入力欄をリセットしてメッセージを表示するユーザー登録フォームを描画する処理
//サインアップを react-hook-form 化

type FormValues = { email: string; password: string };

export default function SignUpPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
    useForm<FormValues>({ defaultValues: { email: '', password: ''} });

  const onSubmit = async ({ email, password }: FormValues) => {
    //Supabase AuthのsignUpを実行し、ユーザー作成を試みる。
    const { error } = await supabase.auth.signUp({
      email,
      password,
      //サインアップの追加オプションを指定するブロック開始
      options: {
        //メール確認が有効な場合、確認リンク後の遷移先 URL を指定。
        emailRedirectTo: `${location.origin}/login` 
      },
    });
    if (error) {
      alert('登録に失敗しました');
      return;
    }
    //成功時、入力フォームのメール値・をリセットし、アラート表示
    alert('確認メールを送信しました。');
    reset();
  };



  return (
    <div className='flex justify-center pt-[240px]'>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4 w-full max-w-[400px]'>
        <div>
          <label className='block mb-2 text-sm font-medium text-gray-900'>
            メールアドレス
          </label>
          <input
            type='email'
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
            {...register('email', { required: '必須です', pattern: { value: /.+@.+/, message: '形式が不正です' } })}
          />
          {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
        </div>

        <div>
          <label className='block mb-2 text-sm font-medium text-gray-900'>
            パスワード
          </label>
          <input
            type='password'
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
            {...register('password', { required: '必須です', minLength: { value: 8, message: '8文字以上' } })}
          />
          {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
        </div>

        <button disabled={isSubmitting} className="w-full text-white bg-blue-700 rounded-lg px-5 py-2.5">
          {isSubmitting ? '送信中…' : '登録'}
        </button>
      </form>
    </div>
  );
}