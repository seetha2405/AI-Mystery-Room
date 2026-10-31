import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 15000,
});
api.interceptors.response.use(
  (response) => response.data,
  (error) =>
    Promise.reject({
      code: error.response?.data?.error?.code || 'NETWORK_ERROR',
      message:
        error.response?.data?.error?.message ||
        (error.code === 'ECONNABORTED'
          ? 'The request took too long. Please try again.'
          : 'Connection lost. Check your connection and try again.'),
      status: error.response?.status,
    }),
);
export async function createCase(form, signal) {
  return (await api.post('/api/cases', form, { timeout: 390000, signal })).data;
}
export async function getCase(id) {
  const res = await api.get(`/api/cases/${id}`);
  // The response interceptor unwraps AxiosResponse, so res.data is the API envelope's data.
  return res.data;
}
export async function getCases() {
  const res = await api.get('/api/cases');
  return res.data;
}
export async function deleteCase(id) {
  return (await api.delete(`/api/cases/${id}`)).data;
}
export async function discoverClue(id, clueId) {
  return (await api.post(`/api/cases/${id}/clues/${clueId}/discover`)).data;
}
export async function requestHint(id) {
  return (await api.post(`/api/cases/${id}/hints`)).data;
}
export async function accuse(id, suspectId) {
  return (await api.post(`/api/cases/${id}/accuse`, { suspectId })).data;
}
export async function getResult(id) {
  return (await api.get(`/api/cases/${id}/result`)).data;
}
