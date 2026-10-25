const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export type UploadedImage = {
  url: string;
  publicId?: string;
};

export async function uploadImages(files: FileList | File[]): Promise<UploadedImage[]> {
  const selectedFiles = Array.from(files);

  if (selectedFiles.length === 0) {
    return [];
  }

  if (selectedFiles.length > 5) {
    throw new Error("You can upload a maximum of 5 images.");
  }

  for (const file of selectedFiles) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`${file.name} is not an image.`);
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`${file.name} exceeds the 5 MB limit.`);
    }
  }

  const uploadedImages: UploadedImage[] = await Promise.all(
    selectedFiles.map(async (file) => {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || `Failed to upload ${file.name}`
        );
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    })
  );

  return uploadedImages;
}
