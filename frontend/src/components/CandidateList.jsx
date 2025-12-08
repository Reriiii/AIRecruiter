import React, { useEffect, useState } from 'react';
import { getAllCandidates, deleteCandidate } from '../services/api';
import CandidateCard from './CandidateCard';

const FullModal = ({ item, onClose, onSave }) => {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white rounded-lg shadow-lg z-10 w-[90%] md:w-2/3 p-6">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold">{item.full_name}</h3>
          <button onClick={onClose} className="text-gray-500">Đóng</button>
        </div>

        <div className="mt-4 text-sm text-gray-700 space-y-2">
          <div><strong>Email:</strong> {item.email}</div>
          <div><strong>Vai trò:</strong> {item.role}</div>
          <div><strong>Kinh nghiệm:</strong> {item.years_exp}</div>
          <div><strong>Kỹ năng:</strong> {item.skills?.join(', ')}</div>
          <div className="mt-3"><strong>Thông tin gốc / Metadata:</strong>
            <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-3 rounded mt-2 max-h-56 overflow-auto">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => onSave && onSave(item)} className="px-4 py-2 bg-blue-600 text-white rounded">Lưu</button>
          <button onClick={onClose} className="px-4 py-2 border rounded">Đóng</button>
        </div>
      </div>
    </div>
  );
};

const CandidateList = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busyIds, setBusyIds] = useState(new Set());

  useEffect(() => {
    fetchCandidates();
  }, []);

const fetchCandidates = async () => {
  try {
    setLoading(true);
    const data = await getAllCandidates(100);

    if (!data?.candidates || !Array.isArray(data.candidates)) {
      throw new Error('Sai format dữ liệu từ backend');
    }

    const list = data.candidates.map(c => ({
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      role: c.role,
      years_exp: c.years_exp,
      education: c.education || [],
      skills: c.skills || [],
      projects: c.projects || [],
      file_name: c.file_name,
      file_source: c.file_source,
      created_at: c.created_at,
      gpa: c.gpa,
      project_score: c.project_score
    }));

    setCandidates(list);
  } catch (err) {
    console.error('LOAD CANDIDATES ERROR:', err);
    setError(err.message || 'Không thể tải danh sách ứng viên');
  } finally {
    setLoading(false);
  }
};
  const handleDelete = async (id) => {
    try {
      setBusyIds(prev => new Set(prev).add(id));
      await deleteCandidate(id);
      setCandidates(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('DELETE ERROR', err);
      alert('Xoá thất bại');
    } finally {
      setBusyIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Bạn có chắc muốn xoá toàn bộ ${candidates.length} ứng viên? Đây không thể hoàn tác.`)) return;
    try {
      // disable UI
      setLoading(true);
      // delete sequentially (safer) — có thể đổi sang Promise.all nếu bạn muốn tốc độ
      for (const c of candidates) {
        try {
          await deleteCandidate(c.id);
        } catch (e) {
          console.error('Failed deleting', c.id, e);
        }
      }
      // reload
      await fetchCandidates();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (candidate) => {
    // mở modal chỉnh sửa hoặc điều hướng đến trang edit
    setPreview(candidate);
  };

  const handleShowFull = (candidate) => {
    setPreview(candidate);
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Đang tải danh sách CV...</div>;
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>;
  if (candidates.length === 0) return <div className="text-center py-8 text-gray-500">Chưa có CV nào trong hệ thống</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Danh sách ứng viên</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchCandidates}
            className="px-3 py-1 border rounded text-sm"
          >
            Làm mới
          </button>

          <button
            onClick={handleDeleteAll}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Xoá toàn bộ ({candidates.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {candidates.map(candidate => (
          <div key={candidate.id} className="relative">
            <CandidateCard
              candidate={candidate}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onShowFull={handleShowFull}
            />
            {busyIds.has(candidate.id) && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl">
                <div className="text-sm">Đang xoá...</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview / Edit modal */}
      <FullModal
        item={preview}
        onClose={() => setPreview(null)}
        onSave={(item) => {
          // sample save: here you could call API to update metadata
          alert('Lưu tạm (chưa implement). Bạn có thể implement API cập nhật.');
          setPreview(null);
        }}
      />
    </>
  );
};

export default CandidateList;
