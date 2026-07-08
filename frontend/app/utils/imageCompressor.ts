/**
 * Compresses an image file client-side using HTML5 canvas.
 * @param file The original image File object.
 * @param maxWidth Maximum width of the compressed image.
 * @param maxHeight Maximum height of the compressed image.
 * @param quality Compression quality from 0 to 1 (e.g. 0.7 for 70%).
 * @returns A promise that resolves to the compressed image as a base64 DataURL.
 */
export const compressImage = (
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.7
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If the file is not an image (e.g. PDF), resolve with raw base64 instead
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Failed to get 2d context"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress and get Data URL
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
