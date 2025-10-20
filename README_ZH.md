# 古籍整理平台 - 前端

这是古籍整理平台的前端项目，使用 Next.js 15 + TypeScript + Tailwind CSS 构建。

## 功能特性

- ✅ 用户注册与登录
- ✅ JWT Token 认证
- ✅ 古朴的中国风 UI 设计
- ✅ 响应式布局
- ✅ 表单验证
- ✅ 状态管理 (Zustand)

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand
- **表单处理**: React Hook Form
- **HTTP 客户端**: Axios

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.local` 文件已经创建好，默认配置为：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

如果后端 API 运行在不同的地址，请修改此变量。

### 3. 启动开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:3000 启动

## 项目结构

```
web/my-app/
├── app/
│   ├── page.tsx              # 首页
│   ├── login/                # 登录页
│   ├── register/             # 注册页
│   ├── dashboard/            # 用户仪表板
│   ├── globals.css           # 全局样式
│   └── layout.tsx            # 根布局
├── lib/
│   ├── api.ts                # API 客户端配置
│   └── auth.ts               # 认证服务
├── store/
│   └── authStore.ts          # 认证状态管理
└── .env.local                # 环境变量
```

## 页面说明

### 首页 (`/`)
- 展示平台特性
- 引导用户注册或登录

### 登录页 (`/login`)
- 用户名/邮箱登录
- 表单验证
- 错误提示

### 注册页 (`/register`)
- 邮箱、用户名、密码注册
- 密码确认
- 表单验证

### 仪表板 (`/dashboard`)
- 用户信息展示
- 快捷操作
- 数据统计（待对接）

## 设计风格

### 颜色主题

- **背景色**: 米白色 (#f5f0e8)
- **文字色**: 深褐色 (#3d2f1f)
- **主色调**: 朱砂红 (#c8553d)
- **辅助色**: 浅驼色 (#e8dcc4)

### 字体

- **正文**: Noto Serif SC (思源宋体), SimSun
- **标题**: Noto Serif SC, KaiTi (楷体)

### 组件样式

- `.classic-card` - 古典卡片样式
- `.classic-button` - 主要按钮
- `.classic-button-outline` - 次要按钮
- `.classic-input` - 输入框
- `.title-decoration` - 标题装饰线
- `.paper-texture` - 纸张质感背景

## API 对接

### 后端 API 地址

确保后端服务运行在 `http://localhost:8000`

### 接口列表

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/users/me` | GET | 获取当前用户信息 |

### 认证流程

1. 用户登录成功后，获取 JWT Token
2. Token 存储在 localStorage
3. 后续请求自动在 header 中携带 Token
4. Token 过期或无效时自动跳转到登录页

## 开发建议

### 添加新页面

1. 在 `app` 目录下创建新文件夹
2. 添加 `page.tsx` 文件
3. 使用古朴风格的样式类

### 添加 API 接口

1. 在 `lib/api.ts` 中定义类型
2. 在 `lib/` 下创建新的服务文件
3. 使用 `api` 实例发起请求

### 状态管理

使用 Zustand 进行状态管理：

```typescript
import { useAuthStore } from '@/store/authStore';

const { user, login, logout } = useAuthStore();
```

## 后续开发计划

- [ ] 书籍管理页面
- [ ] OCR 识别界面
- [ ] 字符校对工具
- [ ] 图文对照显示
- [ ] 版本历史查看
- [ ] 导出功能

## 样式定制

所有颜色和样式变量定义在 `app/globals.css` 中，可根据需要调整：

```css
:root {
  --background: #f5f0e8;
  --foreground: #3d2f1f;
  --primary: #c8553d;
  /* ... 更多变量 */
}
```

## 构建部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 许可证

MIT License
