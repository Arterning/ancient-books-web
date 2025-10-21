'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBookDetail, BookDetail, OCRCharacter, API_BASE_URL, updateOCRCharacter } from '@/lib/api';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ArrowLeft, Save, Check } from 'lucide-react';

export default function ProofreadingPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = parseInt(params.id as string);

  // 数据状态
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI 状态
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);

  // 编辑状态
  const [editedChar, setEditedChar] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Canvas 引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 加载书籍详情
  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true);
        const data = await getBookDetail(bookId);
        setBook(data);
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

  // 当前页面
  const currentImage = book?.images[currentPageIndex];

  // 切换页面时清空选择
  useEffect(() => {
    setSelectedCharId(null);
    setEditedChar('');
  }, [currentPageIndex]);

  // 加载图片并绘制bbox裁剪和文字
  useEffect(() => {
    if (!currentImage || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;

    // 等待图片加载
    const drawContent = () => {
      const chars = currentImage.ocr_characters.sort((a, b) => a.sequence - b.sequence);

      if (chars.length === 0) {
        canvas.width = 800;
        canvas.height = 600;
        ctx.fillStyle = '#f5f0e8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#3d2f1f';
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无OCR数据', canvas.width / 2, canvas.height / 2);
        return;
      }

      // 计算每个字符的bbox尺寸
      const charBoxes = chars.map(char => {
        const bbox = char.bbox;
        const width = Math.max(
          Math.abs(bbox.p2.x - bbox.p1.x),
          Math.abs(bbox.p3.x - bbox.p4.x)
        );
        const height = Math.max(
          Math.abs(bbox.p4.y - bbox.p1.y),
          Math.abs(bbox.p3.y - bbox.p2.y)
        );
        return { char, width, height, bbox };
      });

      // 找出最大字符尺寸
      const maxCharWidth = Math.max(...charBoxes.map(b => b.width));
      const maxCharHeight = Math.max(...charBoxes.map(b => b.height));

      // 设置单元格尺寸（bbox图像 + 文字区域 + 间距）
      const cellWidth = maxCharWidth + 60; // bbox + 文字宽度
      const cellHeight = maxCharHeight + 10; // 字符高度 + 上下间距
      const padding = 20;
      const columnSpacing = 10;

      // 假设竖排，每列最多显示的字符数（根据常见古籍格式）
      const charsPerColumn = 20;
      const numColumns = Math.ceil(chars.length / charsPerColumn);

      // 计算canvas尺寸
      const canvasWidth = numColumns * (cellWidth + columnSpacing) + padding * 2;
      const canvasHeight = charsPerColumn * cellHeight + padding * 2;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // 背景色
      ctx.fillStyle = '#fefdfb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 从右到左，从上到下绘制
      let currentColumn = numColumns - 1; // 从最右边开始
      let currentRow = 0;

      charBoxes.forEach((box, index) => {
        const { char, bbox } = box;

        // 计算当前字符的位置（从右到左，从上到下）
        const x = padding + currentColumn * (cellWidth + columnSpacing);
        const y = padding + currentRow * cellHeight;

        // 绘制bbox图像（裁剪原图）
        try {
          const minX = Math.min(bbox.p1.x, bbox.p2.x, bbox.p3.x, bbox.p4.x);
          const minY = Math.min(bbox.p1.y, bbox.p2.y, bbox.p3.y, bbox.p4.y);
          const maxX = Math.max(bbox.p1.x, bbox.p2.x, bbox.p3.x, bbox.p4.x);
          const maxY = Math.max(bbox.p1.y, bbox.p2.y, bbox.p3.y, bbox.p4.y);
          const bboxWidth = maxX - minX;
          const bboxHeight = maxY - minY;

          // 从原图裁剪该字符区域
          if (bboxWidth > 0 && bboxHeight > 0) {
            ctx.drawImage(
              img,
              minX, minY, bboxWidth, bboxHeight, // 源区域
              x, y, maxCharWidth, maxCharHeight // 目标区域
            );
          }
        } catch (err) {
          console.error('绘制bbox失败:', err);
        }

        // 在bbox右侧绘制文字
        const textX = x + maxCharWidth + 10;
        const textY = y + maxCharHeight / 2;

        // 文字背景（如果选中）
        if (selectedCharId === char.id) {
          ctx.fillStyle = 'rgba(200, 85, 61, 0.1)';
          ctx.fillRect(textX - 5, y, 40, maxCharHeight);
        }

        // 绘制文字
        ctx.fillStyle = selectedCharId === char.id ? '#c8553d' : '#3d2f1f';
        ctx.font = `${Math.min(maxCharHeight * 0.6, 32)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char.current_char, textX + 15, textY);

        // 绘制可点击区域边框（调试用）
        if (selectedCharId === char.id) {
          ctx.strokeStyle = '#c8553d';
          ctx.lineWidth = 2;
          ctx.strokeRect(textX - 5, y, 40, maxCharHeight);
        }

        // 移动到下一个位置
        currentRow++;
        if (currentRow >= charsPerColumn) {
          currentRow = 0;
          currentColumn--;
        }
      });
    };

    if (img.complete) {
      drawContent();
    } else {
      img.onload = drawContent;
    }
  }, [currentImage, selectedCharId, zoom]);

  // 处理canvas点击，选择字符
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    const chars = currentImage.ocr_characters.sort((a, b) => a.sequence - b.sequence);

    // 计算布局参数（与绘制时相同）
    const charBoxes = chars.map(char => {
      const bbox = char.bbox;
      const width = Math.max(
        Math.abs(bbox.p2.x - bbox.p1.x),
        Math.abs(bbox.p3.x - bbox.p4.x)
      );
      const height = Math.max(
        Math.abs(bbox.p4.y - bbox.p1.y),
        Math.abs(bbox.p3.y - bbox.p2.y)
      );
      return { char, width, height, bbox };
    });

    const maxCharWidth = Math.max(...charBoxes.map(b => b.width));
    const maxCharHeight = Math.max(...charBoxes.map(b => b.height));
    const cellWidth = maxCharWidth + 60;
    const cellHeight = maxCharHeight + 10;
    const padding = 20;
    const columnSpacing = 10;
    const charsPerColumn = 20;
    const numColumns = Math.ceil(chars.length / charsPerColumn);

    // 检测点击了哪个字符的文字区域
    let currentColumn = numColumns - 1;
    let currentRow = 0;

    for (const box of charBoxes) {
      const charX = padding + currentColumn * (cellWidth + columnSpacing);
      const charY = padding + currentRow * cellHeight;
      const textX = charX + maxCharWidth + 10;

      // 检测是否点击了文字区域
      if (
        x >= textX - 5 &&
        x <= textX + 35 &&
        y >= charY &&
        y <= charY + maxCharHeight
      ) {
        setSelectedCharId(box.char.id);
        setEditedChar(box.char.current_char);
        return;
      }

      currentRow++;
      if (currentRow >= charsPerColumn) {
        currentRow = 0;
        currentColumn--;
      }
    }
  };

  // 工具栏功能
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handlePrevPage = () => setCurrentPageIndex(prev => Math.max(prev - 1, 0));
  const handleNextPage = () => {
    if (book) {
      setCurrentPageIndex(prev => Math.min(prev + 1, book.images.length - 1));
    }
  };

  // 选择候选字
  const handleSelectCandidate = (candidateChar: string) => {
    setEditedChar(candidateChar);
    setHasUnsavedChanges(true);
  };

  // 保存修改
  const handleSave = async () => {
    if (!selectedCharId || !editedChar || saving) return;

    try {
      setSaving(true);
      await updateOCRCharacter(selectedCharId, { new_char: editedChar });

      // 更新本地状态
      if (currentImage && book) {
        const imageIndex = book.images.findIndex(img => img.id === currentImage.id);
        if (imageIndex !== -1) {
          const charIndex = book.images[imageIndex].ocr_characters.findIndex(
            c => c.id === selectedCharId
          );
          if (charIndex !== -1) {
            book.images[imageIndex].ocr_characters[charIndex].current_char = editedChar;
            book.images[imageIndex].ocr_characters[charIndex].is_corrected = true;
            setBook({ ...book }); // 触发重新渲染
          }
        }
      }

      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const selectedChar = currentImage?.ocr_characters.find(c => c.id === selectedCharId);

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
              <h1 className="text-2xl font-bold text-foreground">校对：{book.title}</h1>
              <div className="text-sm text-muted-foreground mt-1">
                第 {currentPageIndex + 1} / {book.images.length} 页
              </div>
            </div>
            <button
              onClick={() => router.push(`/book/${bookId}`)}
              className="classic-button-outline flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>返回详情</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧：图像+文字展示 */}
          <div className="col-span-8">
            <div className="classic-card">
              {/* 工具栏 */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-border">
                <h3 className="text-base font-bold text-foreground">原文对照</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    className="classic-button-outline text-xs px-2 py-1"
                    title="缩小"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={handleZoomIn}
                    className="classic-button-outline text-xs px-2 py-1"
                    title="放大"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <span className="mx-2 text-muted-foreground">|</span>
                  <button
                    onClick={handlePrevPage}
                    disabled={!canGoPrev}
                    className={`classic-button-outline text-xs px-2 py-1 ${
                      !canGoPrev ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="上一页"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!canGoNext}
                    className={`classic-button-outline text-xs px-2 py-1 ${
                      !canGoNext ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="下一页"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Canvas 展示区域 */}
              <div className="bg-muted rounded-md overflow-auto" style={{ maxHeight: '80vh' }}>
                {currentImage && (
                  <>
                    {/* 隐藏的原始图片，用于canvas绘制 */}
                    <img
                      ref={imageRef}
                      src={`${API_BASE_URL}/${currentImage.file_path.replace(/\\/g, '/')}`}
                      alt="原始图片"
                      className="hidden"
                    />
                    {/* Canvas 用于绘制裁剪的bbox和文字 */}
                    <canvas
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      className="cursor-pointer"
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：校对面板 */}
          <div className="col-span-4">
            <div className="classic-card sticky top-6">
              <h3 className="text-base font-bold text-foreground mb-4 pb-3 border-b-2 border-border">
                校对面板
              </h3>

              {selectedChar ? (
                <div className="space-y-4">
                  {/* 当前字符 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      当前字符：
                    </label>
                    <input
                      type="text"
                      value={editedChar}
                      onChange={(e) => {
                        setEditedChar(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="classic-input text-2xl text-center font-bold"
                      maxLength={10}
                    />
                  </div>

                  {/* 置信度 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      置信度：
                    </label>
                    <div className="text-base text-foreground">
                      {(selectedChar.confidence * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* 原始字符 */}
                  {selectedChar.is_corrected && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        原始字符：
                      </label>
                      <div className="text-base text-muted-foreground">
                        {selectedChar.original_char}
                      </div>
                    </div>
                  )}

                  {/* 候选字 */}
                  {selectedChar.candidates.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        候选字符：
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedChar.candidates
                          .sort((a, b) => a.rank - b.rank)
                          .map((candidate, index) => (
                            <button
                              key={index}
                              onClick={() => handleSelectCandidate(candidate.candidate_char)}
                              className={`classic-button-outline py-2 text-lg font-bold ${
                                editedChar === candidate.candidate_char
                                  ? 'border-primary bg-primary/10'
                                  : ''
                              }`}
                              title={`置信度: ${(candidate.confidence * 100).toFixed(1)}%`}
                            >
                              {candidate.candidate_char}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 保存按钮 */}
                  <div className="pt-4 border-t-2 border-border">
                    <button
                      onClick={handleSave}
                      disabled={!hasUnsavedChanges || saving}
                      className={`classic-button w-full flex items-center justify-center gap-2 ${
                        !hasUnsavedChanges || saving ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {saveSuccess ? (
                        <>
                          <Check size={16} className="text-green-600" />
                          <span className="text-green-600">保存成功</span>
                        </>
                      ) : saving ? (
                        <>
                          <Save size={16} />
                          <span>保存中...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>保存修改</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  点击左侧文字选择要校对的字符
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
