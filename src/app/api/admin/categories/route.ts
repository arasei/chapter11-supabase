import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser /*, assertRole */ } from '@/app/api/_lib/auth'

const prisma = new PrismaClient()


//全体の概要
//管理者用のカテゴリーAPI
// 管理画面で使うカテゴリー一覧の取得（GET）と新規作成（POST）を処理するAPI

//管理者　カテゴリー一覧取得API
export const GET = async (req: NextRequest) => {
  // ★ 認証ガード（直書き）
  const auth = await requireUser(req)
  if ('error' in auth) return NextResponse.json(auth, { status: auth.status })
  // 必要ならロール制御
  // const gate = assertRole(auth.user, 'admin')
  // if ('error' in gate) return NextResponse.json(gate, { status: gate.status })

  try {
    // カテゴリーの一覧をDBから取得
    //PrismaORMを使ってcategoryテーブルのデータを全件取得。
    const categories = await prisma.category.findMany({
      orderBy: {
        createdAt: 'desc', // 作成日時の降順で取得
      },
    })

    // レスポンスを返す
    return NextResponse.json({ status: 'OK', categories }, { status: 200 })
  } catch (error) {
    if (error instanceof Error)
      return NextResponse.json({ status: error.message }, { status: 400 })
  }
}

// カテゴリー作成のリクエストボディの型を指定
// カテゴリーの作成時に送られてくるリクエストのbodyの型
interface CreateCategoryRequestBody {
  name: string
}

//管理者　カテゴリー新規作成API
export const POST = async (req: NextRequest) => {
  // ★ 認証ガード（直書き）
  const auth = await requireUser(req)
  if ('error' in auth) return NextResponse.json(auth, { status: auth.status })
  // const gate = assertRole(auth.user, 'admin')
  // if ('error' in gate) return NextResponse.json(gate, { status: gate.status })

  try {
    //フロントエンドから送られてくるリクエストのbody(name)をJSONとして取得
    const body = await req.json()

    // bodyの中からnameを取り出す
    const { name }: CreateCategoryRequestBody = body
    if (!name || !name.trim()) {
      return NextResponse.json({ status: 'name is required' }, { status: 400 })
    }

    //Prismaのcreate()メソッドで新しいカテゴリーをデータベースに追加。
    const data = await prisma.category.create({
      data: {
        name: name.trim()
      },
    })

    //作成されたカテゴリーのidを含むJSONレスポンスを返す
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
