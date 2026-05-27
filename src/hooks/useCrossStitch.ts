import { useCallback } from "react";
import { useAppStore } from "../store/appStore";
import { quantizeColors } from "../utils/colorQuantizer";
import { processGrid } from "../utils/gridProcessor";
import { findPaths } from "../utils/pathFinder";

export const useCrossStitch = () => {
  const {
    quantizeResult,
    gridResult,
    paths,
    settings,
    isProcessing,
    progress,
    progressText,
    setQuantizeResult,
    setGridResult,
    setPaths,
    setProcessing,
    setProgress,
    updateSettings,
  } = useAppStore();

  const processImage = useCallback(async () => {
    const { originalImageData } = useAppStore.getState();
    if (!originalImageData) return;

    setProcessing(true);
    setProgress(0, "开始处理...");

    try {
      const quantize = quantizeColors(
        originalImageData,
        20,
        30,
        (p, t) => setProgress(p * 0.5, t)
      );

      setQuantizeResult(quantize);
      setProgress(50, "网格化处理...");

      const grid = processGrid(quantize, settings.gridSize, (p, t) =>
        setProgress(50 + p * 0.3, t)
      );

      setGridResult(grid);
      setProgress(80, "计算路径...");

      const pathResults = findPaths(grid, quantize.palette.length, (p, t) =>
        setProgress(80 + p * 0.2, t)
      );

      setPaths(pathResults);
      setProgress(100, "处理完成！");
    } catch (error) {
      console.error("处理图像时出错:", error);
      setProgress(0, "处理失败");
    } finally {
      setProcessing(false);
    }
  }, [settings.gridSize, setProgress, setQuantizeResult, setGridResult, setPaths, setProcessing]);

  const handleFileUpload = useCallback(
    (file: File) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxSize = 400;
            let { width, height } = img;

            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("无法获取Canvas上下文"));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);

            useAppStore.getState().setOriginalImage(img, imageData);
            resolve();
          };
          img.onerror = () => reject(new Error("无法加载图像"));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error("无法读取文件"));
        reader.readAsDataURL(file);
      });
    },
    []
  );

  return {
    quantizeResult,
    gridResult,
    paths,
    settings,
    isProcessing,
    progress,
    progressText,
    processImage,
    handleFileUpload,
    updateSettings,
  };
};
