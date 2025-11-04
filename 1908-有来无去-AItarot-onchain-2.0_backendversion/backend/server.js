// 文件：backend/server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

dotenv.config();

const app = express();
const upload = multer(); // 内存里接收前端上传的图片

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// 简单健康检查
app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

//
// 1. AI 占卜接口：前端只把 prompt 发给后端，后端去调 DeepSeek
//
app.post("/api/ai", async (req, res) => {
  try {
    const prompt = req.body?.prompt;
    if (!prompt) {
      return res.status(400).json({ ok: false, error: "缺少 prompt" });
    }

    const resp = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是专业的中文塔罗牌解读AI。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1800,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const choices = resp.data?.choices || [];
    const text =
      (choices[0]?.message?.content || choices[0]?.text || "").trim();

    if (!text) {
      return res.json({
        ok: false,
        error: "AI 返回为空或无效",
        text: "",
      });
    }

    return res.json({ ok: true, text });
  } catch (e) {
    console.error("DeepSeek 调用失败:", e.response?.data || e.message);
    return res.status(500).json({
      ok: false,
      error:
        e.response?.data?.message ||
        e.message ||
        "AI 服务调用失败，请稍后重试",
    });
  }
});

//
// 2. IPFS 上传接口：前端上传截图 + meta，后端用 Pinata JWT 上链
//
app.post("/api/upload-reading", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "缺少图片文件 image" });
    }

    let meta = {};
    if (req.body?.meta) {
      try {
        meta = JSON.parse(req.body.meta);
      } catch {
        meta = {};
      }
    }

    const pinataJwt = process.env.PINATA_JWT;
    const gateway = (process.env.PINATA_GATEWAY ||
      "https://gateway.pinata.cloud/ipfs").replace(/\/$/, "");

    // 1）先 pin 图片
    const fd = new FormData();
    fd.append("file", req.file.buffer, {
      filename: req.file.originalname || "reading.png",
      contentType: req.file.mimetype || "image/png",
    });

    const pinFileResp = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      fd,
      {
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
          ...fd.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const imageCid = pinFileResp.data.IpfsHash;
    const imageHttp = `${gateway}/${imageCid}?filename=reading.png`;

    // 2）再 pin JSON metadata
    const metadata = {
      name: meta.name,
      description: meta.description,
      image: imageHttp,
      image_url: imageHttp,
      animation_url: imageHttp,
      image_ipfs: `ipfs://${imageCid}`,
      attributes: meta.attributes || [],
    };

    const pinJsonResp = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
          "Content-Type": "application/json",
        },
      }
    );

    const metaCid = pinJsonResp.data.IpfsHash;
    const url = `${gateway}/${metaCid}`;

    return res.json({ ok: true, url });
  } catch (e) {
    console.error("upload-reading 失败:", e.response?.data || e.message);
    return res.status(500).json({
      ok: false,
      error:
        e.response?.data?.error ||
        e.response?.data?.message ||
        e.message ||
        "IPFS 上传失败",
    });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
});
