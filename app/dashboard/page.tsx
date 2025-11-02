'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getCategoryTree, getBooksByCategory, Category, Book } from '@/lib/api';
import { FolderTree, Upload, User, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser, logout } = useAuthStore();

  // 状态管理
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const booksPerPage = 10; // 每页10本书，2列布局

  useEffect(() => {
    // 检查用户登录状态
    if (!isAuthenticated) {
      fetchUser().catch(() => {
        router.push('/login');
      });
    }
  }, [isAuthenticated, fetchUser, router]);

  // 加载类目树
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategoryTree();
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // 加载书籍列表
  useEffect(() => {
    if (selectedCategoryId === null) return;

    const loadBooks = async () => {
      setLoadingBooks(true);
      try {
        const skip = (currentPage - 1) * booksPerPage;
        const response = await getBooksByCategory(selectedCategoryId, skip, booksPerPage);
        setBooks(response.items);
        setTotalBooks(response.total);
      } catch (error) {
        console.error('Failed to load books:', error);
        setBooks([]);
        setTotalBooks(0);
      } finally {
        setLoadingBooks(false);
      }
    };
    loadBooks();
  }, [selectedCategoryId, currentPage]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleCategoryClick = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setCurrentPage(1); // 重置到第一页
  };

  const toggleCategory = (categoryId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 递归渲染类目树
  const renderCategoryTree = (categories: Category[], level: number = 0) => {
    return categories.map((category) => {
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded = expandedCategories.has(category.id);
      const isSelected = selectedCategoryId === category.id;

      return (
        <div key={category.id} style={{ marginLeft: `${level * 16}px` }}>
          <div
            className={`flex items-center py-2 px-3 cursor-pointer rounded-md transition-colors ${
              isSelected
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-muted text-foreground'
            }`}
            onClick={() => handleCategoryClick(category.id)}
          >
            {hasChildren && (
              <button
                onClick={(e) => toggleCategory(category.id, e)}
                className="mr-2 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? '−' : '+'}
              </button>
            )}
            {!hasChildren && <span className="mr-2 w-4" />}
            <span className="text-sm">{category.name}</span>
          </div>
          {hasChildren && isExpanded && (
            <div>{renderCategoryTree(category.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  // 计算分页
  const totalPages = Math.ceil(totalBooks / booksPerPage);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (isLoading) {
    return (
      <div className="min-h-screen paper-texture flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen paper-texture">
      {/* 顶部导航栏 */}
      <header className="border-b-2 border-border bg-[#fefdfb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">古籍整理平台</h1>
            <div className="flex items-center gap-3">
              {/* 管理员功能入口 */}
              {user.is_superuser && (
                <>
                  <button
                    onClick={() => router.push('/category-management')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md border-2 border-border hover:bg-muted transition-colors text-sm"
                    title="类目管理"
                  >
                    <FolderTree className="h-4 w-4" />
                    <span className="hidden sm:inline">类目管理</span>
                  </button>
                  <button
                    onClick={() => router.push('/upload-book')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md border-2 border-border hover:bg-muted transition-colors text-sm"
                    title="上传书籍"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">上传书籍</span>
                  </button>
                </>
              )}

              {/* 用户头像下拉菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none">
                    <Avatar className="h-9 w-9 border-2 border-border cursor-pointer hover:border-primary transition-colors">
                      <AvatarImage src={user.avatar_url} alt={user.username} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      {user.is_superuser && (
                        <p className="text-xs text-primary mt-1">管理员</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>个人中心</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧类目树 */}
          <div className="col-span-3">
            <div className="classic-card sticky top-8">
              <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b-2 border-border">
                古籍分类
              </h2>
              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
                {categories.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    暂无分类
                  </div>
                ) : (
                  renderCategoryTree(categories)
                )}
              </div>
            </div>
          </div>

          {/* 右侧书籍展示区域 */}
          <div className="col-span-9">
            {selectedCategoryId === null ? (
              <div className="classic-card text-center py-16">
                <div className="text-muted-foreground mb-2">请从左侧选择一个类目</div>
                <div className="text-sm text-muted-foreground">查看该类目下的古籍</div>
              </div>
            ) : (
              <>
                {/* 书籍列表 */}
                {loadingBooks ? (
                  <div className="classic-card text-center py-16">
                    <div className="text-muted-foreground">加载中...</div>
                  </div>
                ) : books.length === 0 ? (
                  <div className="classic-card text-center py-16">
                    <div className="text-muted-foreground">该类目下暂无书籍</div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      {books.map((book) => (
                        <div key={book.id} className="classic-card hover:shadow-lg transition-shadow">
                          <h3 className="text-lg font-bold text-foreground mb-2">
                            {book.title}
                          </h3>
                          {book.author && (
                            <div className="text-sm text-muted-foreground mb-1">
                              作者：<span className="text-foreground">{book.author}</span>
                            </div>
                          )}
                          {book.dynasty && (
                            <div className="text-sm text-muted-foreground mb-2">
                              朝代：<span className="text-foreground">{book.dynasty}</span>
                            </div>
                          )}
                          {book.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {book.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-border">
                            <span className="text-xs text-muted-foreground">
                              {new Date(book.created_at).toLocaleDateString('zh-CN')}
                            </span>
                            <div className="flex gap-2">
                              {user.is_superuser && (
                                <button
                                  onClick={() => router.push(`/upload-images/${book.id}`)}
                                  className="classic-button text-xs"
                                >
                                  上传图片
                                </button>
                              )}
                              <button
                                onClick={() => router.push(`/book/${book.id}`)}
                                className="classic-button-outline text-xs"
                              >
                                查看详情
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 分页控件 */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => setCurrentPage((p) => p - 1)}
                          disabled={!canGoPrev}
                          className={`classic-button-outline text-sm ${
                            !canGoPrev ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          上一页
                        </button>
                        <span className="text-sm text-muted-foreground">
                          第 {currentPage} / {totalPages} 页（共 {totalBooks} 本）
                        </span>
                        <button
                          onClick={() => setCurrentPage((p) => p + 1)}
                          disabled={!canGoNext}
                          className={`classic-button-outline text-sm ${
                            !canGoNext ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          下一页
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
