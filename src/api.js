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
export const generateTest = (testId) => api.get(`/tests/${testId}/generate`);
