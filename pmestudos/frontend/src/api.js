import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('pmestudos_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pmestudos_token');
      localStorage.removeItem('pmestudos_user');
      window.location.hash = '#/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me:       ()     => api.get('/auth/me'),
  update:   (data) => api.put('/auth/me', data),
};

export const questionsAPI = {
  list:   (params) => api.get('/questions', { params }),
  get:    (id)     => api.get(`/questions/${id}`),
  answer: (id, data) => api.post(`/questions/${id}/answer`, data),
  mark:   (id, field) => api.patch(`/questions/${id}/mark`, { field }),
  stats:  ()       => api.get('/questions/stats/me'),
};

export const aiAPI = {
  explain:         (questionId) => api.post(`/ai/explain/${questionId}`),
  generateQuestions: (data)     => api.post('/ai/generate-questions', data),
  extractFromPdf:  (data)       => api.post('/ai/extract-from-pdf', data),
  chat:            (data)       => api.post('/ai/chat', data),
};

export const pdfsAPI = {
  upload: (formData) => api.post('/pdfs/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list:   ()         => api.get('/pdfs'),
  remove: (id)       => api.delete(`/pdfs/${id}`),
};

export const adminAPI = {
  dashboard:     ()       => api.get('/admin/dashboard'),
  users:         ()       => api.get('/admin/users'),
  updateUser:    (id, d)  => api.put(`/admin/users/${id}`, d),
  deleteUser:    (id)     => api.delete(`/admin/users/${id}`),
  questions:     (p)      => api.get('/admin/questions', { params: p }),
  createQuestion:(d)      => api.post('/admin/questions', d),
  updateQuestion:(id, d)  => api.put(`/admin/questions/${id}`, d),
  deleteQuestion:(id)     => api.delete(`/admin/questions/${id}`),
  plans:         ()       => api.get('/admin/plans'),
  updatePlan:    (id, d)  => api.put(`/admin/plans/${id}`, d),
  settings:      ()       => api.get('/admin/settings'),
  saveSettings:  (d)      => api.put('/admin/settings', d),
};

export const plansAPI   = { list: () => api.get('/plans') };
export const progressAPI = {
  me:  ()    => api.get('/progress/me'),
  log: (d)   => api.post('/progress/log', d),
};
export const calendarAPI = {
  list:   ()      => api.get('/calendar'),
  create: (d)     => api.post('/calendar', d),
  update: (id, d) => api.put(`/calendar/${id}`, d),
  remove: (id)    => api.delete(`/calendar/${id}`),
};
export const notifAPI = {
  list:    ()   => api.get('/notifications'),
  read:    (id) => api.patch(`/notifications/${id}/read`),
  readAll: ()   => api.patch('/notifications/read-all'),
};

export default api;
