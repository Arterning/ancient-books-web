'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { uploadBookImages } from '@/lib/api';

interface ImagePreview {
  file: File;
  preview: string;
  size: string;
}

export default function UploadImagesPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = parseInt(params.bookId as string);
  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();

  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 检查用户登录状态和权限
    if (!isAuthenticated) {
      fetchUser().catch(() => {
        router.push('/login');
      });
    } else if (user && !user.is_superuser) {
      // 非管理员，跳转回 dashboard
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, fetchUser, router]);

  // 清理预览 URL
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 验证文件类型
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} 不是图片文件`);
        return false;
      }
      return true;
    });

    // 创建预览
    const newPreviews: ImagePreview[] = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      size: formatFileSize(file.size),
    }));

    setImages((prev) => [...prev, ...newPreviews]);
    setError('');
    setUploadResult(null);

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (images.length === 0) {
      setError('请先选择要上传的图片');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress(`正在上传 ${images.length} 张图片...`);

    try {
      const files = images.map((img) => img.file);
      const result = await uploadBookImages(bookId, files);

      setUploadResult(result);
      setUploadProgress('');

      // 清空已上传的图片
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);

      // 3秒后跳转回 dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.detail || '上传失败，请重试');
      setUploadProgress('');
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen paper-texture flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  if (!user || !user.is_superuser) {
    return null;
  }

  return (
    <div className="min-h-screen paper-texture">
      {/* 顶部导航栏 */}
      <header className="border-b-2 border-border bg-[#fefdfb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">上传书籍图片</h1>
            <button onClick={handleCancel} className="classic-button-outline text-sm">
              返回主页
            </button>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="classic-card">
          {/* 上传成功提示 */}
          {uploadResult && (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-md">
              <h3 className="text-lg font-bold text-green-800 mb-2">上传成功！</h3>
              <p className="text-sm text-green-700 mb-3">{uploadResult.message}</p>
              <div className="space-y-1">
                {uploadResult.images.map((img: any, idx: number) => (
                  <div key={idx} className="text-xs text-green-600">
                    {img.filename} - 识别了 {img.ocr_characters || 0} 个字符
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-3">3秒后自动返回主页...</p>
            </div>
          )}

          {/* 文件选择区域 */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
              disabled={isUploading}
            />
            <label
              htmlFor="file-input"
              className={`block w-full p-8 border-2 border-dashed border-border rounded-md text-center cursor-pointer hover:bg-muted transition-colors ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="text-4xl mb-3">📁</div>
              <div className="text-foreground font-medium mb-1">点击选择图片</div>
              <div className="text-sm text-muted-foreground">
                支持批量上传，可选择多张图片
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                支持 JPG、PNG、GIF 等常见图片格式
              </div>
            </label>
          </div>

          {/* 图片预览网格 */}
          {images.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">
                  已选择 {images.length} 张图片
                </h3>
                {!isUploading && (
                  <button
                    onClick={() => {
                      images.forEach((img) => URL.revokeObjectURL(img.preview));
                      setImages([]);
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    清空全部
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                {images.map((img, index) => (
                  <div
                    key={index}
                    className="relative group border-2 border-border rounded-md overflow-hidden"
                  >
                    <img
                      src={img.preview}
                      alt={img.file.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                      <div className="text-xs truncate">{img.file.name}</div>
                      <div className="text-xs text-gray-300">{img.size}</div>
                    </div>
                    {!isUploading && (
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 上传进度 */}
          {uploadProgress && (
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">{uploadProgress}</p>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t-2 border-border">
            <button
              onClick={handleCancel}
              className="classic-button-outline"
              disabled={isUploading}
            >
              取消
            </button>
            <button
              onClick={handleUpload}
              className={`classic-button ${
                isUploading || images.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isUploading || images.length === 0}
            >
              {isUploading ? '上传中...' : `上传 ${images.length} 张图片`}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
