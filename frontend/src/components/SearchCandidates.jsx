import React, { useState } from "react";
import { Search, Loader, Filter, Sparkles } from "lucide-react";
import { searchCandidates } from "../services/api";
import CandidateCard from "./CandidateCard.jsx";
import { MODEL_PROVIDERS } from "../modelConfig";

const SearchCandidates = () => {
  const [jdText, setJdText] = useState("");
  const [minExp, setMinExp] = useState(0);
  const [topK, setTopK] = useState(10);
  const [requiredSkills, setRequiredSkills] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // NEW — Provider + Model
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");

  const handleSearch = async () => {
    if (!jdText.trim()) {
      alert("Vui lòng nhập mô tả công việc");
      return;
    }
    if (!provider || !model) {
      alert("Hãy chọn provider và model AI");
      return;
    }

    setSearching(true);
    try {
      // Pass model as "provider:model_id" format to backend
      const modelParam = `${provider}:${model}`;
      const data = await searchCandidates(
        jdText,
        minExp,
        topK,
        requiredSkills,
        modelParam
      );

      setResults(data);
    } catch (error) {
      console.error("❌ Search error:", error);
      const errorMsg = error?.response?.data?.detail || "Lỗi khi tìm kiếm";
      alert(errorMsg);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && e.ctrlKey) handleSearch();
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="text-blue-600" size={28} />
          Tìm Kiếm Ứng Viên Thông Minh
        </h2>

        {/* Job Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mô tả công việc (Job Description)
          </label>
          <textarea
            className="input-field min-h-[150px] resize-y"
            placeholder="Nhập mô tả công việc..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <p className="text-xs text-gray-500 mt-1">
            Nhấn Ctrl + Enter để tìm kiếm nhanh
          </p>
        </div>

        {/* Provider */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provider AI
          </label>
          <select
            className="input-field w-full"
            value={provider}
            onChange={(e) => {
              const p = e.target.value;
              setProvider(p);
              setModel(""); // reset model
            }}
          >
            <option value="">-- Chọn Provider --</option>
            {Object.entries(MODEL_PROVIDERS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model AI
          </label>
          <select
            className="input-field w-full"
            value={model}
            disabled={!provider}
            onChange={(e) => setModel(e.target.value)}
          >
            {!provider && <option>Chọn provider trước</option>}
            {provider &&
              MODEL_PROVIDERS[provider].models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
          </select>
        </div>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary mb-4 flex items-center gap-2"
        >
          <Filter size={18} />
          {showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc nâng cao"}
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kinh nghiệm tối thiểu (năm)
              </label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={minExp}
                onChange={(e) => setMinExp(parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lượng kết quả (Top-K)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                className="input-field"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value) || 10)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kỹ năng bắt buộc
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="python, docker, aws"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={searching || !jdText.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {searching ? (
            <>
              <Loader className="animate-spin" size={20} />
              Đang tìm kiếm...
            </>
          ) : (
            <>
              <Search size={20} />
              Tìm Ứng Viên Phù Hợp
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">
              Kết quả tìm kiếm ({results.total} ứng viên)
            </h3>

            {results.query_info && (
              <div className="text-sm text-gray-500">
                {results.query_info.min_exp > 0 && (
                  <span className="badge badge-info mr-2">
                    Tối thiểu {results.query_info.min_exp} năm KN
                  </span>
                )}

                {results.query_info.required_skills &&
                  results.query_info.required_skills.length > 0 && (
                    <span className="badge badge-warning">
                      Yêu cầu: {results.query_info.required_skills.join(", ")}
                    </span>
                  )}
              </div>
            )}
          </div>

          {results.matches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>Không tìm thấy ứng viên phù hợp</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.matches.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchCandidates;
