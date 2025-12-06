import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Upload CV file
 * @param {File} file - PDF file
 * @returns {Promise}
 */
export const uploadCV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/api/candidates', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * Search candidates with JD
 * @param {string} jdText - Job description text
 * @param {number} minExp - Minimum years of experience
 * @param {number} topK - Number of results
 * @param {string} requiredSkills - Comma-separated skills
 * @returns {Promise}
 */
export const searchCandidates = async (jdText, minExp = 0, topK = 10, requiredSkills = '') => {
  const formData = new FormData();
  formData.append('jd_text', jdText);
  formData.append('min_exp', minExp.toString());
  formData.append('top_k', topK.toString());
  if (requiredSkills) {
    formData.append('required_skills', requiredSkills);
  }
  
  const response = await api.post('/api/search', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * Get all candidates
 * @param {number} limit - Max number of candidates
 * @returns {Promise}
 */
export const getAllCandidates = async (limit = 100) => {
  const response = await api.get('/api/candidates', {
    params: { limit }
  });
  return response.data;
};

/**
 * Delete a candidate
 * @param {string} candidateId - Candidate ID
 * @returns {Promise}
 */
export const deleteCandidate = async (candidateId) => {
  const response = await api.delete(`/api/candidates/${candidateId}`);
  return response.data;
};

/**
 * Get system statistics
 * @returns {Promise}
 */
export const getStats = async () => {
  const response = await api.get('/api/stats');
  return response.data;
};

/**
 * Check if backend is online
 * @returns {Promise}
 */
export const checkHealth = async () => {
  const response = await api.get('/');
  return response.data;
};

export default api;