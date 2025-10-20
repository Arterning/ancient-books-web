import axios from 'axios';

// API 基础URL - 可通过环境变量配置
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 创建 axios 实例
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 类型定义
export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// 类目相关类型
export interface Category {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

// 书籍相关类型
export interface Book {
  id: number;
  title: string;
  author: string | null;
  dynasty: string | null;
  description: string | null;
  owner_id: number;
  ocr_status: string;
  created_at: string;
  updated_at: string;
}

export interface BookListResponse {
  total: number;
  items: Book[];
}

// 章节类型
export interface Chapter {
  id: number;
  title: string;
  sort_order: number;
  start_page: number | null;
  end_page: number | null;
  book_id: number;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  children?: Chapter[];
}

// OCR 相关类型
export interface BBox {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  p3: { x: number; y: number };
  p4: { x: number; y: number };
}

export interface CharacterCandidate {
  candidate_char: string;
  confidence: number;
  rank: number;
}

export interface OCRCharacter {
  id: number;
  sequence: number;
  current_char: string;
  original_char: string;
  is_corrected: boolean;
  confidence: number;
  bbox: BBox;
  candidates: CharacterCandidate[];
}

export interface BookImage {
  id: number;
  book_id: number;
  filename: string;
  file_path: string;
  page_number: number;
  file_size: number | null;
  ocr_text: string | null;
  created_at: string;
  ocr_characters: OCRCharacter[];
}

// 书籍详情类型
export interface BookDetail extends Book {
  ocr_text: string | null;
  processed_text: string | null;
  images: BookImage[];
  categories: Category[];
  chapters: Chapter[];
}

// API 函数

// 获取类目树
export const getCategoryTree = async (): Promise<Category[]> => {
  const response = await api.get('/api/categories/tree');
  return response.data;
};

// 根据类目ID获取书籍列表
export const getBooksByCategory = async (
  categoryId: number,
  skip: number = 0,
  limit: number = 20
): Promise<BookListResponse> => {
  const response = await api.get(`/api/books/by-category/${categoryId}`, {
    params: { skip, limit },
  });
  return response.data;
};

// 创建书籍
export interface CreateBookRequest {
  title: string;
  author?: string;
  dynasty?: string;
  description?: string;
  category_ids?: number[];
}

export const createBook = async (bookData: CreateBookRequest): Promise<Book> => {
  const response = await api.post('/api/books', bookData);
  return response.data;
};

// 上传书籍图片
export interface UploadImagesResponse {
  message: string;
  images: Array<{
    filename: string;
    page_number: number;
    file_size: number;
    ocr_characters?: number;
    ocr_error?: string;
  }>;
}

export const uploadBookImages = async (
  bookId: number,
  files: File[]
): Promise<UploadImagesResponse> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await api.post(`/api/books/${bookId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// 获取书籍详情
export const getBookDetail = async (bookId: number): Promise<BookDetail> => {
  const response = await api.get(`/api/books/${bookId}`);
  return response.data;
};
