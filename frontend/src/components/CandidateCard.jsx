import React from 'react';
import { User, Mail, Briefcase, Calendar, GraduationCap, Award, TrendingUp } from 'lucide-react';

const CandidateCard = ({ candidate }) => {
  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-blue-600 bg-blue-100';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Xuất sắc';
    if (score >= 0.6) return 'Tốt';
    if (score >= 0.4) return 'Khá';
    return 'Trung bình';
  };

  const scorePercentage = Math.round(candidate.score * 100);

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200 animate-slide-in">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        {/* Left Side - Info */}
        <div className="flex-1">
          {/* Name & Role */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User size={22} className="text-blue-600" />
              {candidate.full_name}
            </h3>
            <p className="text-gray-600 font-medium mt-1 flex items-center gap-2">
              <Briefcase size={18} className="text-gray-400" />
              {candidate.role}
            </p>
          </div>

          {/* Contact */}
          {candidate.email !== 'N/A' && (
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
              <Mail size={16} className="text-gray-400" />
              <a href={`mailto:${candidate.email}`} className="hover:text-blue-600">
                {candidate.email}
              </a>
            </div>
          )}

          {/* Experience & Education */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-gray-700">
                <strong>{candidate.years_exp}</strong> năm kinh nghiệm
              </span>
            </div>
            {candidate.education !== 'N/A' && (
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap size={16} className="text-gray-400" />
                <span className="text-gray-700">{candidate.education}</span>
              </div>
            )}
          </div>

          {/* Skills */}
          {candidate.skills_list && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Award size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Kỹ năng:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {candidate.skills_list.split(',').map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* File Source */}
          {candidate.file_source && (
            <div className="text-xs text-gray-400 mt-2">
              Nguồn: {candidate.file_source}
            </div>
          )}
        </div>

        {/* Right Side - Score */}
        <div className="flex flex-col items-center justify-center md:w-32 border-l-0 md:border-l border-gray-200 md:pl-6">
          <div className="relative">
            {/* Circular Progress */}
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - candidate.score)}`}
                className={`${getScoreColor(candidate.score).split(' ')[0]} transition-all duration-500`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">
                {scorePercentage}%
              </span>
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className={`badge ${getScoreColor(candidate.score)} flex items-center gap-1`}>
              <TrendingUp size={14} />
              {getScoreLabel(candidate.score)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Độ phù hợp</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateCard;