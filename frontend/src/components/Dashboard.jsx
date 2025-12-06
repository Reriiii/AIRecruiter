import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Database, Activity, RefreshCw } from 'lucide-react';
import { getStats, getAllCandidates } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, candidatesData] = await Promise.all([
        getStats(),
        getAllCandidates(10)
      ]);
      setStats(statsData);
      setCandidates(candidatesData.candidates || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-blue-600" size={32} />
          <span className="ml-3 text-gray-600">Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  // Calculate some statistics
  const totalCandidates = stats?.total_candidates || 0;
  const avgExperience = candidates.length > 0
    ? Math.round(
        candidates.reduce((sum, c) => sum + (c.metadata?.years_exp || 0), 0) / candidates.length
      )
    : 0;

  // Count skills
  const skillsCount = {};
  candidates.forEach(c => {
    const skills = c.metadata?.skills_list?.split(',') || [];
    skills.forEach(skill => {
      const s = skill.trim().toLowerCase();
      if (s) {
        skillsCount[s] = (skillsCount[s] || 0) + 1;
      }
    });
  });

  const topSkills = Object.entries(skillsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={28} />
          Dashboard
        </h2>
        <button
          onClick={fetchData}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Làm mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Candidates */}
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Tổng ứng viên</p>
              <p className="text-4xl font-bold mt-2">{totalCandidates}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-4 rounded-full">
              <Users size={32} />
            </div>
          </div>
        </div>

        {/* Average Experience */}
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Kinh nghiệm TB</p>
              <p className="text-4xl font-bold mt-2">{avgExperience} năm</p>
            </div>
            <div className="bg-white bg-opacity-20 p-4 rounded-full">
              <Activity size={32} />
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Trạng thái DB</p>
              <p className="text-2xl font-bold mt-2">Hoạt động</p>
            </div>
            <div className="bg-white bg-opacity-20 p-4 rounded-full">
              <Database size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Candidates & Top Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Candidates */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Ứng viên gần đây</h3>
          {candidates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có ứng viên nào</p>
          ) : (
            <div className="space-y-3">
              {candidates.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {c.metadata?.full_name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {c.metadata?.role || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-info">
                      {c.metadata?.years_exp || 0} năm
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Skills */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Kỹ năng phổ biến</h3>
          {topSkills.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3">
              {topSkills.map(([skill, count]) => (
                <div key={skill} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {skill}
                      </span>
                      <span className="text-sm text-gray-500">{count} người</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(count / candidates.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;