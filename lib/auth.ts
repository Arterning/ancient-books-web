import { api, User, LoginRequest, RegisterRequest, TokenResponse } from './api';

/**
 * 用户注册
 */
export async function register(data: RegisterRequest): Promise<User> {
  const response = await api.post<User>('/api/auth/register', data);
  return response.data;
}

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<TokenResponse> {
  // FastAPI OAuth2PasswordRequestForm 需要 form-data 格式
  const formData = new URLSearchParams();
  formData.append('username', data.username);
  formData.append('password', data.password);

  const response = await api.post<TokenResponse>('/api/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<User>('/api/users/me');
  return response.data;
}

/**
 * 登出
 */
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
