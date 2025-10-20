'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBookDetail, BookDetail, BookImage, Chapter, OCRCharacter, API_BASE_URL } from '@/lib/api';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = parseInt(params.id as string);

  // 数据状态
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI 状态
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0); // 当前页面索引（从0开始）
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [imageZoom, setImageZoom] = useState(1); // 图片缩放比例

  // 加载书籍详情
  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true);
        const data = await getBookDetail(bookId);
        setBook(data);

        // 默认展开第一层章节
        if (data.chapters.length > 0) {
          const firstLevelIds = data.chapters.map(c => c.id);
          setExpandedChapters(new Set(firstLevelIds));
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || '加载书籍失败');
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      loadBook();
    }
  }, [bookId]);

  // 切换章节展开/收起
  const toggleChapter = (chapterId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedChapters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  // 选择章节并跳转到对应页面
  const selectChapter = (chapter: Chapter) => {
    setSelectedChapterId(chapter.id);
    if (chapter.start_page !== null && chapter.start_page > 0) {
      // 跳转到章节开始页面（页码从1开始，索引从0开始）
      setCurrentPageIndex(chapter.start_page - 1);
    }
  };

  // 递归渲染章节树
  const renderChapterTree = (chapters: Chapter[], level: number = 0) => {
    return chapters.map((chapter) => {
      const hasChildren = chapter.children && chapter.children.length > 0;
      const isExpanded = expandedChapters.has(chapter.id);
      const isSelected = selectedChapterId === chapter.id;

      return (
        <div key={chapter.id} style={{ marginLeft: `${level * 12}px` }}>
          <div
            className={`flex items-center py-2 px-3 cursor-pointer rounded-md transition-colors ${
              isSelected
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-muted text-foreground'
            }`}
            onClick={() => selectChapter(chapter)}
          >
            {hasChildren && (
              <button
                onClick={(e) => toggleChapter(chapter.id, e)}
                className="mr-2 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? '−' : '+'}
              </button>
            )}
            {!hasChildren && <span className="mr-2 w-4" />}
            <span className="text-sm flex-1">{chapter.title}</span>
            {chapter.start_page !== null && (
              <span className="text-xs text-muted-foreground ml-2">
                p.{chapter.start_page}
              </span>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div>{renderChapterTree(chapter.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  // 图片控制
  const handleZoomIn = () => setImageZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setImageZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setImageZoom(1);
  const handlePrevPage = () => setCurrentPageIndex((prev) => Math.max(prev - 1, 0));
  const handleNextPage = () => {
    if (book) {
      setCurrentPageIndex((prev) => Math.min(prev + 1, book.images.length - 1));
    }
  };

  // 获取当前页面
  const currentImage = book?.images[currentPageIndex];

  // 将 OCR 字符按照 sequence 排序并拼接成文本
  const getOCRText = (ocrCharacters: OCRCharacter[]) => {
    return ocrCharacters
      .sort((a, b) => a.sequence - b.sequence)
      .map((char) => char.current_char)
      .join('');
  };

  if (loading) {
    return (
      <div className="min-h-screen paper-texture flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen paper-texture flex items-center justify-center">
        <div className="classic-card text-center">
          <div className="text-destructive mb-4">{error || '书籍不存在'}</div>
          <button onClick={() => router.push('/dashboard')} className="classic-button">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const canGoPrev = currentPageIndex > 0;
  const canGoNext = book.images.length > 0 && currentPageIndex < book.images.length - 1;

  return (
    <div className="min-h-screen paper-texture">
      {/* 顶部导航栏 */}
      <header className="border-b-2 border-border bg-[#fefdfb]">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{book.title}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {book.author && <span>作者：{book.author}</span>}
                {book.dynasty && <span>朝代：{book.dynasty}</span>}
              </div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="classic-button-outline">
              返回首页
            </button>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧章节列表 */}
          <div className="col-span-2">
            <div className="classic-card sticky top-6">
              <h2 className="text-base font-bold text-foreground mb-3 pb-2 border-b-2 border-border">
                目录
              </h2>
              <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
                {book.chapters.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    暂无章节
                  </div>
                ) : (
                  renderChapterTree(book.chapters)
                )}
              </div>
            </div>
          </div>

          {/* 右侧内容区域 */}
          <div className="col-span-10">
            {book.images.length === 0 ? (
              <div className="classic-card text-center py-16">
                <div className="text-muted-foreground">暂无图片</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {/* 左侧：原始图像 */}
                <div className="classic-card">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-border">
                    <h3 className="text-base font-bold text-foreground">
                      原文影像 (第 {currentPageIndex + 1} / {book.images.length} 页)
                    </h3>
                  </div>

                  {/* 图片显示区域 */}
                  <div className="bg-muted rounded-md overflow-hidden mb-4" style={{ height: '600px' }}>
                    {currentImage ? (
                      <div className="w-full h-full overflow-auto flex items-center justify-center">
                        <img
                          src={`${API_BASE_URL}/${currentImage.file_path.replace(/\\/g, '/')}`}
                          alt={`第 ${currentPageIndex + 1} 页`}
                          className="object-contain"
                          style={{
                            transform: `scale(${imageZoom})`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        无图片
                      </div>
                    )}
                  </div>

                  {/* 图片控制工具栏 */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleZoomOut}
                      className="classic-button-outline text-xs px-3 py-1"
                      title="缩小"
                    >
                      −
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="classic-button-outline text-xs px-3 py-1"
                      title="还原"
                    >
                      {Math.round(imageZoom * 100)}%
                    </button>
                    <button
                      onClick={handleZoomIn}
                      className="classic-button-outline text-xs px-3 py-1"
                      title="放大"
                    >
                      +
                    </button>
                    <span className="mx-2 text-muted-foreground">|</span>
                    <button
                      onClick={handlePrevPage}
                      disabled={!canGoPrev}
                      className={`classic-button-outline text-xs px-3 py-1 ${
                        !canGoPrev ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="上一页"
                    >
                      ← 上一页
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={!canGoNext}
                      className={`classic-button-outline text-xs px-3 py-1 ${
                        !canGoNext ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="下一页"
                    >
                      下一页 →
                    </button>
                  </div>
                </div>

                {/* 右侧：OCR 结果 */}
                <div className="classic-card">
                  <h3 className="text-base font-bold text-foreground mb-3 pb-2 border-b-2 border-border">
                    OCR 识别结果
                  </h3>
                  <div className="bg-muted rounded-md p-4 overflow-y-auto" style={{ height: '600px' }}>
                    {currentImage && currentImage.ocr_characters.length > 0 ? (
                      <div className="space-y-4">
                        {/* 识别文本 */}
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">识别文本：</h4>
                          <div className="bg-background rounded p-4 overflow-x-auto" style={{ minHeight: '200px' }}>
                            <div className="text-base text-foreground writing-mode-vertical-rl" style={{ height: '100%' }}>
                              {getOCRText(currentImage.ocr_characters)}
                            </div>
                          </div>
                        </div>

                        {/* 字符详情 */}
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">
                            字符详情（共 {currentImage.ocr_characters.length} 字）：
                          </h4>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {currentImage.ocr_characters
                              .sort((a, b) => a.sequence - b.sequence)
                              .map((char) => (
                                <div
                                  key={char.id}
                                  className="bg-background rounded p-2 text-sm border border-border"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-foreground text-lg">
                                      {char.current_char}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      #{char.sequence} · 置信度 {(char.confidence * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  {char.is_corrected && (
                                    <div className="text-xs text-muted-foreground">
                                      原字：{char.original_char}
                                    </div>
                                  )}
                                  {char.candidates.length > 0 && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      候选：
                                      {char.candidates
                                        .sort((a, b) => a.rank - b.rank)
                                        .map((c, i) => (
                                          <span key={i} className="ml-1">
                                            {c.candidate_char}({(c.confidence * 100).toFixed(0)}%)
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        暂无 OCR 识别结果
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
