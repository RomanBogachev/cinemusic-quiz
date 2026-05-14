import { execFileSync } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

const oldRoot = process.argv[2] ?? "/Users/romanbogachev/docker-projects/quiz";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const username = process.env.ADMIN_USERNAME ?? process.env.ADMIN_EMAIL?.split("@")[0] ?? "";
const password = process.env.ADMIN_PASSWORD ?? "change-me";
const dbPath = path.join(oldRoot, "data/db.sqlite3");
const mediaRoot = path.join(oldRoot, "media");

function sqliteJson(sql) {
  const output = execFileSync("sqlite3", ["-json", dbPath, sql], { encoding: "utf8" });
  return JSON.parse(output || "[]");
}

function extension(filePath) {
  return path.extname(filePath).toLowerCase();
}

function uploadKind(item) {
  const media = item.video || item.image;
  const ext = extension(media);
  if ([".mp4", ".webm", ".mov", ".m4v"].includes(ext)) return "video";
  return "image";
}

async function request(pathname, options = {}) {
  const response = await fetch(`${appUrl}${pathname}`, {
    ...options,
    headers: {
      cookie: globalThis.cookie,
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${pathname}: ${response.status} ${payload.error ?? text}`);
  }
  return { response, payload };
}

async function login() {
  const response = await fetch(`${appUrl}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    throw new Error(`Admin login failed: ${response.status} ${await response.text()}`);
  }
  globalThis.cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
  if (!globalThis.cookie) throw new Error("Admin login did not return a session cookie");
}

async function uploadFile(item) {
  const media = item.video || item.image;
  const absolutePath = path.join(mediaRoot, media);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing media file: ${absolutePath}`);
  }

  const kind = uploadKind(item);
  if (kind === "video" && extension(media) !== ".mp4") {
    throw new Error(`Unsupported legacy video format: ${media}`);
  }

  const formData = new FormData();
  formData.set("kind", kind);
  const file = await import("node:fs").then(({ statSync }) => {
    const stats = statSync(absolutePath);
    return {
      stream: createReadStream(absolutePath),
      size: stats.size,
      name: path.basename(media)
    };
  });

  const blob = new Blob([await new Response(file.stream).arrayBuffer()]);
  formData.set("file", blob, file.name);

  const { payload } = await request("/api/upload", { method: "POST", body: formData });
  return { path: payload.path, kind };
}

async function main() {
  const categories = sqliteJson(`
    select id, title, slug, subtitle, description
    from quizapp_quizcategory
    where is_published = 1
    order by title
  `);

  const items = sqliteJson(`
    select id, category_id as categoryId, movie_title as answer, image, video, caption, notes, ordering
    from quizapp_quizitem
    where is_published = 1
    order by category_id, ordering, id
  `);

  await login();

  const { payload: quizTypes } = await request("/api/categories");
  const photoType = quizTypes.find((item) => item.type === "photo");
  if (!photoType) throw new Error("Photo quiz type not found");

  const { payload: existingTopics } = await request("/api/topics");
  const topicByTitle = new Map(existingTopics.map((topic) => [topic.title, topic]));

  const createdTopics = new Map();
  for (const category of categories) {
    const description = category.description || category.subtitle || "Импортировано из старого квиза.";
    const existing = topicByTitle.get(category.title);
    if (existing) {
      createdTopics.set(category.id, existing);
      continue;
    }
    const { payload: topic } = await request("/api/topics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: category.title,
        description,
        quizTypeId: photoType.id,
        coverImage: null
      })
    });
    createdTopics.set(category.id, topic);
  }

  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    const topic = createdTopics.get(item.categoryId);
    if (!topic) {
      skipped += 1;
      continue;
    }

    if (topic._count?.questions > 0) {
      skipped += 1;
      continue;
    }

    const uploaded = await uploadFile(item);
    await request("/api/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topicCardId: topic.id,
        title: item.caption || null,
        answer: item.answer,
        mediaType: uploaded.kind === "video" ? "video" : "image",
        mediaFilePath: uploaded.path,
        sortOrder: item.ordering ?? 0,
        videoStart: uploaded.kind === "video" ? 0 : null,
        videoEnd: uploaded.kind === "video" ? 10 : null
      })
    });
    imported += 1;
    if (imported % 25 === 0) {
      console.log(`Imported ${imported}/${items.length}`);
    }
  }

  console.log(JSON.stringify({ topics: categories.length, questions: imported, skipped }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
