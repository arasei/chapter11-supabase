'use client';

import React from "react";
import Link from 'next/link';
import { useSupabaseSession } from '../_hooks/useSupabaseSession';
import { supabase } from '@/utils/supabase';

//全体の概要
//現在のログイン状態を判定してヘッダーに「管理画面＋ログアウト」または「お問い合わせ＋ログイン」のリンクを表示し、
//ログアウト時には Supabase のセッションを破棄してトップページに戻すヘッダーコンポーネントです。

//handlelogout関数(クリック時)で Supabase の auth.signOut() を実行し、
//その後 window.location.href = '/' でトップページにリダイレクトする処理
export const Header: React.FC = () => {
  const handlelogout = async () => {
    //サインアウト(現在のセッションを破棄)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  //useSupabaseSessionを呼び出して、現在のセッションとロード中フラグを受け取る。
  //sessionが存在すれば「ログイン中」、isLodingがtrueなら「判定中(ローディング中)」
  const {session, isLoding } = useSupabaseSession()

  return (
    <header className='bg-gray-800 text-white p-6 font-bold flex justify-between items-center'>
      <Link href="/" className='header-link'>
        Blog
      </Link>
      {/*
        isLodingがfalse(ロード完了)の場合だけ内容を表示し、
        セッションがあれば「管理画面リンク＋ログアウトボタン」を表示
      */}
      {/*セッションがなければ「お問い合わせリンク＋ログインリンク」を表示*/}
      {!isLoding && (
        <div>
          {session ? (
            <>
              <Link href="/admin" className='header-link'>
                管理画面
              </Link>
              <button onClick={handlelogout}>
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/contact" className='header-link'>
                お問い合わせ
              </Link>
              <Link href="/login" className='header-link'>
                ログイン
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}