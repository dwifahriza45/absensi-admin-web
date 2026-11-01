import { requestBlob } from "./client";
export const photoApi = {
  fetchBlob: (photoId: string) =>
    requestBlob(`/api/v1/admin/photos/${encodeURIComponent(photoId)}`),
};
