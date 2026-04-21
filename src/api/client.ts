import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2分钟超时，防止大模型生成长文本时超时
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
