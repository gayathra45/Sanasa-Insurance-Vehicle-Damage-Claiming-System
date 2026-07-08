import * as ImageManipulator from "expo-image-manipulator";

/**
 * Compresses and resizes an image on mobile (React Native / Expo) using expo-image-manipulator.
 * @param uri The local URI of the image to compress.
 * @param maxWidth The target maximum width of the image.
 * @param quality Compression quality from 0 (lowest) to 1 (highest).
 * @returns A promise that resolves to the compressed image base64 string formatted as Data URL.
 */
export const compressImageMobile = async (
  uri: string,
  maxWidth: number = 1024,
  quality: number = 0.7
): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    return `data:image/jpeg;base64,${result.base64}`;
  } catch (error) {
    console.error("❌ Mobile image compression failed:", error);
    throw error;
  }
};
