/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';

interface UseImageUploadReturn {
  previewUrl: string | null;
  removeImage: () => void;
  updatePreview: (url: string) => void;
  uploadError: string | null;
}

export function useImageUpload(initialUrl: string | null = null): UseImageUploadReturn {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const removeImage = useCallback(() => {
    setPreviewUrl(null);
    setUploadError(null);
  }, []);

  const updatePreview = useCallback((url: string) => {
    setPreviewUrl(url);
  }, []);

  return {
    previewUrl,
    removeImage,
    updatePreview,
    uploadError
  };
}
