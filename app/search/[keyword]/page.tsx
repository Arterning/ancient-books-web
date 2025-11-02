'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  getCategoryTree,
  searchFulltext,
  searchBooks,
  Category,
  FullTextSearchResponse,
  BookSearchResponse,
  SearchParams,
} from '@/lib/api';
import { Search, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type SearchMode = 'fulltext' | 'books';

export default function SearchPage() {
  const router = useRouter();
  const params = useParams();
  const keyword = decodeURIComponent(params.keyword as string);
  const { user, isAuthenticated, fetchUser, logout } = useAuthStore();

  // 搜索参数
  const [searchKeyword, setSearchKeyword] = useState(keyword);
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('fulltext');
  const [currentPage, setCurrentPage] = useState(1);

  // 分类树
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());

  // 搜索结果
  const [fulltextResults, setFulltextResults] = useState<FullTextSearchResponse | null>(null);
  const [bookResults, setBookResults] = useState<BookSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated) {
      fetchUser().catch(() => {});
    }
  }, [isAuthenticated, fetchUser]);

  // 加载分类树
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategoryTree();
        setCategories(data);
        // 默认展开所有一级分类
        const topLevelIds = data.map(cat => cat.id);
        setExpandedCategories(new Set(topLevelIds));
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // 执行搜索
  const performSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: SearchParams = {
        keyword: searchKeyword,
        book_title: bookTitle || undefined,
        author: author || undefined,
        category_ids: selectedCategories.size > 0
          ? Array.from(selectedCategories).join(',')
          : undefined,
        page: currentPage,
        page_size: 10,
      };

      if (searchMode === 'fulltext') {
        const results = await searchFulltext(params);
        setFulltextResults(results);
      } else {
        const results = await searchBooks(params);
        setBookResults(results);
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      setError('搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 初始搜索和参数变化时搜索
  useEffect(() => {
    if (searchKeyword) {
      performSearch();
    }
  }, [searchKeyword, bookTitle, author, selectedCategories, searchMode, currentPage]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    if (searchKeyword.trim()) {
      router.push(`/search/${encodeURIComponent(searchKeyword.trim())}`);
    }
  };

  // 切换分类展开状态
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

  // 获取分类及其所有子分类ID
  const getCategoryAndDescendants = (categoryId: number, cats: Category[]): number[] => {
    const ids = [categoryId];
    const category = findCategory(categoryId, cats);
    if (category?.children) {
      category.children.forEach(child => {
        ids.push(...getCategoryAndDescendants(child.id, cats));
      });
    }
    return ids;
  };

  const findCategory = (id: number, cats: Category[]): Category | null => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.children) {
        const found = findCategory(id, cat.children);
        if (found) return found;
      }
    }
    return null;
  };

  // 切换分类选择（联动）
  const toggleCategorySelection = (categoryId: number) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      const descendants = getCategoryAndDescendants(categoryId, categories);

      if (newSet.has(categoryId)) {
        // 取消选择：移除该节点及所有子节点
        descendants.forEach(id => newSet.delete(id));
      } else {
        // 选择：添加该节点及所有子节点
        descendants.forEach(id => newSet.add(id));
      }

      return newSet;
    });
    setCurrentPage(1); // 重置页码
  };

  // 递归渲染分类树
  const renderCategoryTree = (categories: Category[], level: number = 0) => {
    return categories.map((category) => {
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded = expandedCategories.has(category.id);
      const isSelected = selectedCategories.has(category.id);

      return (
        <div key={category.id} style={{ marginLeft: `${level * 16}px` }}>
          <div className="flex items-center py-1.5 hover:bg-muted rounded-md transition-colors">
            {hasChildren && (
              <button
                onClick={(e) => toggleCategory(category.id, e)}
                className="mr-1 w-4 h-4 flex items-center justify-center text-muted-foreground"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            {!hasChildren && <span className="mr-1 w-4" />}
            <label className="flex items-center cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleCategorySelection(category.id)}
                className="mr-2"
              />
              <span className="text-sm">{category.name}</span>
            </label>
          </div>
          {hasChildren && isExpanded && (
            <div>{renderCategoryTree(category.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  const currentResults = searchMode === 'fulltext' ? fulltextResults : bookResults;
  const totalPages = currentResults?.total_pages || 0;

  return (
    <div className="min-h-screen paper-texture">
      {/* 顶部导航栏 */}
      <header className="border-b-2 border-border bg-[#fefdfb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                返回主页
              </button>
              <h1 className="text-2xl font-bold text-foreground">古籍搜索</h1>
            </div>
            <div className="flex items-center gap-3">
              {user && (
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
                    <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      个人中心
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 搜索区域 */}
      <div className="bg-[#fefdfb] border-b-2 border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSearch} className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-4">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="关键词"
                className="w-full px-4 py-2 border-2 border-border rounded-md focus:outline-none focus:border-primary"
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => {
                  setBookTitle(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="书名（可选）"
                className="w-full px-4 py-2 border-2 border-border rounded-md focus:outline-none focus:border-primary"
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <input
                type="text"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="作者（可选）"
                className="w-full px-4 py-2 border-2 border-border rounded-md focus:outline-none focus:border-primary"
              />
            </div>
            <div className="col-span-12 md:col-span-2">
              <button type="submit" className="w-full classic-button flex items-center justify-center gap-2">
                <Search className="h-4 w-4" />
                搜索
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧分类筛选 */}
          <div className="col-span-3">
            <div className="classic-card sticky top-6">
              <h2 className="text-lg font-bold text-foreground mb-3 pb-2 border-b-2 border-border">
                分类筛选
              </h2>
              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
                {categories.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    暂无分类
                  </div>
                ) : (
                  renderCategoryTree(categories)
                )}
              </div>
              {selectedCategories.size > 0 && (
                <button
                  onClick={() => {
                    setSelectedCategories(new Set());
                    setCurrentPage(1);
                  }}
                  className="w-full mt-3 text-xs classic-button-outline"
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>

          {/* 右侧搜索结果 */}
          <div className="col-span-9">
            {/* Tab 切换 */}
            <div className="flex gap-2 mb-4 border-b-2 border-border">
              <button
                onClick={() => {
                  setSearchMode('fulltext');
                  setCurrentPage(1);
                }}
                className={`px-6 py-3 font-medium transition-colors ${
                  searchMode === 'fulltext'
                    ? 'text-primary border-b-2 border-primary -mb-0.5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                全文搜索
                {fulltextResults && ` (${fulltextResults.total})`}
              </button>
              <button
                onClick={() => {
                  setSearchMode('books');
                  setCurrentPage(1);
                }}
                className={`px-6 py-3 font-medium transition-colors ${
                  searchMode === 'books'
                    ? 'text-primary border-b-2 border-primary -mb-0.5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                书籍搜索
                {bookResults && ` (${bookResults.total})`}
              </button>
            </div>

            {/* 搜索结果展示 */}
            {loading ? (
              <div className="classic-card text-center py-16">
                <div className="text-muted-foreground">搜索中...</div>
              </div>
            ) : error ? (
              <div className="classic-card text-center py-16">
                <div className="text-red-600">{error}</div>
              </div>
            ) : searchMode === 'fulltext' ? (
              <>
                {fulltextResults && fulltextResults.items.length === 0 ? (
                  <div className="classic-card text-center py-16">
                    <div className="text-muted-foreground">未找到匹配的内容</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fulltextResults?.items.map((result, index) => (
                      <div key={`${result.image_id}-${index}`} className="classic-card hover:shadow-lg transition-shadow">
                        <div
                          className="text-base mb-2 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: result.text_snippet }}
                        />
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border">
                          <span className="font-medium text-foreground">{result.book_title}</span>
                          {result.book_author && <span>作者: {result.book_author}</span>}
                          <span>第 {result.page_number} 页</span>
                          <button
                            onClick={() => router.push(`/book/${result.book_id}`)}
                            className="ml-auto text-primary hover:underline"
                          >
                            查看原文 →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {bookResults && bookResults.items.length === 0 ? (
                  <div className="classic-card text-center py-16">
                    <div className="text-muted-foreground">未找到匹配的书籍</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookResults?.items.map((book) => (
                      <div key={book.id} className="classic-card hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-bold text-foreground mb-2">
                          {book.title}
                        </h3>
                        <div className="space-y-1 text-sm mb-3">
                          {book.author && (
                            <div className="text-muted-foreground">
                              作者：<span className="text-foreground">{book.author}</span>
                            </div>
                          )}
                          {book.dynasty && (
                            <div className="text-muted-foreground">
                              朝代：<span className="text-foreground">{book.dynasty}</span>
                            </div>
                          )}
                        </div>
                        {book.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {book.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <span className="text-xs text-muted-foreground">
                            {new Date(book.created_at).toLocaleDateString('zh-CN')}
                          </span>
                          <button
                            onClick={() => router.push(`/book/${book.id}`)}
                            className="classic-button-outline text-xs"
                          >
                            查看详情
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 分页 */}
            {currentResults && currentResults.total > 0 && totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`classic-button-outline text-sm ${
                    currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  上一页
                </button>
                <span className="text-sm text-muted-foreground">
                  第 {currentPage} / {totalPages} 页（共 {currentResults.total} 条）
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`classic-button-outline text-sm ${
                    currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
