'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setIsLoading(true);

    try {
      await login(data.username, data.password);
      router.push('/dashboard'); // 登录成功后跳转到仪表板
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        setError('用户名或密码错误');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('登录失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen paper-texture flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            <span className="title-decoration">古籍整理</span>
          </h1>
          <p className="text-muted-foreground mt-6">登录您的账户</p>
        </div>

        {/* 登录卡片 */}
        <div className="classic-card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 错误提示 */}
            {error && (
              <div className="p-3 rounded border-2 border-red-300 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* 用户名输入 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                用户名或邮箱
              </label>
              <input
                id="username"
                type="text"
                className="classic-input"
                placeholder="请输入用户名或邮箱"
                {...register('username', {
                  required: '请输入用户名或邮箱',
                  minLength: {
                    value: 3,
                    message: '用户名至少需要3个字符',
                  },
                })}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                className="classic-input"
                placeholder="请输入密码"
                {...register('password', {
                  required: '请输入密码',
                  minLength: {
                    value: 6,
                    message: '密码至少需要6个字符',
                  },
                })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="classic-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '登录中...' : '登录'}
            </button>

            {/* 分隔线 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#fefdfb] text-muted-foreground">或</span>
              </div>
            </div>

            {/* 注册链接 */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                还没有账户？
                <Link
                  href="/register"
                  className="ml-1 text-primary hover:underline font-medium"
                >
                  立即注册
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* 页脚装饰 */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>传承古籍文化 · 融合现代科技</p>
        </div>
      </div>
    </div>
  );
}
