const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hr_token');
    }
    return null;
  }

  setToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hr_token', token);
    }
  }

  clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hr_token');
      localStorage.removeItem('hr_user');
    }
  }

  setUser(user) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hr_user', JSON.stringify(user));
    }
  }

  getUser() {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('hr_user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = { ...options.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      return response.blob();
    }

    return response.json();
  }

  // Auth
  async register(data) {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    this.setUser(res.user);
    return res;
  }

  async login(data) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    this.setUser(res.user);
    return res;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  logout() {
    this.clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // Jobs
  async createJob(formData) {
    return this.request('/api/jobs', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async getJobs() {
    return this.request('/api/jobs');
  }

  async getJob(id) {
    return this.request(`/api/jobs/${id}`);
  }

  async updateRubric(jobId, rubric) {
    return this.request(`/api/jobs/${jobId}/rubric`, {
      method: 'PUT',
      body: JSON.stringify(rubric),
    });
  }

  async deleteJob(id) {
    return this.request(`/api/jobs/${id}`, { method: 'DELETE' });
  }

  // Candidates
  async uploadCandidates(jobId, files) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.request(`/api/jobs/${jobId}/candidates`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async getCandidates(jobId) {
    return this.request(`/api/jobs/${jobId}/candidates`);
  }

  async getCandidate(id) {
    return this.request(`/api/candidates/${id}`);
  }

  async deleteCandidate(id) {
    return this.request(`/api/candidates/${id}`, { method: 'DELETE' });
  }

  // Screening
  async triggerScreening(jobId) {
    return this.request(`/api/jobs/${jobId}/screen`, { method: 'POST' });
  }

  async getResults(jobId) {
    return this.request(`/api/jobs/${jobId}/results`);
  }

  async getCandidateResult(jobId, candidateId) {
    return this.request(`/api/jobs/${jobId}/results/${candidateId}`);
  }

  // Report
  async downloadReport(jobId) {
    return this.request(`/api/jobs/${jobId}/report`);
  }
}

const api = new ApiClient();
export default api;
