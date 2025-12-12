import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { uploadCV } from '../services/api';
import { MODEL_PROVIDERS } from "../modelConfig";   

const UploadCV = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const [provider, setProvider] = useState("");     
  const [model, setModel] = useState("");           

  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  /* ------------------------ Helper ------------------------ */
  const normalizeResponse = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    if ('data' in raw) {
      const w = raw.data;
      if (w && typeof w === 'object') {
        if ('data' in w) return w.data;
        return w;
      }
    }
    if ('full_name' in raw) return raw;
    return null;
  };

  /* ------------------------ Upload ------------------------ */
  const handleFileUpload = async (file) => {
    if (!provider || !model) {
      return setUploadStatus({ type: "error", message: "Vui lòng chọn provider và model." });
    }

    if (!file.name.endsWith('.pdf'))
      return setUploadStatus({ type: 'error', message: 'Chỉ chấp nhận file PDF' });

    if (file.size > 10 * 1024 * 1024)
      return setUploadStatus({ type: 'error', message: 'File vượt quá 10MB' });

    setUploading(true);
    setUploadStatus(null);
    setUploadedFile(file);

    try {
      const raw = await uploadCV(file, { provider, model });   
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
      console.error('Upload error:', error);
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

  const openFileDialog = () => {
    if (!provider || !model) {
      setUploadStatus({ type: "error", message: "Vui lòng chọn provider và model trước" });
      return;
    }
    fileInputRef.current?.click();
  };

  /* ------------------------ JSX ------------------------ */
  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Upload className="text-blue-600" size={28} />
        Upload CV
      </h2>

      {/* Upload Box */}
      <div
        onDragOver={!provider || !model ? undefined : handleDragOver}
        onDragLeave={!provider || !model ? undefined : handleDragLeave}
        onDrop={!provider || !model ? undefined : handleDrop}
        onClick={openFileDialog}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer 
          transition-all duration-200
          ${!provider || !model ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60' : ''}
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
          disabled={!provider || !model || uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader className="animate-spin text-blue-600" size={48} />
            <p className="font-medium text-gray-600">Đang xử lý CV...</p>
            {uploadedFile && <p className="text-sm text-gray-500">{uploadedFile.name}</p>}
          </div>
        ) : !provider || !model ? (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-gray-200 p-4 rounded-full">
              <FileText className="text-gray-400" size={40} />
            </div>
            <p className="text-lg font-semibold text-gray-500">Chọn Provider & Model trước</p>
            <p className="text-sm text-gray-400">(Vui lòng hoàn thành các bước setup ở dưới)</p>
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

      {/* Provider */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
        <select
          className="input-field w-full"
          value={provider}
          disabled={uploading}
          onChange={(e) => {
            setProvider(e.target.value);
            setModel(""); 
          }}
        >
          <option value="">-- Chọn Provider --</option>

          {Object.entries(MODEL_PROVIDERS).map(([key, p]) => (
            <option key={key} value={key}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>

        <select
          className="input-field w-full"
          value={model}
          disabled={!provider || uploading}
          onChange={(e) => setModel(e.target.value)}
        >
          <option value="">-- Chọn Model --</option>

          {provider &&
            MODEL_PROVIDERS[provider].models.map(m => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))
          }
        </select>
      </div>

      {/* Status */}
      {uploadStatus && (
        <div
          className={`
            mt-4 p-4 rounded-lg flex items-start gap-3 animate-slide-in
            ${uploadStatus.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border-red-200 border'}
          `}
        >
          {uploadStatus.type === 'success'
            ? <CheckCircle className="text-green-600" size={24} />
            : <AlertCircle className="text-red-600" size={24} />
          }

          <div>
            <p className={uploadStatus.type === 'success'
              ? 'text-green-800 font-medium'
              : 'text-red-800 font-medium'}>
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
