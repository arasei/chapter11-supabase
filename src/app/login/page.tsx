'use client'

import { supabase } from "@/utils/supabase"
import { useRouter } from 'next/navigation'
import { useState } from 'react'

//全体の概要
//ユーザーが入力したメールアドレスとパスワードを使って Supabase 認証にログインし、
//成功したら管理画面にリダイレクトするログインフォーム


export default function Page() {
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const router = useRouter()//useRouter() でルーター機能を取得。replace() でリダイレクトに使用。

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    //Supabase Auth の パスワードログイン API を呼び出し。
    //入力値の email と password を渡す。
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert('ログインに失敗しました')
    } else {
      //成功時の処理
      //管理画面 /admin/posts に遷移（履歴を残さない replace）。
      router.replace('/admin/posts')
    }
  }

  return (
    <div className="flex justify-center pt-[240px]">
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-[400px]">
        <div>
          <label
            htmlFor="email"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            メールアドレス
          </label>
          <input
            type="email"
            name="email"
            id="email"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="name@company.com"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            パスワード
          </label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="・・・・・・・・"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <button
            type="submit"
            className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
          >
            ログイン
          </button>
        </div>
      </form>
    </div>
  )
}