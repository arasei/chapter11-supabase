import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { useRouter } from "next/router";
import { useEffect } from "react";

//ログインしていないユーザー（session === null）を検出したら、
// 自動的に/loginページへリダイレクトさせるルートガード用のカスタムフック

export const useRouteGuard = () => {
  const router = useRouter()
  //useSupabaseSessionフックを呼び出して現在のログインセッションを取得する。
  //(undefined/null/objectのどれかが取得される)
  const { session } = useSupabaseSession()

  useEffect(() => {
    //sessionがundefinedの場合は読み込み中なので何もしない
    if (session === undefined) return

    const fetcher = async () => {
      //sessionがnull（ログインしていない状態）の場合は、
      // router.replace('/login')を実行してログインページにリダイレクトする。
      if (session === null) {
        router.replace('/login')
      }
    }

    fetcher()
  }, [router, session])//routerやsessionが変わるたびに上記ロジックを再評価する。
}