import React, { useState } from 'react';
import { 
  User, Mail, Briefcase, Calendar, GraduationCap, 
  Award, TrendingUp, Trash2, Edit 
} from 'lucide-react';

/* ✅ Modal xem đầy đủ */
/* ✅ Modal xem đầy đủ */
const PreviewModal = ({ candidate, onClose }) => {
  if (!candidate) return null;

  const score = Number(candidate.project_score || 0);
  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-blue-600 bg-blue-100';
    if (score >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };
  const getScoreLabel = (score) => {
    if (score >= 8) return 'Xuất sắc';
    if (score >= 6) return 'Tốt';
    if (score >= 4) return 'Khá';
    return 'Trung bình';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-[90%] md:w-2/3 max-h-[85vh] overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold">{candidate.full_name}</h3>
          <button onClick={onClose} className="text-gray-500">Đóng</button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600 flex items-center gap-2">
            <Mail size={16} /> {candidate.email}
          </p>
          <p className="text-gray-600 flex items-center gap-2">
            <Briefcase size={16} /> {candidate.role}
          </p>
          <p className="text-gray-600 flex items-center gap-2">
            <Calendar size={16} /> {candidate.years_exp} năm kinh nghiệm
          </p>

          {/* EDUCATION */}
          {Array.isArray(candidate.education) && candidate.education.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                <GraduationCap size={16} /> Học vấn
              </h4>
              <div className="space-y-2">
                {candidate.education.map((edu, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">{edu.school}</div>
                    <div className="text-sm text-gray-600">{edu.degree} - {edu.major}</div>
                    <div className="text-xs text-gray-500">{edu.time}</div>
                    {edu.gpa != null && <div className="text-blue-600 font-semibold">GPA: {edu.gpa}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROJECTS */}
          {Array.isArray(candidate.projects) && candidate.projects.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                <TrendingUp size={16} /> Dự án
              </h4>
              <div className="space-y-2">
                {candidate.projects.map((p, i) => (
                  <div key={i} className="bg-blue-50 p-3 rounded">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-600">{p.description}</div>
                    <div className="text-sm font-semibold text-blue-600">Điểm: {p.score}/10</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SKILLS */}
          {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{skill}</span>
              ))}
            </div>
          )}

          {candidate.file_source && (
            <div className="text-xs mt-2 text-gray-400">Nguồn: {candidate.file_source}</div>
          )}

          {/* Score */}
          <div className="flex items-center gap-4 mt-2">
            <div className="text-3xl font-bold">{score}/10</div>
            <div className={`px-3 py-1 rounded ${getScoreColor(score)}`}>{getScoreLabel(score)}</div>
            <div className="text-xs text-gray-400">Độ phù hợp</div>
          </div>
        </div>
      </div>
    </div>
  );
};


const CandidateCard = ({ candidate, onDelete, onEdit }) => {
  const [showFull, setShowFull] = useState(false);

  return (
    <>
      <div className="card hover:shadow-lg relative cursor-pointer"
           style={{ height: '250px', overflow: 'hidden' }}
           onClick={() => setShowFull(true)}>

        {/* ACTION BUTTONS */}
        <div className="absolute top-3 right-3 flex gap-2 z-10" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onEdit?.(candidate)} className="p-2 bg-blue-50 text-blue-600 rounded">
            <Edit size={16} />
          </button>
          <button
            onClick={() => confirm(`Xoá "${candidate.full_name}"?`) && onDelete?.(candidate.id)}
            className="p-2 bg-red-50 text-red-600 rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* CARD CONTENT */}
        <div className="flex flex-col justify-between h-full p-4 gap-2">

          <div>
            <h3 className="text-xl font-bold flex gap-2 items-center">
              <User size={20} /> {candidate.full_name}
            </h3>

            <p className="text-gray-500 flex gap-2 items-center text-sm">
              <Briefcase size={16} /> {candidate.role}
            </p>

            {candidate.email && (
              <p className="text-gray-500 flex gap-2 items-center text-sm">
                <Mail size={16} /> {candidate.email}
              </p>
            )}

            <p className="text-gray-500 flex gap-2 items-center text-sm mt-1">
              <Calendar size={16} /> {candidate.years_exp} năm kinh nghiệm
            </p>

            {/* Hiển thị 1-2 skills */}
            <div className="flex flex-wrap gap-2 mt-2">
              {candidate.skills?.slice(0, 2).map((skill, idx) => (
                <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* FULL PREVIEW */}
      <PreviewModal candidate={showFull ? candidate : null} onClose={() => setShowFull(false)} />
    </>
  );
};

export default CandidateCard;
