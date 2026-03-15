import apiClient from "@/config/axios.config";
import type { BaseApiResponse } from "@/types";

/**
 * Upload Service
 * Centralizes all file upload operations
 */
class UploadService {
  /**
   * Upload an avatar image
   * @param file The image file to upload
   * @param onProgress Callback for upload progress
   */
  async uploadAvatar(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<BaseApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append("image", file);

    const response = await apiClient.post<BaseApiResponse<{ url: string }>>(
      "/upload/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );

    return response;
  }

  /**
   * Upload a general file
   * @param file The file to upload
   * @param onProgress Callback for upload progress
   */
  async uploadGeneral(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<BaseApiResponse<{ url: string; publicId?: string }>> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<BaseApiResponse<{ url: string; publicId?: string }>>(
      "/upload/general",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );

    return response;
  }

  /**
   * Upload multiple files in parallel
   * @param files Array of files to upload
   * @param type Upload type
   * @param onProgress Callback for aggregated progress
   */
  async uploadMultiple(
    files: File[],
    type: "avatar" | "general" = "general",
    onProgress?: (percent: number) => void
  ): Promise<BaseApiResponse<{ url: string; publicId?: string }[]>> {
    const totalFiles = files.length;
    const progressMap = new Map<number, number>();

    const uploadPromises = files.map((file, index) => {
      const singleProgress = (percent: number) => {
        progressMap.set(index, percent);
        if (onProgress) {
          const totalProgress = Array.from(progressMap.values()).reduce((a, b) => a + b, 0);
          onProgress(Math.round(totalProgress / totalFiles));
        }
      };

      return type === "avatar" 
        ? this.uploadAvatar(file, singleProgress) 
        : this.uploadGeneral(file, singleProgress);
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results
        .filter(r => r.success && r.data)
        .map(r => r.data!);

      return {
        success: true,
        data: successfulUploads,
        message: `Đã tải lên ${successfulUploads.length}/${totalFiles} tệp tin`,
      };
    } catch (error) {
      console.error("[UploadService] uploadMultiple error:", error);
      throw error;
    }
  }

  /**
   * Delete a file
   * @param publicId Or URL of the file to delete
   */
  async deleteFile(fileId: string): Promise<BaseApiResponse<void>> {
    return apiClient.delete(`/upload/file`, {
      params: { publicId: fileId },
    });
  }
}

export const uploadService = new UploadService();
export default uploadService;
