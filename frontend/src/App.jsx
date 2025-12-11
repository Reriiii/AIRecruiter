import React, { useState, useEffect } from 'react';
import { 
  Home, Upload, Search, BarChart3, 
  Cpu, Shield, Zap, Github 
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import UploadCV from './components/UploadCV';
import SearchCandidates from './components/SearchCandidates';
import CandidateList from './components/CandidateList';
import { checkHealth } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    checkHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'upload', label: 'Upload CV', icon: Upload },
    { id: 'list', label: 'Danh sách CV', icon: Home },
    { id: 'search', label: 'Tìm kiếm', icon: Search }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                <Cpu className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AIRecruiter</h1>
                <p className="text-sm text-gray-500">AI-Powered Recruitment System</p>
              </div>
            </div>

            {/* Backend Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    backendStatus === 'online'
                      ? 'bg-green-500 animate-pulse'
                      : backendStatus === 'offline'
                      ? 'bg-red-500'
                      : 'bg-yellow-500 animate-pulse'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  Backend {backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Checking...'}
                </span>
              </div>

              <div className="hidden md:flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                <Shield className="text-blue-600" size={16} />
                <span className="text-sm font-medium text-blue-700">100% Offline</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 -mb-px">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  flex items-center gap-2 px-6 py-3 font-medium text-sm
                  border-b-2 transition-all duration-200
                  ${
                    activeTab === id
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
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
                  Vui lòng kiểm tra server backend tại http://localhost:8000
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
          {activeTab === 'list' && <CandidateList />}
          {activeTab === 'search' && <SearchCandidates />}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                href="https://github.com/Reriiii/AIRecruiter"
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
