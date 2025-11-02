'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBookDetail, BookDetail, BookImage, Chapter, OCRCharacter, API_BASE_URL } from '@/lib/api';
import { MessageSquare, Bookmark, Lightbulb, Copy, Check, FileEdit } from 'lucide-react';
import AIChatPanel from '@/components/AIChatPanel';

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

  // 字符选择状态
  const [selectedCharIds, setSelectedCharIds] = useState<Set<number>>(new Set());
  const [lastSelectedCharId, setLastSelectedCharId] = useState<number | null>(null);

  // 文本拖动选择状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  // 工具栏状态
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // AI 聊天面板状态
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [isAIChatMinimized, setIsAIChatMinimized] = useState(false);

  // Canvas 相关引用
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // 获取当前页面 - 必须在 useEffect 之前定义
  const currentImage = book?.images[currentPageIndex];

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

  // 切换页面时清空选择
  useEffect(() => {
    setSelectedCharIds(new Set());
    setLastSelectedCharId(null);
    setIsSelecting(false);
    setSelectionStart(null);
    setShowToolbar(false);
    setCopied(false);
  }, [currentPageIndex]);

  // 绘制选中字符的高亮框
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !currentImage || selectedCharIds.size === 0) {
      // 清空 canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置 canvas 尺寸与图片实际尺寸一致
    const img = imageRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 获取选中的字符
    const selectedChars = currentImage.ocr_characters.filter(char =>
      selectedCharIds.has(char.id)
    );

    // 绘制每个选中字符的高亮框
    selectedChars.forEach(char => {
      const bbox = char.bbox;

      // 绘制半透明填充
      ctx.fillStyle = 'rgba(200, 85, 61, 0.2)'; // 朱砂红，20%透明度
      ctx.beginPath();
      ctx.moveTo(bbox.p1.x, bbox.p1.y);
      ctx.lineTo(bbox.p2.x, bbox.p2.y);
      ctx.lineTo(bbox.p3.x, bbox.p3.y);
      ctx.lineTo(bbox.p4.x, bbox.p4.y);
      ctx.closePath();
      ctx.fill();

      // 绘制边框
      ctx.strokeStyle = 'rgba(200, 85, 61, 0.8)'; // 朱砂红，80%透明度
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [selectedCharIds, currentImage, imageDimensions]);

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

  // 字符选择处理（点击字符详情卡片）
  const handleCharClick = (charId: number, event: React.MouseEvent) => {
    if (!currentImage) return;

    const chars = currentImage.ocr_characters.sort((a, b) => a.sequence - b.sequence);

    if (event.shiftKey && lastSelectedCharId !== null) {
      // Shift + 点击：选择范围
      const lastIndex = chars.findIndex(c => c.id === lastSelectedCharId);
      const currentIndex = chars.findIndex(c => c.id === charId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = chars.slice(start, end + 1).map(c => c.id);

        setSelectedCharIds(new Set(rangeIds));
      }
    } else {
      // 普通点击：切换单个字符的选中状态
      setSelectedCharIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(charId)) {
          newSet.delete(charId);
          if (charId === lastSelectedCharId) {
            setLastSelectedCharId(null);
          }
        } else {
          newSet.add(charId);
          setLastSelectedCharId(charId);
        }
        return newSet;
      });

      if (!selectedCharIds.has(charId)) {
        setLastSelectedCharId(charId);
      }
    }
  };

  // 文本选择处理 - 开始拖动
  const handleTextMouseDown = (sequence: number) => {
    setIsSelecting(true);
    setSelectionStart(sequence);
    setSelectedCharIds(new Set()); // 清空之前的选择
  };

  // 文本选择处理 - 拖动中
  const handleTextMouseEnter = (sequence: number) => {
    if (!isSelecting || selectionStart === null || !currentImage) return;

    const chars = currentImage.ocr_characters.sort((a, b) => a.sequence - b.sequence);
    const start = Math.min(selectionStart, sequence);
    const end = Math.max(selectionStart, sequence);

    const selectedIds = chars
      .filter(char => char.sequence >= start && char.sequence <= end)
      .map(char => char.id);

    setSelectedCharIds(new Set(selectedIds));
  };

  // 文本选择处理 - 结束拖动
  const handleTextMouseUp = () => {
    setIsSelecting(false);

    // 如果有选中的字符，显示工具栏
    if (selectedCharIds.size > 0 && textContainerRef.current) {
      // 计算工具栏位置：找到最后一个选中字符的位置
      const sortedChars = currentImage?.ocr_characters
        .filter(char => selectedCharIds.has(char.id))
        .sort((a, b) => a.sequence - b.sequence);

      if (sortedChars && sortedChars.length > 0) {
        const lastChar = sortedChars[sortedChars.length - 1];
        const lastCharElement = document.querySelector(`[data-char-id="${lastChar.id}"]`);

        if (lastCharElement && textContainerRef.current) {
          const charRect = lastCharElement.getBoundingClientRect();
          const containerRect = textContainerRef.current.getBoundingClientRect();

          // 工具栏位置：相对于文本容器，在最后一个字符下方
          setToolbarPosition({
            top: charRect.bottom - containerRect.top + 8,
            left: charRect.left - containerRect.left,
          });
          setShowToolbar(true);
        }
      }
    }
  };

  // 监听全局 mouseup 事件，确保拖动结束
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting]);

  // 监听点击外部区域，隐藏工具栏
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isTextContainer = textContainerRef.current?.contains(target);
      const isToolbar = target.closest('.selection-toolbar');

      if (!isTextContainer && !isToolbar && showToolbar) {
        setShowToolbar(false);
        setCopied(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToolbar]);

  // 获取选中文本
  const getSelectedText = () => {
    if (!currentImage || selectedCharIds.size === 0) return '';

    return currentImage.ocr_characters
      .filter(char => selectedCharIds.has(char.id))
      .sort((a, b) => a.sequence - b.sequence)
      .map(char => char.current_char)
      .join('');
  };

  // 复制选中文本
  const handleCopy = async () => {
    const text = getSelectedText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒后恢复
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 问AI
  const handleAskAI = () => {
    const selectedText = getSelectedText();
    if (selectedText) {
      setAiQuestion(`"${selectedText}"是什么意思？`);
      setShowAIChat(true);
      setShowToolbar(false); // 关闭工具栏
    }
  };

  // 标记（占位）
  const handleBookmark = () => {
    console.log('标记:', getSelectedText());
    // TODO: 实现标记功能
  };

  // 写想法（占位）
  const handleNote = () => {
    console.log('写想法:', getSelectedText());
    // TODO: 实现写想法功能
  };

  // 图片加载完成后记录尺寸
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
    }
  };

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/proofreading/${bookId}`)}
                className="classic-button flex items-center gap-2"
              >
                <FileEdit size={16} />
                <span>校对</span>
              </button>
              <button onClick={() => router.push('/dashboard')} className="classic-button-outline">
                返回首页
              </button>
            </div>
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
              <div className={`grid gap-6 ${
                !showAIChat
                  ? 'grid-cols-2'  // AI关闭：原文影像 + OCR
                  : isAIChatMinimized
                    ? 'grid-cols-[2fr_2fr_1fr]'  // AI最小化：原文影像(40%) + OCR(40%) + AI(20%)
                    : 'grid-cols-2'  // AI正常：OCR + AI
              }`}>
                {/* 原文影像（AI关闭时 或 AI最小化时显示） */}
                {(!showAIChat || isAIChatMinimized) && (
                  <div className="classic-card">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-border">
                    <h3 className="text-base font-bold text-foreground">
                      原文影像 (第 {currentPageIndex + 1} / {book.images.length} 页)
                    </h3>
                  </div>

                  {/* 图片显示区域 */}
                  <div className="bg-muted rounded-md overflow-hidden mb-4 relative" style={{ height: '600px' }}>
                    {currentImage ? (
                      <div className="w-full h-full overflow-auto flex items-center justify-center relative">
                        <div className="relative inline-block">
                          <img
                            ref={imageRef}
                            src={`${API_BASE_URL}/${currentImage.file_path.replace(/\\/g, '/')}`}
                            alt={`第 ${currentPageIndex + 1} 页`}
                            className="object-contain"
                            style={{
                              transform: `scale(${imageZoom})`,
                              transformOrigin: 'center center',
                              transition: 'transform 0.2s ease',
                            }}
                            onLoad={handleImageLoad}
                          />
                          {/* Canvas 用于绘制高亮框 */}
                          <canvas
                            ref={canvasRef}
                            className="absolute top-0 left-0 pointer-events-none"
                            style={{
                              transform: `scale(${imageZoom})`,
                              transformOrigin: 'center center',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </div>
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
                      ←
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={!canGoNext}
                      className={`classic-button-outline text-xs px-3 py-1 ${
                        !canGoNext ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="下一页"
                    >
                      →
                    </button>
                  </div>
                </div>
                )}

                {/* OCR 结果（始终显示）*/}
                <div className="classic-card">
                  <h3 className="text-base font-bold text-foreground mb-3 pb-2 border-b-2 border-border">
                    OCR 识别结果
                  </h3>
                  <div className="bg-muted rounded-md p-4 overflow-y-auto" style={{ height: '600px' }}>
                    {currentImage && currentImage.ocr_characters.length > 0 ? (
                      <div className="space-y-4">
                        {/* 识别文本 - 横排显示，每个字符可拖动选择 */}
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">识别文本（拖动选择文字）：</h4>
                          <div
                            ref={textContainerRef}
                            className="bg-background rounded p-4 select-none relative"
                            style={{ minHeight: '100px' }}
                            onMouseUp={handleTextMouseUp}
                          >
                            <div className="text-base text-foreground leading-relaxed" style={{ lineHeight: '1.8' }}>
                              {currentImage.ocr_characters
                                .sort((a, b) => a.sequence - b.sequence)
                                .map((char) => (
                                  <span
                                    key={char.id}
                                    data-char-id={char.id}
                                    data-sequence={char.sequence}
                                    onMouseDown={() => handleTextMouseDown(char.sequence)}
                                    onMouseEnter={() => handleTextMouseEnter(char.sequence)}
                                    className={`inline-block cursor-pointer transition-colors ${
                                      selectedCharIds.has(char.id)
                                        ? 'bg-primary/20 text-primary font-medium'
                                        : 'hover:bg-muted'
                                    }`}
                                    style={{
                                      userSelect: 'none',
                                      WebkitUserSelect: 'none',
                                    }}
                                  >
                                    {char.current_char}
                                  </span>
                                ))}
                            </div>

                            {/* 浮动工具栏 */}
                            {showToolbar && (
                              <div
                                className="selection-toolbar absolute z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-border px-2 py-1.5"
                                style={{
                                  top: `${toolbarPosition.top}px`,
                                  left: `${toolbarPosition.left}px`,
                                }}
                              >
                                <button
                                  onClick={handleAskAI}
                                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors text-xs text-foreground"
                                  title="问AI"
                                >
                                  <MessageSquare size={14} />
                                  <span>问AI</span>
                                </button>

                                <div className="w-px h-4 bg-border" />

                                <button
                                  onClick={handleBookmark}
                                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors text-xs text-foreground"
                                  title="标记"
                                >
                                  <Bookmark size={14} />
                                  <span>标记</span>
                                </button>

                                <div className="w-px h-4 bg-border" />

                                <button
                                  onClick={handleNote}
                                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors text-xs text-foreground"
                                  title="写想法"
                                >
                                  <Lightbulb size={14} />
                                  <span>想法</span>
                                </button>

                                <div className="w-px h-4 bg-border" />

                                <button
                                  onClick={handleCopy}
                                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors text-xs text-foreground"
                                  title={copied ? '已复制' : '复制'}
                                >
                                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                  <span className={copied ? 'text-green-600' : ''}>{copied ? '已复制' : '复制'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 字符详情 */}
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">
                            字符详情（共 {currentImage.ocr_characters.length} 字，点击选择，Shift+点击多选）：
                          </h4>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {currentImage.ocr_characters
                              .sort((a, b) => a.sequence - b.sequence)
                              .map((char) => (
                                <div
                                  key={char.id}
                                  onClick={(e) => handleCharClick(char.id, e)}
                                  className={`bg-background rounded p-2 text-sm border cursor-pointer transition-all ${
                                    selectedCharIds.has(char.id)
                                      ? 'border-primary bg-primary/5 shadow-sm'
                                      : 'border-border hover:border-primary/50'
                                  }`}
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

                {/* AI 聊天面板 */}
                {showAIChat && (
                  <div className="col-span-1" style={{ height: '665px' }}>
                    <AIChatPanel
                      isOpen={showAIChat}
                      onClose={() => {
                        setShowAIChat(false);
                        setIsAIChatMinimized(false);
                      }}
                      initialQuestion={aiQuestion}
                      bookId={bookId}
                      onMinimizeChange={setIsAIChatMinimized}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
