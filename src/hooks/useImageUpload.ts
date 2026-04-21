/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, ChangeEvent } from 'react';

interface UseImageUploadReturn {
  previewUrl: string | null;
  selectedFile: File | null;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeImage: () => void;
  updatePreview: (url: string) => void;
  isUploading: boolean;
  uploadError: string | null;
}

/**
 * A hook to manage image selection and local previewing.
 * Structured to eventually support real storage uploads.
 */
export function useImageUpload(initialUrl: string | null = null): UseImageUploadReturn {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setUploadError('Image size must be smaller than 5MB');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeImage = useCallback(() => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setUploadError(null);
  }, []);

  const updatePreview = useCallback((url: string) => {
    setPreviewUrl(url);
  }, []);

  // Future pseudo-upload method
  // const uploadToStorage = async () => { ... }

  return {
    previewUrl,
    selectedFile,
    handleFileChange,
    removeImage,
    updatePreview,
    isUploading,
    uploadError
  };
}
