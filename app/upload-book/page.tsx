'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getCategoryTree, createBook, Category, CreateBookRequest } from '@/lib/api';

export default function UploadBookPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();

  // 表单状态
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [dynasty, setDynasty] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  // 类目列表
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Array<{ id: number; name: string; level: number }>>([]);

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  // 加载类目树
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategoryTree();
        setCategories(data);
        // 将树形结构扁平化，便于显示
        const flattened = flattenCategories(data);
        setFlatCategories(flattened);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // 将树形类目结构扁平化
  const flattenCategories = (
    categories: Category[],
    level: number = 0
  ): Array<{ id: number; name: string; level: number }> => {
    const result: Array<{ id: number; name: string; level: number }> = [];
    for (const category of categories) {
      result.push({
        id: category.id,
        name: category.name,
        level,
      });
      if (category.children && category.children.length > 0) {
        result.push(...flattenCategories(category.children, level + 1));
      }
    }
    return result;
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('请输入书名');
      return;
    }

    setIsSubmitting(true);

    try {
      const bookData: CreateBookRequest = {
        title: title.trim(),
        author: author.trim() || undefined,
        dynasty: dynasty.trim() || undefined,
        description: description.trim() || undefined,
        category_ids: selectedCategories.length > 0 ? selectedCategories : undefined,
      };

      await createBook(bookData);

      // 创建成功，跳转回 dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Failed to create book:', err);
      setError(err.response?.data?.detail || '创建书籍失败，请重试');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
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
            <h1 className="text-2xl font-bold text-foreground">上传书籍</h1>
            <button
              onClick={handleCancel}
              className="classic-button-outline text-sm"
            >
              返回主页
            </button>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="classic-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 书名 */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                书名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border-2 border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="请输入书名"
                required
              />
            </div>

            {/* 作者 */}
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-foreground mb-2">
                作者
              </label>
              <input
                type="text"
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-4 py-2 border-2 border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="请输入作者"
              />
            </div>

            {/* 朝代 */}
            <div>
              <label htmlFor="dynasty" className="block text-sm font-medium text-foreground mb-2">
                朝代
              </label>
              <input
                type="text"
                id="dynasty"
                value={dynasty}
                onChange={(e) => setDynasty(e.target.value)}
                className="w-full px-4 py-2 border-2 border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="请输入朝代"
              />
            </div>

            {/* 简介 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                简介
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border-2 border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="请输入书籍简介"
              />
            </div>

            {/* 类目选择 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                所属类目
              </label>
              <div className="border-2 border-border rounded-md bg-background p-4 max-h-64 overflow-y-auto">
                {flatCategories.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    暂无分类
                  </div>
                ) : (
                  <div className="space-y-2">
                    {flatCategories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center cursor-pointer hover:bg-muted rounded px-2 py-1"
                        style={{ paddingLeft: `${category.level * 20 + 8}px` }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="mr-3 w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedCategories.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  已选择 {selectedCategories.length} 个类目
                </div>
              )}
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="p-3 bg-red-50 border-2 border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t-2 border-border">
              <button
                type="button"
                onClick={handleCancel}
                className="classic-button-outline"
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                type="submit"
                className={`classic-button ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? '创建中...' : '创建书籍'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
