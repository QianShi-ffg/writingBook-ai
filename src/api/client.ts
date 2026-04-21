import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3002/api',
  timeout: 120000, // 2分钟超时，防止大模型生成长文本时超时
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;