'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  updateUsername,
  updatePassword,
  uploadAvatar,
  UpdateUsernameRequest,
  UpdatePasswordRequest,
} from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, ArrowLeft } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, fetchUser, logout } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 表单状态
  const [usernameForm, setUsernameForm] = useState({ username: '' });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // UI 状态
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated) {
      fetchUser().catch(() => {
        router.push('/login');
      });
    }
  }, [isAuthenticated, fetchUser, router]);

  // 初始化用户名表单
  useEffect(() => {
    if (user) {
      setUsernameForm({ username: user.username });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // 更新用户名
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSuccess(false);

    if (!usernameForm.username.trim()) {
      setUsernameError('用户名不能为空');
      return;
    }

    if (usernameForm.username === user?.username) {
      setUsernameError('用户名未改变');
      return;
    }

    setLoadingUsername(true);

    try {
      await updateUsername({ username: usernameForm.username });
      await fetchUser(); // 重新获取用户信息
      setUsernameSuccess(true);
      setTimeout(() => setUsernameSuccess(false), 3000);
    } catch (error: any) {
      console.error('Failed to update username:', error);
      setUsernameError(error.response?.data?.detail || '更新失败');
    } finally {
      setLoadingUsername(false);
    }
  };

  // 更新密码
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!passwordForm.current_password || !passwordForm.new_password) {
      setPasswordError('请填写所有密码字段');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('新密码两次输入不一致');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setPasswordError('新密码至少需要6个字符');
      return;
    }

    setLoadingPassword(true);

    try {
      await updatePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordSuccess(true);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error: any) {
      console.error('Failed to update password:', error);
      setPasswordError(error.response?.data?.detail || '更新失败');
    } finally {
      setLoadingPassword(false);
    }
  };

  // 上传头像
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setAvatarError('请选择图片文件');
      return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('图片大小不能超过 5MB');
      return;
    }

    setLoadingAvatar(true);
    setAvatarError(null);

    try {
      await uploadAvatar(file);
      await fetchUser(); // 重新获取用户信息
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      setAvatarError(error.response?.data?.detail || '上传失败');
    } finally {
      setLoadingAvatar(false);
    }
  };

  if (!user) {
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
                className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                返回主页
              </button>
              <h1 className="text-2xl font-bold text-foreground">个人中心</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">{user.username}</span>
              </span>
              <button onClick={handleLogout} className="classic-button-outline text-sm">
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6">
          {/* 头像部分 */}
          <div className="classic-card">
            <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b-2 border-border">
              头像设置
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={user.avatar_url} alt={user.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loadingAvatar}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground border-2 border-border hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  点击相机图标更换头像
                </p>
                <p className="text-xs text-muted-foreground">
                  支持 JPG、PNG 格式，文件大小不超过 5MB
                </p>
                {avatarError && (
                  <p className="text-xs text-red-600 mt-2">{avatarError}</p>
                )}
                {loadingAvatar && (
                  <p className="text-xs text-primary mt-2">上传中...</p>
                )}
              </div>
            </div>
          </div>

          {/* 用户名修改 */}
          <div className="classic-card">
            <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b-2 border-border">
              修改用户名
            </h2>
            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">用户名</label>
                <input
                  type="text"
                  value={usernameForm.username}
                  onChange={(e) =>
                    setUsernameForm({ username: e.target.value })
                  }
                  className="w-full px-3 py-2 border-2 border-border rounded-md focus:outline-none focus:border-primary"
                  placeholder="请输入新用户名"
                />
              </div>

              {usernameError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {usernameError}
                </div>
              )}

              {usernameSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-600">
                  用户名更新成功！
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loadingUsername}
                  className="classic-button text-sm"
                >
                  {loadingUsername ? '保存中...' : '保存修改'}
                </button>
              </div>
            </form>
          </div>

          {/* 密码修改 */}
          <div className="classic-card">
            <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b-2 border-border">
              修改密码
            </h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">当前密码</label>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, current_password: e.target.value })
                  }
                  className="w-full px-3 py-2 border-2 border-border rounded-md focus:outline-none focus:border-primary"
                  placeholder="请输入当前密码"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">新密码</label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, new_password: e.target.value })
                  }
                  className="w-full px-3 py-2 border-2 border-border rounded-md focus:outline-none focus:border-primary"
                  placeholder="请输入新密码（至少6个字符）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                  }
                  className="w-full px-3 py-2 border-2 border-border rounded-md focus:outline-none focus:border-primary"
                  placeholder="请再次输入新密码"
                />
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-600">
                  密码更新成功！
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loadingPassword}
                  className="classic-button text-sm"
                >
                  {loadingPassword ? '保存中...' : '保存修改'}
                </button>
              </div>
            </form>
          </div>

          {/* 账户信息 */}
          <div className="classic-card">
            <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b-2 border-border">
              账户信息
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">邮箱：</span>
                <span className="text-foreground">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">账户类型：</span>
                <span className="text-foreground">
                  {user.is_superuser ? '管理员' : '普通用户'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">注册时间：</span>
                <span className="text-foreground">
                  {new Date(user.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
