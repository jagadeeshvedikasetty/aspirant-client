import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

export const getSubjects = () => api.get('/subjects');
export const getTopics = (subjectId) =>
  api.get('/topics', { params: { subject: subjectId } });
export const getQuestions = (params) => api.get('/questions', { params });
export const getDates = (topicId) =>
  api.get('/questions/dates', { params: { topic: topicId } });
