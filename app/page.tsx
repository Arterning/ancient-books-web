'use client';

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen paper-texture flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* 主标题 */}
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
          <span className="title-decoration">古籍整理平台</span>
        </h1>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索古籍内容、书名、作者..."
              className="w-full px-6 py-4 pr-14 text-lg border-2 border-border rounded-lg focus:outline-none focus:border-primary bg-white shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Search className="h-6 w-6" />
            </button>
          </div>
        </form>

        {/* 副标题 */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          运用现代科技手段，辅助古籍文献的数字化整理工作
        </p>

        {/* 功能特点 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
          <div className="classic-card text-center">
            <div className="text-3xl mb-2">📚</div>
            <h3 className="font-bold text-foreground mb-2">OCR 识别</h3>
            <p className="text-sm text-muted-foreground">
              智能识别古籍文字，支持字符级别标注
            </p>
          </div>

          <div className="classic-card text-center">
            <div className="text-3xl mb-2">✍️</div>
            <h3 className="font-bold text-foreground mb-2">智能校对</h3>
            <p className="text-sm text-muted-foreground">
              候选字符推荐，版本历史记录
            </p>
          </div>

          <div className="classic-card text-center">
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="font-bold text-foreground mb-2">图文对照</h3>
            <p className="text-sm text-muted-foreground">
              文本高亮显示，图像区域联动
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/register"
            className="classic-button text-lg px-8 py-3 inline-block"
          >
            立即注册
          </Link>

          <Link
            href="/login"
            className="classic-button-outline text-lg px-8 py-3 inline-block"
          >
            登录账户
          </Link>
        </div>

        {/* 页脚信息 */}
        <div className="mt-16 text-sm text-muted-foreground">
          <p>传承古籍文化 · 融合现代科技</p>
        </div>
      </div>
    </div>
  );
}
