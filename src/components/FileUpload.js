import React, { useState, useRef } from 'react';

/**
 * File upload component with drag and drop
 * @param {Function} onFileSelect - Callback when file is selected
 * @param {Array} acceptedTypes - Array of accepted file types
 * @param {string} title - Upload area title
 * @param {boolean} disabled - Whether upload is disabled
 */
const FileUpload = ({ onFileSelect, acceptedTypes = [], title = 'Upload File', disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = async (files) => {
    setIsUploading(true);
    try {
      // Check all files for type validity
      for (const file of files) {
        if (acceptedTypes.length > 0) {
          const fileExtension = file.name.toLowerCase().split('.').pop();
          if (!acceptedTypes.includes(`.${fileExtension}`)) {
            throw new Error(`File type .${fileExtension} is not supported.`);
          }
        }
      }
      await onFileSelect(files);
    } catch (error) {
      console.error('Error handling files:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="mt-2 text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <svg
              className="w-12 h-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">{title}</p>
            <p className="text-sm text-gray-500">
              Drag and drop files here, or click to select files
            </p>
            {acceptedTypes.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Accepted types: {acceptedTypes.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload; 