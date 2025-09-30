import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireUser /*, assertRole */ } from "@/app/api/_lib/auth";

//Prismaクライアント生成
//PrismaORMを通じてデータベースにアクセスするためのクライアント
const prisma = new PrismaClient();

//全体の概要
//Prisma ORMを使って、記事データ(Post)を取得(GET)または作成(POST)する。記事はカテゴリ(Category)と多対多のリレーションを持ち、中間テーブルpostCategoryを通じて接続する。

// 記事作成のリクエストボディ型(受け取るリクエストボディ)
interface CreatePostRequestBody {
  title: string;
  content: string;
  categories: { id: number }[]; // 中間テーブル用のカテゴリID配列(オブジェクトの配列)
  thumbnailUrl: string;
}

// ---- GET /api/admin/posts ----
//管理者　記事一覧取得API
//GETリクエスト処理:記事一覧の取得
export const GET = async (req: NextRequest) => {
  // ★ 認証ガード（直書き）
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  // 必要ならロール制御
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });


  try {
    //post.findMany()を使って全記事を取得。
    //各記事が持つpostCategories(中間テーブル)と、その中のcategory情報(id,name)をincludeで取得。
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


// ---- POST /api/admin/posts ----
// POSTという命名にすることで、POSTリクエストの時にこの関数が呼ばれる
//管理者　記事新規作成API
//POSTリクエスト処理:記事の新規作成
export const POST = async (req: NextRequest ) => {
  // ★ 認証ガード（直書き）
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });

  try {
    // リクエストのbodyを取得
    const body: unknown = await req.json();

    // bodyの中からtitle, content, categories, thumbnailUrlを取り出す
    const { title, content, categories, thumbnailUrl } =
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


    // 失敗時にまとめてロールバックされるようトランザクションで実行
    const created = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: { title: title.trim(), content: content.trim(), thumbnailUrl: thumbnailUrl ?? "" },
      });

      // sqlite 環境などで createMany が使えない前提 → for...of で1件ずつ
      for (const category of categories) {
        await tx.postCategory.create({
          data: { postId: post.id, categoryId: category.id },
        });
      }

      return post;
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
