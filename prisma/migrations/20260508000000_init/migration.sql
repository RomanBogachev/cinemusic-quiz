-- CreateTable
CREATE TABLE "QuizType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TopicCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "quizTypeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TopicCard_quizTypeId_fkey" FOREIGN KEY ("quizTypeId") REFERENCES "QuizType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicCardId" TEXT NOT NULL,
    "title" TEXT,
    "answer" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "mediaFilePath" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "audioStart" REAL,
    "audioEnd" REAL,
    "videoStart" REAL,
    "videoEnd" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_topicCardId_fkey" FOREIGN KEY ("topicCardId") REFERENCES "TopicCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizType_slug_key" ON "QuizType"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "QuizType_type_key" ON "QuizType"("type");

-- CreateIndex
CREATE INDEX "TopicCard_quizTypeId_idx" ON "TopicCard"("quizTypeId");

-- CreateIndex
CREATE INDEX "Question_topicCardId_idx" ON "Question"("topicCardId");

-- CreateIndex
CREATE INDEX "Question_sortOrder_idx" ON "Question"("sortOrder");
