'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { register as registerUser } from '@/lib/auth';

interface RegisterForm {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setError('');
    setIsLoading(true);

    try {
      await registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
      });

      // 注册成功，跳转到登录页
      router.push('/login?registered=true');
    } catch (err: any) {
      console.error('Register error:', err);
      if (err.response?.status === 400) {
        const detail = err.response.data?.detail;
        if (detail?.includes('Email')) {
          setError('该邮箱已被注册');
        } else if (detail?.includes('Username')) {
          setError('该用户名已被使用');
        } else {
          setError(detail || '注册失败');
        }
      } else {
        setError('注册失败，请稍后重试');
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
          <p className="text-muted-foreground mt-6">创建新账户</p>
        </div>

        {/* 注册卡片 */}
        <div className="classic-card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* 错误提示 */}
            {error && (
              <div className="p-3 rounded border-2 border-red-300 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* 邮箱输入 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                className="classic-input"
                placeholder="请输入邮箱地址"
                {...register('email', {
                  required: '请输入邮箱地址',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '请输入有效的邮箱地址',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* 用户名输入 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                用户名
              </label>
              <input
                id="username"
                type="text"
                className="classic-input"
                placeholder="请输入用户名（3-50个字符）"
                {...register('username', {
                  required: '请输入用户名',
                  minLength: {
                    value: 3,
                    message: '用户名至少需要3个字符',
                  },
                  maxLength: {
                    value: 50,
                    message: '用户名最多50个字符',
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
                    message: '用户名只能包含字母、数字、下划线和中文',
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
                placeholder="请输入密码（至少6个字符）"
                {...register('password', {
                  required: '请输入密码',
                  minLength: {
                    value: 6,
                    message: '密码至少需要6个字符',
                  },
                  maxLength: {
                    value: 50,
                    message: '密码最多50个字符',
                  },
                })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* 确认密码输入 */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-foreground mb-2"
              >
                确认密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="classic-input"
                placeholder="请再次输入密码"
                {...register('confirmPassword', {
                  required: '请确认密码',
                  validate: (value) => value === password || '两次输入的密码不一致',
                })}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="classic-button w-full disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? '注册中...' : '注册'}
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

            {/* 登录链接 */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                已有账户？
                <Link href="/login" className="ml-1 text-primary hover:underline font-medium">
                  立即登录
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
