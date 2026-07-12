import axios from 'axios';

const BASE_URL =
  process.env.REACT_APP_API_URL || 'https://aspirant-server.vercel.app/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

export const getSubjects = () => api.get('/subjects');
export const getTopics = (subjectId) =>
  api.get('/topics', { params: { subject: subjectId } });
export const getQuestions = (params) => api.get('/questions', { params });
export const getDates = (topicId) =>
  api.get('/questions/dates', { params: { topic: topicId } });

// Tests
export const getTests = () => api.get('/tests');
export const generateTest = (testId, body = {}) => api.post(`/tests/${testId}/generate`, body);

// Current Affairs
export const getCurrentAffairs = (params) => api.get('/current-affairs', { params });

// Marks (server-side sync)
export const getMarks = (testId) => api.get(`/marks/${testId}`);
export const setMark = (testId, questionId, mark) =>
  api.put(`/marks/${testId}/${questionId}`, { mark });
export const removeMark = (testId, questionId) =>
  api.delete(`/marks/${testId}/${questionId}`);
