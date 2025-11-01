import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { uploadClaim } from "@/api/claims";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const useUpload = () => {
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setProgress({ loaded: 0, total: 100, percentage: 0 });

      try {
        const result = await uploadClaim(formData);
        setProgress({ loaded: 100, total: 100, percentage: 100 });
        return result;
      } catch (error) {
        setProgress({ loaded: 0, total: 100, percentage: 0 });
        throw error;
      }
    },
  });

  const uploadWithProgress = useCallback(
    async (formData: FormData) => {
      return mutation.mutate(formData);
    },
    [mutation],
  );

  return {
    upload: uploadWithProgress,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    progress,
  };
};
