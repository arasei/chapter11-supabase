//DB操作用のクライアント
import { PrismaClient } from '@prisma/client'
//App Router のAPIで使うNext.js標準のリクエスト/レスポンス型
import { NextRequest, NextResponse } from 'next/server'
//requireUser: Supabase 認証でログインしているか確認する関数
//assertRole（コメントアウト中）: 管理者権限チェック用に将来的に使える
import { requireUser /*, assertRole */ } from '@/app/api/_lib/auth'

//Prisma クライアントを生成（DBに接続するため）
const prisma = new PrismaClient()


//全体の概要
// Supabase認証を通過した管理者が、カテゴリー一覧を取得（GET）したり、
// 新しいカテゴリーを作成（POST）できるAPIエンドポイントです。

//イメージ
// 管理画面のカテゴリー一覧」ページが使う裏側のAPI。
// 管理者がページを開くと、GETでカテゴリー一覧を取得
// 管理者がフォームに新しいカテゴリー名を入力して送信すると、POSTで新規作成
// どちらも認証されたユーザーだけが実行可能
// ページで表示するデータ（GET）と、
// 追加フォームから送るデータ（POST）を担当する部分

//イメージ2
// このAPIは、管理画面の「カテゴリー管理」を担当する裏方スタッフ。
// GET は「倉庫(DB)からすべてのカテゴリーを一覧で持ってくる」
// POST は「新しいカテゴリーを倉庫に追加する」
// ただし、鍵（ログイン）を持っていない人は倉庫(DB)に入れません。
// エラーが起きたら「どうして失敗したのか」も返してく


//管理者用のカテゴリーAPI
// 管理画面で使うカテゴリー一覧の取得（GET）と新規作成（POST）を処理するAPI


//管理者　カテゴリー一覧取得API
//GET処理
//ユーザーが認証されているか確認。
// 未ログインならその場で終了(requireUser が { error, status } を返す）
export const GET = async (req: NextRequest) => {
  // ★ 認証ガード（直書き）
  const auth = await requireUser(req)
  if ('error' in auth) return NextResponse.json(auth, { status: auth.status })
  // 必要ならロール制御
  // const gate = assertRole(auth.user, 'admin')
  // if ('error' in gate) return NextResponse.json(gate, { status: gate.status })
  try {
    // カテゴリーの一覧(categoryテーブルの全レコード)をDBから取得
    //PrismaORMを使ってcategoryテーブルのデータを全件取得。
    const categories = await prisma.category.findMany({
      orderBy: {
        createdAt: 'desc', // 作成日時の降順(新しい順)で取得
      },
    })

    //レスポンスを返す
    // 成功したら、カテゴリー一覧をJSON形式で返す。 
    return NextResponse.json({ status: 'OK', categories }, { status: 200 })
  } catch (error) {
    if (error instanceof Error)
      return NextResponse.json({ status: error.message }, { status: 400 })
  }
}

// カテゴリーの作成時に送られてくるリクエストのbodyの型を指定
interface CreateCategoryRequestBody {
  name: string
}

//管理者　カテゴリー新規作成API
//POST処理
//ユーザーが認証されているか確認。
// 未ログインならその場で終了(requireUser が { error, status } を返す）
export const POST = async (req: NextRequest) => {
  // ★ 認証ガード（直書き）
  const auth = await requireUser(req)
  if ('error' in auth) return NextResponse.json(auth, { status: auth.status })
  // const gate = assertRole(auth.user, 'admin')
  // if ('error' in gate) return NextResponse.json(gate, { status: gate.status })
  try {
    //フロントエンドから送られてくるリクエストのbody(name)をJSONとして取得
    const body = await req.json()
    //JSONとして取得したbodyの中からnameを取り出す
    const { name }: CreateCategoryRequestBody = body
    //nameが空文字やスペースだけのときはエラー(400)
    if (!name || !name.trim()) {
      return NextResponse.json({ status: 'name is required' }, { status: 400 })
    }

    //Prismaのcreate()メソッドで新しいカテゴリーをデータベースに追加。
    const data = await prisma.category.create({
      data: {
        //.trim()で前後の空白を削除して保存
        name: name.trim()
      },
    })

    //作成されたカテゴリーのidを含むJSONレスポンスを返す
    // 作成成功時に「OK」と新しいidを返す。
    //201は「作成成功」のHTTPステータスコード
    return NextResponse.json(
      {
        status: 'OK',
        message: '作成しました',
        id: data.id,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ status: error.message }, { status: 400 })
    }
  }
}
