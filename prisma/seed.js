const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const quizTypes = [
  {
    name: "УГАДАЙ ПО ФОТО",
    slug: "photo",
    type: "photo",
    topics: [
      ["Угадай фильм по глазам", "Крупные планы, знакомые взгляды и киношная интуиция."],
      ["Угадай актера по силуэту", "Силуэты звезд, которые должны узнать настоящие киноманы."],
      ["Угадай мультфильм по кадру", "Яркие кадры из мультфильмов для теплого вечера."]
    ]
  },
  {
    name: "УГАДАЙ ПО МУЗЫКЕ",
    slug: "music",
    type: "music",
    topics: [
      ["Угадай сериал по саундтреку", "Короткие фрагменты заставок и тем из сериалов."],
      ["Угадай фильм по музыке", "Один мотив может выдать целую историю."],
      ["Угадай игру по OST", "Игровые темы для тех, кто узнает миры по первым нотам."]
    ]
  },
  {
    name: "УГАДАЙ ПО ВИДЕО",
    slug: "video",
    type: "video",
    topics: [
      ["Угадай фильм по сцене", "Короткие сцены без подсказок и лишних деталей."],
      ["Угадай клип по фрагменту", "Музыкальные видео, которые нужно узнать за несколько секунд."],
      ["Угадай сериал по короткому видео", "Сцены, атмосфера и знакомые герои."]
    ]
  }
];

async function main() {
  for (const item of quizTypes) {
    const quizType = await prisma.quizType.upsert({
      where: { type: item.type },
      update: { name: item.name, slug: item.slug },
      create: { name: item.name, slug: item.slug, type: item.type }
    });

    for (const [title, description] of item.topics) {
      const existing = await prisma.topicCard.findFirst({
        where: { title, quizTypeId: quizType.id }
      });

      if (!existing) {
        await prisma.topicCard.create({
          data: { title, description, quizTypeId: quizType.id }
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    prisma.$disconnect().finally(() => process.exit(1));
  });
