import React, { useState, useEffect } from 'react';
import { 
  Home, Upload, Search, BarChart3, 
  Cpu, Shield, Zap, Github 
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import UploadCV from './components/UploadCV';
import SearchCandidates from './components/SearchCandidates';
import { checkHealth } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Check backend health on mount
    checkHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  const handleUploadSuccess = () => {
    // Refresh dashboard when upload succeeds
    setRefreshKey(prev => prev + 1);
    // Show notification
    setTimeout(() => {
      alert('CV đã được xử lý thành công! Bạn có thể tìm kiếm ứng viên này trong tab Tìm kiếm.');
    }, 500);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'upload', label: 'Upload CV', icon: Upload },
    { id: 'search', label: 'Tìm kiếm', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                <Cpu className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Local Smart ATS
                </h1>
                <p className="text-sm text-gray-500">
                  AI-Powered Recruitment System
                </p>
              </div>
            </div>

            {/* Status & Features */}
            <div className="flex items-center gap-4">
              {/* Backend Status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  backendStatus === 'online' ? 'bg-green-500 animate-pulse' :
                  backendStatus === 'offline' ? 'bg-red-500' :
                  'bg-yellow-500 animate-pulse'
                }`} />
                <span className="text-sm text-gray-600">
                  Backend {backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Checking...'}
                </span>
              </div>

              {/* Features Badge */}
              <div className="hidden md:flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                <Shield className="text-blue-600" size={16} />
                <span className="text-sm font-medium text-blue-700">100% Offline</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-3 font-medium text-sm
                    border-b-2 transition-all duration-200
                    ${activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {backendStatus === 'offline' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <Zap className="text-red-600" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-red-900">Backend không khả dụng</h3>
                <p className="text-sm text-red-700 mt-1">
                  Không thể kết nối tới backend server. Vui lòng kiểm tra xem server có đang chạy tại http://localhost:8000 không.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 text-sm text-red-600 font-medium hover:underline"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="animate-slide-in">
          {activeTab === 'dashboard' && <Dashboard key={refreshKey} />}
          {activeTab === 'upload' && <UploadCV onUploadSuccess={handleUploadSuccess} />}
          {activeTab === 'search' && <SearchCandidates />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              © 2025 Local Smart ATS. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield size={16} className="text-green-600" />
                <span>Privacy-First Design</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Cpu size={16} className="text-blue-600" />
                <span>Powered by Local AI</span>
              </div>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <Github size={16} />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;