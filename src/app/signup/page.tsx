'use client'

import { supabase } from '@/utils/supabase';//前の工程で作成したファイル
import { useState } from 'react'

//全体の概要
//ユーザー登録ページの実装
//ユーザーが入力したメールアドレスとパスワードを Supabase の認証機能に渡して新規登録を行い、
//その結果に応じて入力欄をリセットしてメッセージを表示するユーザー登録フォームを描画する処理

export default function Page() {
  //入力中のメールアドレスとパスワードの状態とその更新関数を用意
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')

  //フォーム送信イベントを非同期で扱うハンドラを宣言
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    //Supabase AuthのsignUpを実行し、ユーザー作成を試みる。
    const { error } = await supabase.auth.signUp({
      email,
      password,
      //サインアップの追加オプションを指定するブロック開始
      options: {
        //メール確認が有効な場合、確認リンク後の遷移先 URL を指定。
        emailRedirectTo: `http://localhost:3000/login`,
      },
    })
    if (error) {
      alert('登録に失敗しました')
    } else {
      //成功時、入力フォームのメール値・をリセットし、アラート表示
      setEmail('')
      setPassword('')
      alert('登録メールを確認しました。')
    }
  }

  return (
    <div className='flex justify-center pt-[240px]'>
      <form onSubmit={handleSubmit} className='space-y-4 w-full max-w-[400px]'>
        <div>
          <label
            htmlFor='email'
            className='block mb-2 text-sm font-medium text-gray-900'
          >
            メールアドレス
          </label>
          <input
            type='email'
            name='email'
            id='email'
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
            placeholder='name@company.com'
            required
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>
        <div>
          <label
            htmlFor='password'
            className='block mb-2 text-sm font-medium text-gray-900'
          >
            パスワード
          </label>
          <input
            type='password'
            name='password'
            id='password'
            placeholder='・・・・・・・・'
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
            required
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>

        <div>
          <button
          type='submit'
          className='w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center'>
            登録
          </button>
        </div>
      </form>
    </div>
  )
}