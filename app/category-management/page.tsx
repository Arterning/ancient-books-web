'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/lib/api';

// 右键菜单位置
interface ContextMenuPosition {
  x: number;
  y: number;
  category: Category | null; // null 表示在空白区域点击
}

// 表单数据
interface CategoryFormData {
  name: string;
  sort_order: number;
}

// 对话框类型
type DialogType = 'add' | 'edit' | 'delete' | null;

export default function CategoryManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated, fetchUser, logout } = useAuthStore();

  // 状态管理
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', sort_order: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查用户权限
  useEffect(() => {
    if (!isAuthenticated) {
      fetchUser().catch(() => {
        router.push('/login');
      });
    } else if (user && !user.is_superuser) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, fetchUser, router]);

  // 加载类目树
  const loadCategories = async () => {
    try {
      const data = await getCategoryTree();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('加载类目失败');
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // 关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
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

  // 右键菜单处理
  const handleContextMenu = (e: React.MouseEvent, category: Category | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      category,
    });
  };

  // 打开新增对话框
  const handleAddCategory = (parentCategory: Category | null) => {
    setSelectedCategory(parentCategory);
    setFormData({ name: '', sort_order: 0 });
    setDialogType('add');
    setContextMenu(null);
  };

  // 打开编辑对话框
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, sort_order: category.sort_order });
    setDialogType('edit');
    setContextMenu(null);
  };

  // 打开删除确认对话框
  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category);
    setDialogType('delete');
    setContextMenu(null);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('请输入类目名称');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (dialogType === 'add') {
        const data: CreateCategoryRequest = {
          name: formData.name,
          parent_id: selectedCategory?.id || null,
          sort_order: formData.sort_order,
        };
        await createCategory(data);
      } else if (dialogType === 'edit' && selectedCategory) {
        const data: UpdateCategoryRequest = {
          name: formData.name,
          sort_order: formData.sort_order,
        };
        await updateCategory(selectedCategory.id, data);
      }
      await loadCategories();
      setDialogType(null);
      setSelectedCategory(null);
    } catch (error: any) {
      console.error('Failed to save category:', error);
      setError(error.response?.data?.detail || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;

    setLoading(true);
    setError(null);

    try {
      await deleteCategory(selectedCategory.id);
      await loadCategories();
      setDialogType(null);
      setSelectedCategory(null);
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      setError(error.response?.data?.detail || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 递归渲染类目树
  const renderCategoryTree = (categories: Category[], level: number = 0) => {
    return categories.map((category) => {
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded = expandedCategories.has(category.id);

      return (
        <div key={category.id} style={{ marginLeft: `${level * 20}px` }}>
          <div
            className="flex items-center py-2 px-3 rounded-md hover:bg-muted transition-colors cursor-pointer group"
            onContextMenu={(e) => handleContextMenu(e, category)}
          >
            {hasChildren && (
              <button
                onClick={(e) => toggleCategory(category.id, e)}
                className="mr-2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? '−' : '+'}
              </button>
            )}
            {!hasChildren && <span className="mr-2 w-5" />}
            <span className="text-sm flex-1">{category.name}</span>
            <span className="text-xs text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              排序: {category.sort_order}
            </span>
          </div>
          {hasChildren && isExpanded && (
            <div>{renderCategoryTree(category.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  if (!user || !user.is_superuser) {
    return null;
  }

  return (
    <div className="min-h-screen paper-texture">
      {/* 顶部导航栏 */}
      <header className="border-b-2 border-border bg-[#fefdfb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ← 返回主页
              </button>
              <h1 className="text-2xl font-bold text-foreground">类目管理</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                欢迎，<span className="text-primary font-medium">{user.username}</span>
              </span>
              <button onClick={handleLogout} className="classic-button-outline text-sm">
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="classic-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-border">
            <h2 className="text-lg font-bold text-foreground">类目结构</h2>
            <button
              onClick={() => handleAddCategory(null)}
              className="classic-button text-sm"
            >
              + 添加顶级类目
            </button>
          </div>

          {/* 类目树区域 */}
          <div
            className="min-h-[400px] max-h-[calc(100vh-16rem)] overflow-y-auto"
            onContextMenu={(e) => handleContextMenu(e, null)}
          >
            {categories.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-16">
                暂无类目，右键点击此处或点击上方按钮添加
              </div>
            ) : (
              renderCategoryTree(categories)
            )}
          </div>

          {/* 操作说明 */}
          <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
            <p>提示：右键点击类目节点可以编辑、删除或添加子类目；右键点击空白区域可以添加顶级类目</p>
          </div>
        </div>
      </main>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed bg-white border-2 border-border shadow-lg rounded-md py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.category ? (
            <>
              <button
                onClick={() => handleAddCategory(contextMenu.category)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                添加子类目
              </button>
              <button
                onClick={() => handleEditCategory(contextMenu.category!)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                编辑
              </button>
              <button
                onClick={() => handleDeleteCategory(contextMenu.category!)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors text-red-600"
              >
                删除
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAddCategory(null)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              添加顶级类目
            </button>
          )}
        </div>
      )}

      {/* 新增/编辑对话框 */}
      {(dialogType === 'add' || dialogType === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="classic-card max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              {dialogType === 'add'
                ? selectedCategory
                  ? `在"${selectedCategory.name}"下添加子类目`
                  : '添加顶级类目'
                : '编辑类目'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">类目名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-border rounded-md focus:outline-none focus:border-primary"
                  placeholder="请输入类目名称"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">排序</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border-2 border-border rounded-md focus:outline-none focus:border-primary"
                  placeholder="数字越小越靠前"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setDialogType(null);
                  setError(null);
                }}
                className="classic-button-outline text-sm"
                disabled={loading}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="classic-button text-sm"
                disabled={loading}
              >
                {loading ? '保存中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {dialogType === 'delete' && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="classic-card max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-red-600">确认删除</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            <p className="text-sm mb-2">
              确定要删除类目 <span className="font-bold">"{selectedCategory.name}"</span> 吗？
            </p>
            <p className="text-sm text-red-600 mb-4">
              注意：删除此类目将同时删除其所有子类目，此操作不可恢复！
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDialogType(null);
                  setError(null);
                }}
                className="classic-button-outline text-sm"
                disabled={loading}
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="classic-button text-sm bg-red-600 hover:bg-red-700"
                disabled={loading}
              >
                {loading ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
