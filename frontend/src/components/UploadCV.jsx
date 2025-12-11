import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { uploadCV } from '../services/api';

const UploadCV = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  /* ------------------------ Helper ------------------------ */
  const normalizeResponse = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    // axios response → { data }
    if ('data' in raw) {
      const wrapper = raw.data;
      if (wrapper && typeof wrapper === 'object') {
        if ('data' in wrapper) return wrapper.data;     // UploadResponse
        return wrapper;                                 // CandidateData
      }
    }

    // UploadResponse trực tiếp
    if ('data' in raw) return raw.data;

    // CandidateData trực tiếp
    if ('full_name' in raw || 'role' in raw) return raw;

    return null;
  };

  /* ------------------------ File Upload ------------------------ */
  const handleFileUpload = async (file) => {
    if (!file.name.endsWith('.pdf'))
      return setUploadStatus({ type: 'error', message: 'Chỉ chấp nhận file PDF' });

    if (file.size > 10 * 1024 * 1024)
      return setUploadStatus({ type: 'error', message: 'File vượt quá 10MB' });

    setUploading(true);
    setUploadStatus(null);
    setUploadedFile(file);

    try {
      const raw = await uploadCV(file);
      const candidate = normalizeResponse(raw);

      if (!candidate)
        return setUploadStatus({ type: 'error', message: 'Phản hồi server không hợp lệ.' });

      const safeSkills = Array.isArray(candidate.skills) ? candidate.skills : [];

      setUploadStatus({
        type: 'success',
        message: `Đã xử lý CV của ${candidate.full_name || '(Không rõ)'}`,
        data: { ...candidate, skills: safeSkills }
      });

      onUploadSuccess?.(candidate);

    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message || 'Lỗi upload CV';
      setUploadStatus({ type: 'error', message: detail });
    } finally {
      setUploading(false);
    }
  };

  /* ------------------------ Drag & Drop ------------------------ */
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileUpload(f);
  };

  const openFileDialog = () => fileInputRef.current?.click();

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Upload className="text-blue-600" size={28} />
        Upload CV
      </h2>

      {/* Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer 
          transition-all duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => handleFileUpload(e.target.files?.[0])}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader className="animate-spin text-blue-600" size={48} />
            <p className="font-medium text-gray-600">Đang xử lý CV...</p>
            {uploadedFile && <p className="text-sm text-gray-500">{uploadedFile.name}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-blue-100 p-4 rounded-full">
              <FileText className="text-blue-600" size={40} />
            </div>
            <p className="text-lg font-semibold text-gray-700">Kéo thả PDF vào đây</p>
            <p className="text-sm text-gray-500">(hoặc click để chọn file — tối đa 10MB)</p>
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
              : 'bg-red-50 border border-red-200'}
          `}
        >
          {uploadStatus.type === 'success'
            ? <CheckCircle className="text-green-600" size={24} />
            : <AlertCircle className="text-red-600" size={24} />
          }

          <div>
            <p className={uploadStatus.type === 'success' ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
              {uploadStatus.message}
            </p>

            {uploadStatus.data && (
              <div className="mt-2 text-sm text-gray-700">
                <p><strong>Vị trí:</strong> {uploadStatus.data.role}</p>
                <p><strong>Kinh nghiệm:</strong> {uploadStatus.data.years_exp} năm</p>
                <p><strong>Kỹ năng:</strong> {uploadStatus.data.skills.join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadCV;
