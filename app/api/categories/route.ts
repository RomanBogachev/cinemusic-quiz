import { NextResponse } from "next/server";
import { ensureCategories } from "@/lib/ensureCategories";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureCategories();

  const categories = await prisma.quizType.findMany({
    orderBy: { type: "asc" },
    include: { _count: { select: { topics: true } } }
  });

  return NextResponse.json(categories);
}
