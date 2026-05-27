import { useCallback, useRef, useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { useAppStore } from "../store/appStore";

interface UploadAreaProps {
  onUploadComplete: () => void;
}

export const UploadArea = ({ onUploadComplete }: UploadAreaProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const setOriginalImage = useAppStore((s) => s.setOriginalImage);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        alert("请上传图片文件");
        return;
      }

      setUploading(true);

      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error("读取文件失败"));
          reader.readAsDataURL(file);
        });

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("加载图片失败"));
          img.src = dataUrl;
        });

        const maxSize = 500;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) throw new Error("Canvas context not available");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        setOriginalImage(img, imageData);
        onUploadComplete();
      } catch (error) {
        console.error("上传失败:", error);
        alert("上传失败，请重试");
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete, setOriginalImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div
        className={`relative w-full max-w-md h-64 rounded-2xl border-2 border-dashed 
          transition-all duration-300 cursor-pointer overflow-hidden
          ${isDragging 
            ? "border-gold bg-gold/10" 
            : "border-primary/30 hover:border-primary/60 hover:bg-primary/5"
          }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-primary">处理中...</span>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-primary">
                  点击或拖拽上传照片
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  支持 JPG, PNG, WebP 格式
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ImageIcon className="w-4 h-4" />
                <span>建议图片尺寸不超过 2000x2000</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
