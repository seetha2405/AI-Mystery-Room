import axios from 'axios';
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
export const apiConfigurationError =
  import.meta.env.PROD && !configuredApiUrl
    ? 'The API URL is not configured. Set VITE_API_URL in your production hosting settings and redeploy.'
    : null;

let slowRequests = 0;
let firstApiRequestFinished = false;
function finishRequest(config) {
  if (!config) return;
  firstApiRequestFinished = true;
  clearTimeout(config.wakeTimer);
  if (config.showedWakeMessage) {
    slowRequests = Math.max(0, slowRequests - 1);
    if (slowRequests === 0 && typeof window !== 'undefined')
      window.dispatchEvent(new CustomEvent('server-waking-change', { detail: false }));
  }
}

export const api = axios.create({
  baseURL: configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:5000' : '/'),
  timeout: 15000,
});
api.interceptors.request.use((config) => {
  if (!firstApiRequestFinished)
    config.timeout = Math.max(config.timeout || api.defaults.timeout, 70000);
  config.wakeTimer = setTimeout(() => {
    config.showedWakeMessage = true;
    slowRequests += 1;
    if (typeof window !== 'undefined' && slowRequests === 1)
      window.dispatchEvent(new CustomEvent('server-waking-change', { detail: true }));
  }, 8000);
  return config;
});
api.interceptors.response.use(
  (response) => {
    finishRequest(response.config);
    return response.data;
  },
  (error) => {
    finishRequest(error.config);
    return Promise.reject({
      code: error.response?.data?.error?.code || 'NETWORK_ERROR',
      message:
        error.response?.data?.error?.message ||
        (error.code === 'ECONNABORTED'
          ? 'The request took too long. Please try again.'
          : 'Connection lost. Check your connection and try again.'),
      status: error.response?.status,
    });
  },
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
