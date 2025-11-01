'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
//認証状態を取得するカスタムフック
import { useSupabaseSession } from '../_hooks/useSupabaseSession';
//Supabase クライアント（ログアウトに使用）
import { supabase } from '@/utils/supabase';

//全体の概要
// 現在のログイン状態をチェックして、ログイン中は「管理画面＋ログアウト」、未ログインなら「お問い合わせ＋ログイン」を表示し、
// ログアウト時には Supabase のセッションを削除してトップページへ戻すヘッダーコンポーネントです。

//処理の流れ
// まず、useSupabaseSession() で「今ログインしてるか？」を確認。
// まだ判定中なら何も表示しない。
// ログイン済みなら「管理画面」＋「ログアウト」ボタンを表示。
// 未ログインなら「お問い合わせ」＋「ログイン」ボタンを表示。
//「ログアウト」を押すと Supabase からサインアウトして、トップページ(/)に戻る。


//handlelogout関数(クリック時)で Supabase の auth.signOut() を実行し、
//その後 router.replace('/') でトップページに遷移する処理
export const Header: React.FC = () => {
  const router = useRouter();
  //useSupabaseSessionを呼び出して、認証フックから現在のセッションとロード中フラグを受け取る。
  //sessionが存在すれば「ログイン中」、isLoadingがtrueなら「判定中(ローディング中)」
  const { session, isLoading } = useSupabaseSession();

  const handlelogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/');//ページ再読み込み無しでトップへ遷移
    } catch (error) {
      console.error('ログアウト失敗:', error);
      alert('ログアウトに失敗しました');
    }
  };

  if (isLoading) {
    return (
      <header className="bg-gray-800 text-white p-6 text-center">
        判定中...
      </header>
    );
  }


  return (
    <header className='bg-gray-800 text-white p-6 font-bold flex justify-between items-center'>
      <Link href="/" className='header-link'>
        Blog
      </Link>
      {/*isLodingがfalse(ロード完了)の場合だけ内容(リンク)を表示し、*/}
      {/*sessionがあれば「管理画面リンク＋ログアウトボタン」を表示し、*/}
      {/*セッションがなければ「お問い合わせリンク＋ログインリンク」を表示*/}
      {!isLoading && (
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
  );
};