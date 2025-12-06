import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { uploadCV } from '../services/api';

const UploadCV = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      setUploadStatus({
        type: 'error',
        message: 'Chỉ chấp nhận file PDF'
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({
        type: 'error',
        message: 'File quá lớn. Kích thước tối đa là 10MB'
      });
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    setUploadedFile(file);

    try {
      const result = await uploadCV(file);
      
      setUploadStatus({
        type: 'success',
        message: `Đã xử lý CV của ${result.data.full_name}`,
        data: result
      });

      // Callback to parent
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }

      // Reset after 3 seconds
      setTimeout(() => {
        setUploadedFile(null);
        setUploadStatus(null);
      }, 3000);

    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.detail || 'Lỗi khi upload CV'
      });
    } finally {
      setUploading(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Upload className="text-blue-600" size={28} />
        Upload CV
      </h2>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader className="animate-spin text-blue-600" size={48} />
            <p className="text-gray-600 font-medium">Đang xử lý CV...</p>
            {uploadedFile && (
              <p className="text-sm text-gray-500">{uploadedFile.name}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-blue-100 p-4 rounded-full">
              <FileText className="text-blue-600" size={40} />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">
                Kéo thả file PDF vào đây
              </p>
              <p className="text-sm text-gray-500 mt-1">
                hoặc click để chọn file (tối đa 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <div
          className={`
            mt-4 p-4 rounded-lg flex items-start gap-3 animate-slide-in
            ${uploadStatus.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
            }
          `}
        >
          {uploadStatus.type === 'success' ? (
            <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
          ) : (
            <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          )}
          <div className="flex-1">
            <p className={`font-medium ${
              uploadStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {uploadStatus.message}
            </p>
            {uploadStatus.data && (
              <div className="mt-2 text-sm text-gray-600">
                <p><strong>Vị trí:</strong> {uploadStatus.data.data.role}</p>
                <p><strong>Kinh nghiệm:</strong> {uploadStatus.data.data.years_exp} năm</p>
                <p><strong>Kỹ năng:</strong> {uploadStatus.data.data.skills.join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadCV;