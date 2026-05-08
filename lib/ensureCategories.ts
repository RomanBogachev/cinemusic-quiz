import { CATEGORY_META } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export async function ensureCategories() {
  for (const meta of CATEGORY_META) {
    await prisma.quizType.upsert({
      where: { type: meta.type },
      update: { name: meta.name, slug: meta.type },
      create: { name: meta.name, slug: meta.type, type: meta.type }
    });
  }
}
