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
  avatar_url?: string;
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

// ========== 类目管理 API ==========

// 获取类目树
export const getCategoryTree = async (): Promise<Category[]> => {
  const response = await api.get('/api/categories/tree');
  return response.data;
};

// 创建类目
export interface CreateCategoryRequest {
  name: string;
  parent_id?: number | null;
  sort_order?: number;
}

export const createCategory = async (data: CreateCategoryRequest): Promise<Category> => {
  const response = await api.post('/api/categories/', data);
  return response.data;
};

// 更新类目
export interface UpdateCategoryRequest {
  name?: string;
  parent_id?: number | null;
  sort_order?: number;
}

export const updateCategory = async (
  categoryId: number,
  data: UpdateCategoryRequest
): Promise<Category> => {
  const response = await api.put(`/api/categories/${categoryId}`, data);
  return response.data;
};

// 删除类目
export const deleteCategory = async (categoryId: number): Promise<void> => {
  await api.delete(`/api/categories/${categoryId}`);
};

// 获取单个类目详情
export const getCategory = async (categoryId: number): Promise<Category> => {
  const response = await api.get(`/api/categories/${categoryId}`);
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

// 更新OCR字符
export interface UpdateOCRCharacterRequest {
  new_char: string;
  note?: string;
}

export const updateOCRCharacter = async (
  charId: number,
  data: UpdateOCRCharacterRequest
): Promise<OCRCharacter> => {
  const response = await api.put(`/api/ocr/characters/${charId}`, data);
  return response.data;
};

// ========== 用户资料 API ==========

// 更新用户名
export interface UpdateUsernameRequest {
  username: string;
}

export const updateUsername = async (data: UpdateUsernameRequest): Promise<User> => {
  const response = await api.put('/api/users/me/username', data);
  return response.data;
};

// 更新密码
export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
}

export const updatePassword = async (data: UpdatePasswordRequest): Promise<{ message: string }> => {
  const response = await api.put('/api/users/me/password', data);
  return response.data;
};

// 上传头像
export const uploadAvatar = async (file: File): Promise<User> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// 获取当前用户信息
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/api/users/me');
  return response.data;
};

// ========== 搜索 API ==========

// 全文搜索结果
export interface FullTextSearchResult {
  book_id: number;
  book_title: string;
  book_author: string | null;
  page_number: number;
  image_id: number;
  text_snippet: string; // 包含高亮标记的HTML
  match_position: number;
}

export interface FullTextSearchResponse {
  total: number;
  items: FullTextSearchResult[];
  page: number;
  page_size: number;
  total_pages: number;
}

// 书籍搜索结果
export interface BookSearchResult {
  id: number;
  title: string;
  author: string | null;
  dynasty: string | null;
  description: string | null;
  created_at: string;
}

export interface BookSearchResponse {
  total: number;
  items: BookSearchResult[];
  page: number;
  page_size: number;
  total_pages: number;
}

// 搜索参数
export interface SearchParams {
  keyword: string;
  book_title?: string;
  author?: string;
  category_ids?: string; // 逗号分隔的分类ID
  page?: number;
  page_size?: number;
}

// 全文搜索
export const searchFulltext = async (
  params: SearchParams
): Promise<FullTextSearchResponse> => {
  const response = await api.get('/api/search/fulltext', { params });
  return response.data;
};

// 书籍搜索
export const searchBooks = async (
  params: SearchParams
): Promise<BookSearchResponse> => {
  const response = await api.get('/api/search/books', { params });
  return response.data;
};

// ========== AI 对话 API ==========

// 消息类型
export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  liked?: boolean | null;
  created_at: string;
}

// 对话类型
export interface Conversation {
  id: number;
  user_id: number;
  book_id?: number | null;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

// 对话列表项
export interface ConversationListItem {
  id: number;
  title: string;
  book_id?: number | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

// 发送消息请求
export interface ChatRequest {
  conversation_id?: number | null;
  message: string;
  book_id?: number | null;
}

// 聊天响应
export interface ChatResponse {
  conversation_id: number;
  user_message: Message;
  assistant_message: Message;
}

// 发送消息并获取AI回复
export const sendChatMessage = async (data: ChatRequest): Promise<ChatResponse> => {
  const response = await api.post('/api/conversations/chat', data);
  return response.data;
};

// 获取对话列表
export const getConversations = async (
  bookId?: number,
  skip: number = 0,
  limit: number = 50
): Promise<ConversationListItem[]> => {
  const params: any = { skip, limit };
  if (bookId !== undefined) {
    params.book_id = bookId;
  }
  const response = await api.get('/api/conversations/', { params });
  return response.data;
};

// 获取对话详情
export const getConversation = async (conversationId: number): Promise<Conversation> => {
  const response = await api.get(`/api/conversations/${conversationId}`);
  return response.data;
};

// 删除对话
export const deleteConversation = async (conversationId: number): Promise<void> => {
  await api.delete(`/api/conversations/${conversationId}`);
};

// 更新消息反馈
export const updateMessageFeedback = async (
  messageId: number,
  liked: boolean
): Promise<Message> => {
  const response = await api.put(`/api/conversations/messages/${messageId}/feedback`, { liked });
  return response.data;
};
