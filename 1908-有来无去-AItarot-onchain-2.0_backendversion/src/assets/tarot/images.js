// src/assets/tarot/images.js
let tarotImages = {};
let tarotBack = "";

try {
  // 优先：Vite（import.meta.glob）
  const modules = import.meta.glob("./**/*.{jpg,png,webp}", { eager: true });
  for (const k in modules) {
    // 统一成 "major/00-fool.jpg" 这种 key
    const key = k.replace("./", "");
    tarotImages[key] = modules[k]?.default || modules[k];
  }
  tarotBack = tarotImages["back.jpg"] || tarotImages["major/back.jpg"] || tarotImages["back.png"] || "";
} catch (_) {
  // 兼容：CRA（require.context）
  const ctx = require.context("./", true, /\.(jpg|png|webp)$/);
  ctx.keys().forEach((k) => {
    const key = k.replace("./", "");
    tarotImages[key] = ctx(k);
  });
  tarotBack = tarotImages["back.jpg"] || tarotImages["major/back.jpg"] || tarotImages["back.png"] || "";
}

export { tarotImages, tarotBack };
