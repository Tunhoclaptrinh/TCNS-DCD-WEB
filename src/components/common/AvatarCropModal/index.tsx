import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Modal, Slider, Button, message } from "antd";
import { ZoomInOutlined, ZoomOutOutlined, RotateRightOutlined } from "@ant-design/icons";
import apiClient from "@config/axios.config";

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AvatarCropModalProps {
  imageSrc: string;          // Object URL or Cloudinary URL of uploaded image
  uploadedPublicId?: string; // Cloudinary publicId to delete if cancelled
  visible: boolean;
  onConfirm: (croppedBlob: Blob) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// Create a canvas-based crop of the image
async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(image, safeArea / 2 - image.width / 2, safeArea / 2 - image.height / 2);

  const data = ctx.getImageData(0, 0, safeArea, safeArea);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/jpeg", 0.92);
  });
}

const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  imageSrc,
  uploadedPublicId,
  visible,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || isDragging) return;
    setConfirming(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      await onConfirm(blob);
    } catch {
      message.error("Không thể xử lý ảnh. Thử lại!");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    // If there's a Cloudinary publicId (image already uploaded), delete it to keep storage clean
    if (uploadedPublicId) {
      setCancelling(true);
      try {
        await apiClient.delete("/upload/file", { data: { publicId: uploadedPublicId } });
      } catch {
        // Swallow - not critical if cleanup fails
      } finally {
        setCancelling(false);
      }
    }
    onCancel();
  };

  return (
    <Modal
      open={visible}
      title="Chỉnh sửa ảnh đại diện"
      onCancel={handleCancel}
      width={520}
      centered
      destroyOnClose
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            icon={<RotateRightOutlined />}
          >
            Xoay 90°
          </Button>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={handleCancel} loading={cancelling} disabled={confirming}>
              Hủy
            </Button>
            <Button
              type="primary"
              onClick={handleConfirm}
              loading={confirming || loading}
              disabled={cancelling || isDragging}
            >
              Xác nhận & Lưu
            </Button>
          </div>
        </div>
      }
    >
      {/* Crop Area */}
      <div style={{ position: "relative", width: "100%", height: 340, background: "#1a1a2e", borderRadius: 8, overflow: "hidden" }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          onInteractionStart={() => setIsDragging(true)}
          onInteractionEnd={() => setIsDragging(false)}
        />
      </div>

      {/* Zoom Slider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, padding: "0 8px" }}>
        <ZoomOutOutlined style={{ color: "#8c8c8c", fontSize: 16 }} />
        <Slider
          style={{ flex: 1 }}
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(val) => setZoom(val)}
          tooltip={{ formatter: (v) => `${Math.round((v! - 1) * 100)}%` }}
        />
        <ZoomInOutlined style={{ color: "#8c8c8c", fontSize: 16 }} />
      </div>
    </Modal>
  );
};

export default AvatarCropModal;
