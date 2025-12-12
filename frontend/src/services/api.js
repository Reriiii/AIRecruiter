import axios from 'axios';

// =====================================================================
// CONFIG
// =====================================================================

const API_BASE_URL = 'http://localhost:8000';

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// =====================================================================
// INTERCEPTORS — DEBUG LOGGING
// =====================================================================

// Request logger
api.interceptors.request.use(
  (config) => {
    console.log("[API REQUEST]", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("[API REQUEST ERROR]", error);
    return Promise.reject(error);
  }
);

// Response logger
api.interceptors.response.use(
  (response) => {
    console.log("[API RESPONSE]", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error("[API RESPONSE ERROR]", error);
    return Promise.reject(error);
  }
);

// =====================================================================
// API: Upload CV
// =====================================================================

/**
 * Upload CV PDF file
 * @param {File} file - PDF file to upload
 * @param {string|object} model - Model selector (string "model_id" or object {provider, model})
 */
export const uploadCV = async (file, model = null) => {
  const formData = new FormData();
  formData.append("file", file);

  // Handle both string and object model formats
  if (model) {
    if (typeof model === "object" && model.provider && model.model) {
      // Format: { provider: "openai", model: "gpt-4o" } → "openai:gpt-4o"
      formData.append("model", `${model.provider}:${model.model}`);
    } else if (typeof model === "string") {
      // Already in string format
      formData.append("model", model);
    }
  }

  const response = await api.post("/api/candidates", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

// =====================================================================
// API: Search Candidates
// =====================================================================

/**
 * Search candidates using a job description
 */
export const searchCandidates = async (
  jdText,
  minExp = 0,
  topK = 10,
  requiredSkills = "",
  model = null
) => {
  const formData = new FormData();

  formData.append("jd_text", jdText);
  formData.append("min_exp", minExp.toString());
  formData.append("top_k", topK.toString());

  if (requiredSkills) {
    formData.append("required_skills", requiredSkills);
  }
  if (model) {
    formData.append("model", model);
  }

  const response = await api.post("/api/search", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

// =====================================================================
// API: Get All Candidates
// =====================================================================

export const getAllCandidates = async (limit = 100) => {
  const response = await api.get("/api/candidates", {
    params: { limit },
  });

  return response.data;
};

// =====================================================================
// API: Delete Candidate
// =====================================================================

export const deleteCandidate = async (candidateId) => {
  const response = await api.delete(`/api/candidates/${candidateId}`);
  return response.data;
};

// =====================================================================
// API: System Stats
// =====================================================================

export const getStats = async () => {
  const response = await api.get("/api/stats");
  return response.data;
};

// =====================================================================
// API: Health Check
// =====================================================================

export const checkHealth = async () => {
  const response = await api.get("/");
  return response.data;
};

export default api;
