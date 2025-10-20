import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen paper-texture flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* 主标题 */}
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
          <span className="title-decoration">古籍整理平台</span>
        </h1>

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
