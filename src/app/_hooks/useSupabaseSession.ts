import { supabase } from '@/utils/supabase'
import { Session } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

//全体の概要
//Supabaseの認証情報を取得して、
//「ログイン状態(未ログイン／ログイン中／判定中)」とアクセストークンをReactのカスタムフックとして管理・返す処理です。

export const useSupabaseSession = () => {
  //ログインセッションの状態を管理
  //入る値(オブジェクト)は下記に
  //undefind(初期値): ログイン状態ロード中(チェック中), null: ログインしていない, Session: ログインしている
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [token, setToken] = useState<string | null>(null)
  const [isLoding, setIsLoding] = useState(true)

  useEffect(() => {
    const fetcher = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()//現在ログイン中かどうかチェックする
      //取得したsessionを状態に反映。
      //ログイン中であればログインユーザーの情報がオブジェクトで取得
      //未ログインであればnullを返す
      setSession(session)
      //セッションがあればアクセストークンを取り出し、無ければ null をセット。
      setToken(session?.access_token || null)
      //判定処理後、ロードフラグをfalseに更新
      setIsLoding(false)
    }

    fetcher()
  }, [])

  //他のコンポーネントからログイン状態やトークンを利用できる様に
  //戻り値として{ session, isLoding, token }を返す
  return { session, isLoding, token }
}