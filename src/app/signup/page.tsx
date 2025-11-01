'use client'

import { supabase } from '@/utils/supabase';//前の工程で作成したファイル
import { useForm } from 'react-hook-form'

//全体の概要
// ユーザー登録ページの実装
// ユーザーがメールとパスワードを入力してSupabaseに新規登録(サインアップ)し、
// 結果に応じてメッセージ表示やフォームリセットを行うNext.jsのクライアント用登録フォームです。


//処理の流れ
// ユーザーがメールとパスワードを入力
//「登録」ボタンを押すと Supabase にアカウント作成を依頼
// うまくいけば確認メールを送信（ユーザーはメールのリンクを踏む）
// 成功メッセージを出してフォームを空にする
// 失敗ならエラーメッセージを表示してそのまま入力を維持

//フォームが扱う入力の型
type FormValues = { email: string; password: string };

//ページコンポーネント本体
export default function SignUpPage() {
  //react-hook-formでフォームを初期化。
  // register：各 input と紐づけ
  // handleSubmit：送信時のラッパ
  // errors：エラーメッセージ
  // isSubmitting：送信中フラグ
  // reset：フォームを空に戻す

  //defaultValues:
  // RHFのuseForm()フック。
  // フォームの各入力欄に初期値を設定するオプション。
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
    useForm<FormValues>({ defaultValues: { email: '', password: ''} });

  //送信時に呼ばれる非同期関数
  const onSubmit = async ({ email, password }: FormValues) => {
    //SupabaseのsignUpのAPIを実行し、ユーザー作成を試みる。
    // ユーザー作成と「確認メール送信」をまとめて依頼するため。
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
      {/*handleSubmit がバリデーションの後に onSubmit を呼ぶ。*/}
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4 w-full max-w-[400px]'>
        {/*,メール入力欄*/}
        {/*必須&形式チェック*/}
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

        {/*パスワード入力欄*/}
        {/*必須&文字数チェック*/}
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

        {/*送信ボタン*/}
        {/*送信中は無効化&ラベル変更で二重送信を防止。*/}
        <button disabled={isSubmitting} className="w-full text-white bg-blue-700 rounded-lg px-5 py-2.5">
          {isSubmitting ? '送信中…' : '登録'}
        </button>
      </form>
    </div>
  );
}