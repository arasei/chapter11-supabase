//Prisma の DB クライアントを使うための import。
import { PrismaClient } from "@prisma/client";
//App Router の API で使うリクエスト/レスポンス型。
import { NextRequest, NextResponse } from "next/server";
//認証ガード。未ログインのアクセスを弾く。assertRole は将来の権限チェック用。
import { requireUser /*, assertRole */ } from "@/app/api/_lib/auth";

//全体の概要
// 認証済みユーザー向けに、Prismaで記事一覧(Post)を取得(GET)し（カテゴリも同時取得）、新規記事をカテゴリー(Category)関連付きで作成する(POST) Next.js App Router の管理APIです。


//イメージ
// 裏方の受付係が2人います。
// GET係：倉庫（DB）から記事の箱を新しい順に取り出し、箱に入っている「カテゴリーラベル」も一緒にくっつけて渡す。
// POST係：新しい記事の箱を作って倉庫に入れ、同時に「この箱はどのラベル（カテゴリー）か」を中間棚（中間テーブル）にも登録します。
// どちらも**鍵（ログイン）**を持つ人だけが使えます。

//Prismaクライアントを生成
//PrismaORMを通じてデータベースにアクセスするためのクライアント
const prisma = new PrismaClient();



// 記事作成(POST)で受け取るリクエストボディの型
interface CreatePostRequestBody {
  title: string;
  content: string;
  categories: { id: number }[]; // 中間テーブル用のカテゴリID配列(オブジェクトの配列)
  thumbnailImageKey: string;
}

//管理者　記事一覧取得API
//GET(一覧取得)
// GET /api/admin/postsが呼ばれたときの処理
export const GET = async (req: NextRequest) => {
  //認証ガード（直書き）
  //未ログインの場合は終了
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  // 必要ならロール制御
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });

  //post.findMany()を使って全記事を取得。
  //各記事が持つpostCategories(中間テーブル)と、
  // その中のcategory情報(id,name)をincludeで取得。
  //select で最小限フィールドに絞る
  try {
    const posts = await prisma.post.findMany({
      include: {
        postCategories: {
          include: {
            category: { select: { id: true, name: true },
            },
          },
        },
      },
      //作成日時で降順(新しい順)に並び替え
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ status: "OK", posts: posts }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ status: message }, { status: 400 });
  }
};



//管理者　記事新規作成API
//POST(新規作成)
//POSTリクエストの時にこの関数が呼ばれる
//POST /api/admin/postsが呼ばれたときの処理
export const POST = async (req: NextRequest ) => {
  //認証ガード（直書き）
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });

  try {
    //リクエストのbodyをJSON形式で取得
    const body: unknown = await req.json();

    //bodyの中からtitle, content, categories, thumbnailUrlを取り出す
    //受け取り型へ分割代入。
    const { title, content, categories, thumbnailImageKey } =
      body as CreatePostRequestBody;


    // 簡易バリデーション
    if (!title?.trim())
      return NextResponse.json({ status: "title is required" }, { status: 400 });
    if (!content?.trim())
      return NextResponse.json({ status: "content is required" }, { status: 400 });
    if (!Array.isArray(categories) || categories.length === 0)
      return NextResponse.json({ status: "categories is required" }, { status: 400 });
    if (categories.some((c) => !Number.isInteger(c?.id)))
      return NextResponse.json({ status: "invalid category id" }, { status: 400 });


    // 失敗時にまとめて元の状態に戻すよう一連の処理をまとめて(トランザクション)作成して実行
    const created = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: { title: title.trim(), content: content.trim(), thumbnailImageKey: thumbnailImageKey ?? "" },
      });

      //中間テーブル postCategory にカテゴリ関連をループで追加。
      // sqlite 環境などで createMany が使えない前提 → for...of で1件ずつ
      for (const category of categories) {
        await tx.postCategory.create({
          data: { postId: post.id, categoryId: category.id },
        });
      }

      return post;//作成した post を返してトランザクション終了。
    });

    return NextResponse.json(
      { status: "OK", message: "作成しました", id: created.id },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ status: message }, { status: 400 });
  }
};
