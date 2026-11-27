/**
 * Сжимает фото перед сохранением (макс. сторона 1000 px, JPEG).
 * В демо-режиме результат хранится как data URL; после подключения Supabase
 * сжатый файл будет загружаться в Storage.
 */
export async function compressImage(file: File, maxSide = 1000, quality = 0.75): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Можно загружать только изображения");
  if (file.size > 10 * 1024 * 1024) throw new Error("Файл больше 10 МБ");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Не удалось прочитать изображение"));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
