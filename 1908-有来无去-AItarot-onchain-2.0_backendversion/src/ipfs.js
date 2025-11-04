// 文件：src/ipfs.js
import axios from "axios";
import { toPng } from "html-to-image";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

/** 把某个 DOM 节点截图为 dataURL PNG，再转 Blob/File */
 export async function elementToPngFile(el) {
   // 0.85~0.9 之间一般 < 1MB，钱包加载更快；白底更通用
     const dataUrl = await toPng(el, {
    cacheBust: true,
    pixelRatio: 2,             // 提升清晰度
    backgroundColor: "#2d0f48" // 深色纯底，避免漂白
  });
  
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], "reading.png", { type: "image/png" });
}


 export async function uploadReadingToIPFS(pngFile, meta) {
  const form = new FormData();
  form.append("image", pngFile);
  form.append("meta", JSON.stringify(meta || {}));

  try {
    const res = await axios.post(
      `${API_BASE}/api/upload-reading`,
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      }
    );

    if (!res.data || !res.data.ok) {
      throw new Error(res.data?.error || "IPFS upload failed");
    }

    return res.data.url; // 后端返回的 metadata HTTP 直链
  } catch (error) {
    console.error("IPFS上传整体失败:", error);
    throw error;
  }
}
