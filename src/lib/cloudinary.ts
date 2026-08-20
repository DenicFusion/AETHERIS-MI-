export async function uploadToCloudinary(file: File): Promise<{ url: string; type: 'image' | 'video' }> {
  try {
    const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary environment variables are missing.");
    }

    const isVideo = file.type.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    if (!isVideo) {
      // Basic optimization for images
      formData.append('fetch_format', 'auto');
      formData.append('quality', 'auto');
    }

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Cloudinary error response:", errText);
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { url: data.secure_url, type: resourceType };
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new Error(error.message || "Failed to upload file");
  }
}
