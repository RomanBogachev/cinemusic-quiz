import type { Area } from "react-easy-crop";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Не удалось обработать изображение")));
    image.src = src;
  });
}

export async function getCroppedImage(imageSrc: string, pixelCrop: Area, outputWidth = 1280, outputHeight = 720): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas не поддерживается браузером");
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, outputWidth, outputHeight);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Не удалось обработать изображение"));
        }
      },
      "image/jpeg",
      0.9
    );
  });
}
