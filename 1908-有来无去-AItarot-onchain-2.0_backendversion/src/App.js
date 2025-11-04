// 文件：src/App.js
/* global BigInt */
import "./App.css";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ensureNetworkAndConnect, checkNetwork, switchToPaseo, getContract, getProvider, CONTRACT_ADDRESS } from "./chain";
import { elementToPngFile, uploadReadingToIPFS } from "./ipfs";
import { parseEther, formatEther } from "ethers";
import { tarotImages, tarotBack } from "./assets/tarot/images";

// --- 后端 API 网关
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";



// 所有牌阵配置
const ALL_CATEGORIES = [
  {
    label: "工作/创业",
    value: "work",
    spreads: [
      {
        label: "创业评估牌阵",
        value: "startup",
        positions: ["创业方向", "资金来源", "合伙关系", "客户设定", "店面区域定位", "事业前景"],
      },
      {
        label: "求职评估牌阵",
        value: "jobsearch",
        positions: ["工作性质", "工作地点", "薪资要求", "求职渠道", "求职趋势", "可以改进的地方"],
      },
      {
        label: "工作评估牌阵",
        value: "job",
        positions: ["能否胜任", "假期福利", "财务收入", "主管相处", "同事相处", "升迁加薪"],
      },
      {
        label: "工作二选一牌阵",
        value: "work2choose1",
        positions: ["当前自身状态", "选择A的状况", "选择A的影响", "选择B的状况", "选择B的影响"],
      },
    ],
  },
  {
    label: "人际关系",
    value: "relation",
    spreads: [
      {
        label: "人际关系牌阵",
        value: "relation",
        positions: ["你如何看待他", "他如何看待你", "两人相处的关系", "未来关系的发展"],
      },
      {
        label: "危机救援牌阵",
        value: "crisis",
        positions: ["发生争吵的问题点", "日常相处状况", "沟通方式", "如何化解纷争"],
      },
    ],
  },
  {
    label: "爱情",
    value: "love",
    spreads: [
      {
        label: "摆脱单身牌阵",
        value: "single",
        positions: ["没有对象的原因", "可以改进的地方", "可能找到对象的渠道"],
      },
      {
        label: "突破暧昧牌阵",
        value: "ambiguous",
        positions: ["自己本身的状况", "你对他的看法", "他对你的看法", "如何告白容易成功", "可能有阻碍", "他心中是否有别人"],
      },
      {
        label: "缘分检测牌阵",
        value: "bond",
        positions: ["你对关系的看法", "他对关系的看法", "彼此心灵契合", "是否有第三者", "缘分发展的前景"],
      },
      {
        label: "亲密关系牌阵",
        value: "intimacy",
        positions: ["金钱与价值观", "沟通方式", "日常相处", "性吸引力", "心灵契合", "与对方家人的关系", "未来发展前景"],
      },
    ],
  },
  {
    label: "财运",
    value: "wealth",
    spreads: [
      {
        label: "财富六芒星牌阵",
        value: "wealth6",
        positions: [
          "当前财务状况",
          "收入来源",
          "支出/负担",
          "投资与增长",
          "潜在风险",
          "财富发展建议",
        ],
      },
      {
        label: "财富三张牌阵",
        value: "wealth3",
        positions: ["当前财运", "阻碍/挑战", "机遇/建议"],
      },
      {
        label: "财富流动牌阵",
        value: "flow",
        positions: [
          "近期正财运",
          "偏财/意外之财",
          "财富流失的原因",
          "财富增长的机会",
          "需要警惕的问题",
          "财富能量的整体流向",
        ],
      },
    ],
  },
];

// 牌阵布局：用来告诉前端“每一张牌摆在画面哪个位置”
// 坐标是相对容器的百分比 (left = x, top = y)
const SPREAD_LAYOUTS = {
  // 工作/创业组 --------------------------

  // 「创业评估牌阵」6张：P1~P6 的相对摆法，照书上那页的布局
  "创业评估牌阵": [
    { x: "10%", y: "50%", label: "创业方向" },         // P1 左边竖着
    { x: "35%", y: "80%", label: "资金来源" },         // P2 左下
    { x: "60%", y: "80%", label: "合伙关系" },         // P3 右下
    { x: "35%", y: "20%", label: "客户设定" },         // P4 左上
    { x: "60%", y: "20%", label: "店面区域定位" },     // P5 右上
    { x: "90%", y: "55%", label: "事业前景" },         // P6 最右竖着
  ],

  // 「求职评估牌阵」6张：书里是个六角形/环绕一圈+底
  "求职评估牌阵": [
    { x: "50%", y: "15%", label: "工作性质" },         // P1 顶
    { x: "25%", y: "75%", label: "工作地点" },         // P2 左下
    { x: "75%", y: "75%", label: "薪资要求" },         // P3 右下
    { x: "25%", y: "25%", label: "求职渠道" },         // P4 左上
    { x: "75%", y: "25%", label: "求职趋势" },         // P5 右上
    { x: "50%", y: "85%", label: "可以改进的地方" },   // P6 底
  ],

  // 「工作评估牌阵」6张：中心+上下左右+右上角
  "工作评估牌阵": [
    { x: "50%", y: "65%", label: "能否胜任" },         // P1 中心
    { x: "50%", y: "10%", label: "假期福利" },         // P2 上
    { x: "20%", y: "25%", label: "财务收入" },         // P3 左
    { x: "25%", y: "75%", label: "主管相处" },         // P4 左下
    { x: "75%", y: "75%", label: "同事相处" },         // P5 右下
    { x: "80%", y: "25%", label: "升迁加薪" },         // P6 右
  ],

  // 「工作二选一牌阵」5张：A区(左两张)/B区(右两张)/自己在下方中间
  "工作二选一牌阵": [
    { x: "50%", y: "90%", label: "当前自身状态" },     // P1 你现在
    { x: "25%", y: "60%", label: "选择A的状况" },      // P2 A的状况
    { x: "25%", y: "15%", label: "选择A的影响" },      // P3 A的影响
    { x: "75%", y: "60%", label: "选择B的状况" },      // P4 B的状况
    { x: "75%", y: "15%", label: "选择B的影响" },      // P5 B的影响
  ],

  // 人际关系组 --------------------------

  // 「人际关系牌阵」4张：底边两个 → 中间 → 顶
  "人际关系牌阵": [
    { x: "25%", y: "80%", label: "你如何看待他" },     // P1 左下
    { x: "75%", y: "80%", label: "他如何看待你" },     // P2 右下
    { x: "50%", y: "55%", label: "两人相处的关系" },   // P3 中
    { x: "50%", y: "15%", label: "未来关系的发展" },   // P4 上
  ],

  // 「危机救援牌阵」4张：菱形
  "危机救援牌阵": [
    { x: "50%", y: "80%", label: "发生争吵的问题点" }, // 1 底
    { x: "25%", y: "50%", label: "日常相处状况" },     // 2 左
    { x: "75%", y: "50%", label: "沟通方式" },         // 3 右
    { x: "50%", y: "20%", label: "如何化解纷争" },     // 4 上
  ],

  // 爱情组 --------------------------

  // 「摆脱单身牌阵」3张：三角形
  "摆脱单身牌阵": [
    { x: "70%", y: "70%", label: "没有对象的原因" },   // 1 右下
    { x: "30%", y: "70%", label: "可以改进的地方" },   // 2 左下
    { x: "50%", y: "30%", label: "可能找到对象的渠道" }, // 3 顶
  ],

  // 「突破暧昧牌阵」6张：两边各两张 + 中心阻碍 + 顶部告白
  // 定义的顺序是：
  // ["自己本身的状况", "你对他的看法", "他对你的看法", "如何告白容易成功", "可能有阻碍", "他心中是否有别人"]
   "突破暧昧牌阵": [
    { x: "25%", y: "80%", label: "自己本身的状况" },       // 1 左下
    { x: "25%", y: "20%", label: "你对他的看法" },         // 2 左上
    { x: "75%", y: "80%", label: "他对你的看法" },         // 3 右下
    { x: "50%", y: "10%", label: "如何告白容易成功" },     // 4 顶
    { x: "50%", y: "70%", label: "可能有阻碍" },           // 5 中央
    { x: "75%", y: "20%", label: "他心中是否有别人" },     // 6 右上
  ],

  // 「缘分检测牌阵」5张：上面一张，中间三连，下面一张
  // 顺序是：
  // ["你对关系的看法", "他对关系的看法", "彼此心灵契合", "是否有第三者", "缘分发展的前景"]
  "缘分检测牌阵": [
    { x: "25%", y: "60%", label: "你对关系的看法" },       // 1 左
    { x: "75%", y: "60%", label: "他对关系的看法" },       // 2 右
    { x: "50%", y: "10%", label: "彼此心灵契合" },         // 3 中
    { x: "50%", y: "90%", label: "是否有第三者" },         // 4 下
    { x: "50%", y: "50%", label: "缘分发展的前景" },       // 5 上
  ],

  // 「亲密关系牌阵」7张：环绕 + 中心
  // 顺序是：
  // ["金钱与价值观", "沟通方式", "日常相处", "性吸引力", "心灵契合", "与对方家人的关系", "未来发展前景"]
  // 底部家人，中心“未来发展前景”
  "亲密关系牌阵": [
    { x: "75%", y: "75%", label: "金钱与价值观" },          // 1 右中
    { x: "25%", y: "75%", label: "沟通方式" },              // 2 左中
    { x: "50%", y: "10%", label: "日常相处" },              // 3 顶上
    { x: "25%", y: "25%", label: "性吸引力" },              // 4 左上
    { x: "75%", y: "25%", label: "心灵契合" },              // 5 右上
    { x: "50%", y: "90%", label: "与对方家人的关系" },      // 6 最下
    { x: "50%", y: "50%", label: "未来发展前景" },          // 7 中心
  ],

  // 财运组 --------------------------

  // 「财富六芒星牌阵」6张：真正六芒星
  // 顺序是：
  // ["当前财务状况","收入来源","支出/负担","投资与增长","潜在风险","财富发展建议"]
  // 摆放顺序：顶/右上/右下/左下/左上/中心
  "财富六芒星牌阵": [
    { x: "50%", y: "10%", label: "当前财务状况" },         // 顶
    { x: "85%", y: "35%", label: "收入来源" },             // 右上
    { x: "75%", y: "75%", label: "支出/负担" },            // 右下
    { x: "25%", y: "75%", label: "投资与增长" },           // 左下
    { x: "15%", y: "35%", label: "潜在风险" },             // 左上
    { x: "50%", y: "50%", label: "财富发展建议" },         // 中心
  ],

  // 「财富三张牌阵」3张：一条横线，保留简单
  // 顺序是：["当前财运","阻碍/挑战","机遇/建议"]
  "财富三张牌阵": [
    { x: "25%", y: "20%", label: "当前财运" },
    { x: "50%", y: "20%", label: "阻碍/挑战" },
    { x: "75%", y: "20%", label: "机遇/建议" },
  ],

  // 「财富流动牌阵」6张
  // 顺序：
  // ["近期正财运","偏财/意外之财","财富流失的原因","财富增长的机会","需要警惕的问题","财富能量的整体流向"]
  // 设计成资金流动 / 漏洞 / 机会 / 风险 / 最终走向，视觉是横向+下方汇总
  "财富流动牌阵": [
    { x: "5%", y: "20%", label: "近期正财运" },            // 左1
    { x: "28%", y: "20%", label: "偏财/意外之财" },        // 左2
    { x: "51%", y: "20%", label: "财富流失的原因" },        // 中上
    { x: "74%", y: "20%", label: "财富增长的机会" },        // 右2
    { x: "97%", y: "20%", label: "需要警惕的问题" },        // 右1
    { x: "50%", y: "65%", label: "财富能量的整体流向" },    // 底部汇总
  ],
};

function SpreadBoardUI({ spread, manualPicks, revealed, revealAt, getTarotImageById }) {
  // 根据 spread.label 找到对应布局
  const layout = SPREAD_LAYOUTS[spread.label] || [];
  const need = spread?.positions?.length || 0;

  return (
    <div
  style={{
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
    // 整体背景去掉
    background: "transparent",
    border: "none",
    boxShadow: "none",
    position: "relative",
    height: "600px",   // 这个高度可以自己调
    marginTop: "16px",      // 整块稍微往下，避免顶在输入框下方
    marginBottom: "32px",   // 给底下“免费AI解读 / 上传铸造NFT”按钮一点空间，避免它们盖上牌阵文字
    padding: "0",      
  }}
>

      {layout.map((slot, idx) => {
        const card = manualPicks[idx];
        const opened = revealed[idx];
        const left = slot.x;
        const top = slot.y;

       if (!card) {
  const need = spread?.positions?.length || 0;
  const nextIndex = manualPicks?.length || 0;
  const isCurrent = idx === nextIndex; // 当前应抽的位置

  return (
    <div
      key={idx}
      style={{
        position: "absolute",
        left,
        top,
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        color: "#fff",
        width: "120px",
      }}
    >
      <div
        className={`slot-empty ${isCurrent ? "highlight" : ""}`}
      />
      <div
        style={{
          fontSize: "12px",
          marginTop: "6px",
          lineHeight: 1.4,
        }}
      >
        {slot.label}
      </div>
    </div>
  );
}


        if (!opened) {
          return (
            <div key={idx} style={{
              position: "absolute", left, top, transform: "translate(-50%, -50%)", textAlign: "center", color: "#fff", width: "120px",
            }}>
              <img src={tarotBack} alt="back" className="tarot-card"
                style={{ cursor: "pointer" }}
                onClick={() => revealAt(idx)}
                title={`${slot.label}｜点击翻面`}
              />
              <div style={{ fontSize: "12px", marginTop: "6px", lineHeight: 1.4 }}>{slot.label}</div>
            </div>
          );
        }

        const img = getTarotImageById(card.id);
        const isReversed = card.position === "逆位";
        return (
          <div key={idx} style={{
            position: "absolute", left, top, transform: "translate(-50%, -50%)", textAlign: "center", color: "#fff", width: "120px",
          }}>
            <img src={img} alt={card.name} className="tarot-card"
              style={isReversed ? { transform: "rotate(180deg)" } : undefined}
              title={`${slot.label}｜${card.name}（${card.position}）`}
            />
            <div style={{ fontSize: "12px", marginTop: "6px", lineHeight: 1.4 }}>
              {slot.label}：{card.name}（{card.position}）
            </div>
          </div>
        );
      })}
    </div>
  );
}


function getFreeCount() {
  // 每天重置，localStorage简单防刷
  const today = new Date().toISOString().slice(0, 10);
  const data = JSON.parse(localStorage.getItem("freeTarot") || "{}");
  if (data.date !== today) return 0;
  return data.count || 0;
}
function incFreeCount() {
  const today = new Date().toISOString().slice(0, 10);
  const data = JSON.parse(localStorage.getItem("freeTarot") || "{}");
  localStorage.setItem("freeTarot", JSON.stringify({ date: today, count: (data.count || 0) + 1 }));
}

export default function App() {
  const [category, setCategory] = useState(ALL_CATEGORIES[0]);
  const [spread, setSpread] = useState(category.spreads[0]);
  const [question, setQuestion] = useState("");
  const [drawnCards, setDrawnCards] = useState([]);
  const [aiResult, setAIResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [freeUsed, setFreeUsed] = useState(getFreeCount() >= 1);
  const [wallet, setWallet] = useState(null);
  const [minting, setMinting] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [quote, setQuote] = useState({ unit: 0n, cards: 0, total: 0n });
  const [paying, setPaying] = useState(false);
  const [credit, setCredit] = useState(0n);
  const [paidFlow, setPaidFlow] = useState(false);
  const [drawSeq, setDrawSeq] = useState(0);     // 每次“点击抽牌”自增，表示第几轮抽牌
  const [resultSeq, setResultSeq] = useState(-1); // 记录“哪一轮抽牌”的 AI 结果已生成
  const [drawMode, setDrawMode] = useState("auto");   // "auto" | "manual"
  const [pool, setPool] = useState([]);               // 手动模式：洗牌后的一行牌（牌背）
  const [manualPicks, setManualPicks] = useState([]); // 已从 pool 里点出的牌（发到牌阵）
 
  // 抽牌阶段控制：idle -> shuffling -> choosing -> done
  const [phase, setPhase] = useState("idle");
  const [shuffleStage, setShuffleStage] = useState("idle"); 
  // "idle" | "shuffling" | "choose"


  const [revealed, setRevealed] = useState({});       // 手动：各位置是否翻面 { posIndex: true }
  const [packPool, setPackPool] = useState(false);
    // 记录“哪一轮抽牌付过钱，还没完成交付”
  const [refundEligibleSeq, setRefundEligibleSeq] = useState(null);
  // 记录“这轮已经尝试过自动退款但失败了（可能用户断网/钱包没广播），
  // 用于在UI上继续展示‘申请退款’按钮让TA重试”
  const [refundFailed, setRefundFailed] = useState(false);

  // ====== 👇 这几行一定要放在 shuffleStage 下面！！！！！ ======
  const DRAWING_SCALE = 0.78; // 大小可以调

  const needScaleDown =
    drawMode === "manual" &&
    shuffleStage === "choose" &&
    manualPicks.length < (spread?.positions?.length || 0);
  // ====== 👆 到这里结束 ======

  // 防呆：一旦切换牌阵/分类，如果支付弹窗仍是打开状态，则仅关闭弹窗与停止 loading；不动之前的报价
useEffect(() => {
  if (showPayModal) {
    setShowPayModal(false);
    setPaying(false);
  }
}, [spread?.value, spread?.positions?.length, category?.value]); 


  const captureRef = useRef(null); // 用于截图的DOM
  const shuffleTimerRef = useRef(null); // ← 手动洗牌计时器，用来切场时清掉
  // AI 状态机：idle | requesting(思考/请求中) | rendering(渲染稳定中) | ready(就绪) | error
const [aiStatus, setAiStatus] = useState("idle");
const aiReqIdRef = useRef(0); // 只认“最新一次”AI请求结果

 // 右上角下拉 & 网络提示
 const [walletMenu, setWalletMenu] = useState(false);
 const [onPaseo, setOnPaseo] = useState(true);
 const [showSwitchBar, setShowSwitchBar] = useState(false);

  // 账户变更 / 断开 / 链切换；初始化网络状态
  React.useEffect(() => {
    if (!window.ethereum) return;
    const onAccountsChanged = (accs) => setWallet(accs?.[0] || null);
    const onDisconnect = () => setWallet(null);
    const onChainChanged = async () => {
      const st = await checkNetwork();
      setOnPaseo(st.ok);
      setShowSwitchBar(!st.ok);
    };
    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("disconnect", onDisconnect);
    window.ethereum.on("chainChanged", onChainChanged);
    // 初始化检测
    (async () => {
      try {
        const st = await checkNetwork();
        setOnPaseo(st.ok);
        setShowSwitchBar(!st.ok);
      } catch {}
    })();
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("disconnect", onDisconnect);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, []);



  // 卡牌池（完整 78 张塔罗牌，大阿尔克那 + 小阿尔克那）
// 生成 78 张：22 张大阿卡那 + 56 张小阿卡那
const MAJORS = [
  ["00-fool","愚人"],["01-magician","魔术师"],["02-high-priestess","女祭司"],["03-empress","女皇"],
  ["04-emperor","皇帝"],["05-hierophant","教皇"],["06-lovers","恋人"],["07-chariot","战车"],
  ["08-strength","力量"],["09-hermit","隐士"],["10-wheel-of-fortune","命运之轮"],["11-justice","正义"],
  ["12-hanged-man","倒吊人"],["13-death","死神"],["14-temperance","节制"],["15-devil","恶魔"],
  ["16-tower","高塔"],["17-star","星星"],["18-moon","月亮"],["19-sun","太阳"],["20-judgement","审判"],["21-world","世界"]
];

const SUITS = [
  { key: "cups", zh: "圣杯" },
  { key: "pentacles", zh: "钱币" },
  { key: "swords", zh: "宝剑" },
  { key: "wands", zh: "权杖" },
];
const RANKS = [
  { key: "ace", zh: "A" }, { key: "2", zh: "2" }, { key: "3", zh: "3" }, { key: "4", zh: "4" }, { key: "5", zh: "5" },
  { key: "6", zh: "6" }, { key: "7", zh: "7" }, { key: "8", zh: "8" }, { key: "9", zh: "9" }, { key: "10", zh: "10" },
  { key: "page", zh: "侍从" }, { key: "knight", zh: "骑士" }, { key: "queen", zh: "王后" }, { key: "king", zh: "国王" },
];

// 统一的卡片对象：{ id: "major/00-fool", name: "愚人" } 或 { id: "cups/cups-ace", name: "圣杯A" }
function buildDeck() {
  const majors = MAJORS.map(([slug, zh]) => ({ id: `major/${slug}`, name: zh }));
  const minors = [];
  SUITS.forEach((s) => {
    RANKS.forEach((r) => {
      minors.push({
        id: `${s.key}/${s.key}-${r.key}`,
        name: `${s.zh}${r.zh}`,
      });
    });
  });
  return [...majors, ...minors]; // 共 78
}
const TAROT_DECK = buildDeck();

// 根据卡片 id 取图片
function getTarotImageById(cardId) {
    const base = String(cardId || "").split("/").pop();

    const exts = ["jpg","webp","png","JPG","WEBP","PNG"];

    const prefixes = [
    "",                 // "cups-2.jpg"
    "./",               // "./cups-2.jpg"
    "src/assets/tarot/",// "src/assets/tarot/cups-2.jpg"
    "/src/assets/tarot/"// "/src/assets/tarot/cups-2.jpg"
  ];

  const tryKeys = [];
  for (const p of prefixes) for (const e of exts) tryKeys.push(`${p}${base}.${e}`);

  const raw = String(cardId || "");
  for (const e of exts) tryKeys.push(`${raw}.${e}`, `./${raw}.${e}`);

  for (const k of tryKeys) {
    if (tarotImages && tarotImages[k]) return tarotImages[k];
  }

  console.warn("[Tarot] image not found for id:", cardId, "tried:", tryKeys);
  return tarotBack || (tarotImages ? Object.values(tarotImages)[0] : "");
}

   
  function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 生成带正/逆位：在原卡片对象基础上追加 position 字段
function attachFacing(cards) {
  return cards.map(c => ({
    ...c, // 保留 { id, name }
    position: Math.random() < 0.5 ? "正位" : "逆位",
  }));
}

  // 抽牌：支持 "auto" / "manual"
function drawCards(num) {
  // 防呆：AI 还在解读中时，不允许重新抽牌，避免白白浪费本次机会
  if (aiStatus === "requesting" || aiStatus === "rendering") {
    alert("AI正在解读中，请先等它结束再抽牌。");
    return;
  }
  // 无钱包禁止抽牌（无论自动/手动）
  if (!wallet) {
    alert("请先连接钱包");
    return;
  }

  // 进入新一轮抽牌：关闭任何尚未完成的支付弹窗，递增抽牌序号，并清空结果对应关系
  setShowPayModal(false);
  setPaying(false);
  setDrawSeq((x) => x + 1);
  setResultSeq(-1);
  setAIResult("");
  setManualPicks([]);
  setRevealed({});
  setPool([]);
  setPackPool(false);

  if (!num || !spread?.positions?.length) {
    alert("请选择牌阵");
    return;
  }
  

  if (drawMode === "auto") {
    // 自动：一次性随机抽 num 张
    const picks = attachFacing(shuffle(TAROT_DECK).slice(0, num));
    // 写回到现有的结果状态
    setDrawnCards(picks);

    // 自动模式下直接翻面（若在其他地方用到了 revealed，可同步设置）
    setRevealed(Object.fromEntries(picks.map((_, i) => [i, true])));

    //  AI 逻辑保持不变：此处不强制调用，仍由“免费AI解读 / 支付解锁”按钮触发
    // 如果想抽完就立刻跑 AI，可在此调用 handleAI()。
  } else {
    // 手动：先洗出一叠“候选池”，仅显示牌背，等待用户逐张点选
    const poolShuffled = shuffle(TAROT_DECK);
    setPool(poolShuffled);     // 仅名字/ID，展示时用牌背图
    setManualPicks([]);        // 还未发到牌阵
    setDrawnCards([]);         // UI 里不展示正面
    setRevealed({});           // 未翻面
    // 等用户点满 num 张，再点击“解读”按钮时再去调 handleAI()
  }
   // 抽完后锁定成完成态，隐藏候选池
  if (drawMode === "auto") {
  setPhase("done");
} else {
  // 手动模式保持 in-progress，让用户自己逐张发牌+翻面
}

}
   
// 从 pool 里“发第 i 张牌”到牌阵（按顺序填到 spread.positions）
function dealAt(i) {
  const need = spread?.positions?.length || 0;
  if (manualPicks.length >= need) return;
  if (!pool?.length) return;
  const idx = Math.max(0, Math.min(i, pool.length - 1));

  // 取出第 idx 张牌
  const picked = pool[idx];
  const rest = [...pool.slice(0, idx), ...pool.slice(idx + 1)];
  setPool(rest);

  const withFacing = { ...picked, position: Math.random() < 0.5 ? "正位" : "逆位" };
  const newPicks = [...manualPicks, withFacing];
  setManualPicks(newPicks);

  if (newPicks.length >= need) {
    setPackPool(true);
    setTimeout(() => setPool([]), 1200);
  }
}
// 手动：翻面某个位置的牌
function revealAt(index) {
  setRevealed({ ...revealed, [index]: true });
}

// 手动模式：当发满牌（数量=牌阵张数）后，把结果同步到 drawnCards，便于下方按钮/AI/截图等统一复用
useEffect(() => {
  const need = spread?.positions?.length || 0;
  if (drawMode === "manual" && manualPicks.length === need && need > 0) {
    setDrawnCards(manualPicks);
  }
}, [manualPicks, drawMode, spread?.positions?.length]);

// 手动模式：当牌阵抽满 && 全部翻面 => phase = "done"
useEffect(() => {
  if (drawMode !== "manual") return;
  const need = spread?.positions?.length || 0;
  if (!need) return;

  // 抽满了 → 立刻进入 done 布局（这样牌阵就会到按钮下面去）
  if (manualPicks.length === need && phase !== "done") {
    setPhase("done");
    return; 
  }

  if (phase === "done") return; 
  const allOpen = [...Array(need).keys()].every((i) => revealed[i]);
  if (allOpen) {
    setPhase("done");
  }
}, [drawMode, manualPicks, revealed, spread?.positions?.length, phase]);




// 手动：全部准备好后，点击“开始解读”
async function interpretManual() {
  const need = spread?.positions?.length || 0;
  if (manualPicks.length < need) {
    alert(`还差 ${need - manualPicks.length} 张牌未抽完`);
    return;
  }
  
  // const allOpen = [...Array(need).keys()].every(i => revealed[i]);
  // if (!allOpen) { alert("请先把所有牌翻面"); return; }

  // 把手动结果塞回原先的“本轮抽中卡组”state
   setDrawnCards(manualPicks);
 await handleAI();
}


// 等待 .ai-reading 节点在 stableMs 时间内高度不再变化，判断渲染稳定
async function waitRenderStable(node, { checkEvery=120, stableMs=600, timeoutMs=15000 } = {}) {
  if (!node) return false;
  let lastH = -1, stableFor = 0;
  const start = Date.now();
  return new Promise(resolve => {
    const t = setInterval(() => {
      const h = node.scrollHeight;
      if (h === lastH) { stableFor += checkEvery; } else { stableFor = 0; lastH = h; }
      const timedOut = Date.now() - start > timeoutMs;
      if (stableFor >= stableMs || timedOut) {
        clearInterval(t);
        resolve(stableFor >= stableMs);
      }
    }, checkEvery);
  });
}

// 单次尝试向后端要解读文本，返回 { ok, text, errMsg }
async function runAIOnce(prompt) {
  try {
    const { data } = await axios.post(
      `${API_BASE}/api/ai`,
      { prompt },
      { timeout: 30000 }
    );

    console.log("后端 AI 响应:", data);

    if (!data || !data.ok) {
      return {
        ok: false,
        text: "",
        errMsg: data?.error || "AI 调用失败",
      };
    }

    const text = (data.text || "").trim();
    if (!text) {
      return {
        ok: false,
        text: "",
        errMsg: "AI 返回内容为空或无效",
      };
    }

    return { ok: true, text, errMsg: "" };
  } catch (err) {
    console.error("AI 调用异常:", err);
    const msg =
      err?.response?.data?.error ||
      err?.message ||
      "未知错误 / 网络异常 / 服务未响应";
    return {
      ok: false,
      text: "",
      errMsg: msg,
    };
  }
}


// AI 解读（免费 / 付费都会走这里）
// fromPaid = true 表示这是“刚刚钱包付过钱、立刻来要结果”的那一次
async function handleAI(fromPaid = false) {
  // 手动模式要先检查牌有没有抽满 / 翻开
  if (drawMode === "manual") {
    const need = spread?.positions?.length || 0;
    if (manualPicks.length < need) {
      alert(`还差 ${need - manualPicks.length} 张牌未抽完`);
      return;
    }
    const allOpen =
      need === 0 ? true : [...Array(need).keys()].every((i) => revealed[i]);
    if (!allOpen) {
      alert("请先翻开所有牌面，查看抽牌结果！");
      return;
    }
  }

  setLoading(true);
  setAiStatus("requesting");
  setAIResult("AI智能分析生成中…");

  // 只认这一次
  const myId = ++aiReqIdRef.current;

  // 组 prompt
  const spreadText = spread.positions
    .map(
      (pos, i) =>
        `${pos}: ${drawnCards[i]?.name || ""}（${
          drawnCards[i]?.position || ""
        }）`
    )
    .join("\n");

  const prompt = `你是一名资深的中文塔罗牌解读大师。请根据下述用户主题、抽到的牌阵（每张牌含正逆位）、各牌位意义，生成一段详细、针对性强的原创塔罗占卜解读。要求：
- 解读内容要结合用户具体问题和各牌位的含义；
- 不要仅仅罗列每张牌的几个关键字；
- 分点分析每张牌对应的现实含义，并在结尾给出综合建议；
- 语言风格生活化、自然、温暖，并避免与市面塔罗书原文雷同；
- 遇到含义模糊或多解的牌，也要结合牌阵、上下文和用户提问灵活推理。
用户提问：【${question}】
所用牌阵：【${spread.label}】
各牌如下：
${spreadText}
请生成详细占卜分析（至少300字），并给出可行动建议。`;

  // 第一次请求
  const firstTry = await runAIOnce(prompt);

  // 如果第一次失败 / 空结果，再尝试第二次
  let finalText = "";
  let finalOK = false;
  let finalErrMsg = "";

  if (firstTry.ok) {
    finalText = firstTry.text;
    finalOK = true;
  } else {
    console.warn("第一次AI失败，准备第二次重试:", firstTry.errMsg);
    const secondTry = await runAIOnce(prompt);
    if (secondTry.ok) {
      finalText = secondTry.text;
      finalOK = true;
    } else {
      finalErrMsg =
        secondTry.errMsg || firstTry.errMsg || "AI两次均未成功";
    }
  }

  // =============== 成功分支 ===============
  if (finalOK) {
    // 不是最新请求就丢弃
    if (myId !== aiReqIdRef.current) {
      setLoading(false);
      return;
    }

    setAIResult(finalText);

    // 先挂 DOM，再等稳定
    setAiStatus("rendering");
    await new Promise((r) => setTimeout(r, 0));
    const okStable = await waitRenderStable(
      document.querySelector(".ai-reading")
    );
    if (myId !== aiReqIdRef.current) {
      setLoading(false);
      return;
    }

    setAiStatus(okStable ? "ready" : "rendering");
    setResultSeq(myId); // 用这次的 id 当成本轮序号

    // ===== 分：付费成功 vs 免费成功 =====
// 只有这一次明确是“付费触发”的调用(也就是 handleAI(true) )才算付费
const paidRun = !!fromPaid;

if (paidRun && okStable) {
  // ① 付费这次成功拿到结果
  // 把这笔服务视为交付完成：清掉退款资格
  setCredit(0n);
  setRefundEligibleSeq(null);
  setRefundFailed(false);
  // 注意：不要动免费次数
} else {
  // ② 免费成功
  // 扣掉今天的免费名额 & 隐藏绿色按钮
  incFreeCount();
  setFreeUsed(true);
}


    setLoading(false);
    return;
  }

    // =============== 失败分支 ===============
  if (myId !== aiReqIdRef.current) {
    // 已经过时的那次请求，丢掉
    setLoading(false);
    return;
  }

  // 这一次到底算不算“付费占卜的那一单”
  // 规则：只要本次是通过付费触发的，或者还在付费流程里，或者这轮有付费额度(credit>0n)，
  // 就当成付费失败，给退款通道，而不是当成免费。
  // 这一次到底算不算“付费占卜的那一单”
// 现在只信 fromPaid 这个参数：
// - confirmPay() 里调用 handleAI(true) => fromPaid === true
// - 免费按钮调用 handleAI()        => fromPaid === false / undefined
const paidRunNow = !!fromPaid;

if (paidRunNow) {
  // ======= 付费占卜失败（AI 没给结果） =======
  // 要求：告诉他可以申请原路退款，展示退款按钮，不送免费额度

  alert("当前网络有问题，请稍后再来占卜！");

  setAIResult("AI本次没有返回有效占卜结果，请联系人工客服进行退款！");
  setAiStatus("idle");        // aiStatus === "error" => UI 会渲染“申请退款”按钮
  setResultSeq(-1);

  // 标记这一轮可以退款
   setRefundFailed(false);

  // 不要送免费次数
  setFreeUsed(true);

  // 这轮付费流程到这里强制收尾，避免脏状态污染下一次
  setPaidFlow(false);

  // 不清 credit，这样还能点“申请退款”拿回钱
  setLoading(false);
  return;
}

// ======= 免费占卜失败（AI 没给结果） =======
// 要求：提示“请稍后回来占卜”，不要出现退款按钮，绿色免费按钮继续保留
alert("当前网络有问题，请稍后回来占卜！");

setAIResult("AI本次没有返回有效占卜结果，请稍后回来占卜。");

// 不给退款按钮
setAiStatus("idle");        // 不是 "error"
setResultSeq(-1);
setRefundEligibleSeq(null);
setRefundFailed(false);

// 给回绿色的“免费AI解读（每日一次）”按钮
setFreeUsed(false);

// 不扣今天的免费额度（没调用 incFreeCount）
// 顺手也把 paidFlow 清空，保证下一轮不会被误判成付费
setPaidFlow(false);

setLoading(false);
return;
}



  // 支付按钮
  async function handlePay() {
  //  如果AI还在生成/渲染，还没准备好，就直接拦截，防止重复扣款
    if (aiStatus === "requesting" || aiStatus === "rendering") {
      alert("AI正在解读本次占卜结果，请稍候完成后再解锁更多占卜。");
      return;
    }

  // 未全部翻面，禁止发起付费，并提示
  const need = spread?.positions?.length || 0;
  const okRevealed =
    drawMode === "auto" ? true : [...Array(need).keys()].every((i) => revealed[i]);
  if (!okRevealed) {
    alert("请先翻开所有牌面，查看抽牌结果！");
    return;
  }

  // 新增防呆：如果上一笔付费占卜失败、还没人工处理完，不允许为同一轮再次付费
  if (
    refundEligibleSeq !== null &&          // 有一笔付费占卜在这轮
    refundEligibleSeq === drawSeq &&       // 且就是当前这轮抽牌
    aiStatus === "idle"                    // 但 AI 结果没出来（处于失败/结束状态）
  ) {
    alert("刚才这次付费占卜因网络原因没有完成，请先联系人工客服处理本次订单，再重新开始新的占卜哦～");
    return;
  }

   // 防呆：如果当前抽牌(drawSeq)已经有 AI 结果(resultSeq 同号)，禁止再次发起付费。
  // 只有用户“重新抽牌”(drawSeq 自增) 才能再触发新的付费流程。
      if (aiStatus === "ready" && resultSeq === drawSeq) {
      alert("当前抽牌的 AI 解读已生成。如需再次解读，请先重新抽牌。");
      return;
      } 

  try {
    const contract = await getContract();
    const unit = await contract.unitPricePerCard();   // BigInt: wei
    const cards = spread.positions.length;            // 牌阵张数
    const total = unit * BigInt(cards);               // 总价 = 单价 × 张数
    setQuote({ unit, cards, total });
    setShowPayModal(true);
  } catch (e) {
    alert(e?.message || String(e));
  }
}

 async function confirmPay() {
  // AI 还在跑，就不让再次点支付，避免重复扣款
  if (aiStatus === "requesting" || aiStatus === "rendering") {
    alert("AI正在解读中，请稍候，不要重复支付。");
    return;
  }

  // 新增防呆：上一笔付费占卜失败(当前轮次仍被标记为已付费但未交付)，不允许再次为同一轮付款
  if (
    refundEligibleSeq !== null &&
    refundEligibleSeq === drawSeq &&
    aiStatus === "idle"
  ) {
    alert("刚才这次付费占卜因网络问题没有完成，请先联系人工客服协助处理，再重新开始新的占卜～");
    return;
  }

  // 防呆：当前这轮占卜已经有完整的 AI 结果了，就不允许再为同一轮付费
  if (aiStatus === "ready") {
    alert("本次占卜已经完成，如需新的解读，请先重新抽牌，再解锁更多占卜内容哦～");
    return;
  }

  try {
    setPaying(true);

    const contract = await getContract();
    const tx = await contract.payToUnlock(quote.cards, { value: quote.total });
    await tx.wait();
    // 支付成功后：记录额度 -> 关闭弹窗 -> **自动调用 AI**
    setCredit(quote.total);
    
    // 记录这一轮抽牌编号是“付过钱，等交付”的轮次
    setRefundEligibleSeq(drawSeq);
    setRefundFailed(false);

    setShowPayModal(false);
    setPaidFlow(true);
    await handleAI(true).catch(() => {}); 
    
   setPaidFlow(false);
    } catch (e) {
    alert(e?.reason || e?.message || String(e));
  } finally {
    setPaying(false);
  }
}

// 手动退款：现在不再走链上自动退款，只提示用户联系人工客服
async function requestRefund() {
  alert("AI本次没有返回有效占卜结果，如已扣款，请截图本页面并联系人工客服协助退款。");
}


  // 导航和牌阵切换
  function handleCategoryChange(val) {
  // 防呆：AI 正在生成 / 正在渲染 / 正在支付 / 正在看支付弹窗，都不准切
  if (
    aiStatus === "requesting" ||
    aiStatus === "rendering" ||
    paying ||
    showPayModal
  ) {
    alert("当前这次占卜还没跑完，请先等它结束再切换。");
    return;
  }

  const cat = ALL_CATEGORIES.find((v) => v.value === val);
  setCategory(cat);
  setSpread(cat.spreads[0]);
  resetRoundStates();
}

  function handleSpreadChange(val) {
  if (
    aiStatus === "requesting" ||
    aiStatus === "rendering" ||
    paying ||
    showPayModal
  ) {
    alert("当前这次占卜还没跑完，请先等它结束再切换。");
    return;
  }

  const sp = category.spreads.find((v) => v.value === val);
  setSpread(sp);
  resetRoundStates();
}


// —— 统一清空一轮抽牌/AI/支付/可视化状态 ——
 function resetRoundStates() {
  // 1) 清牌 & 池子
  setDrawnCards([]);
  setAIResult("");
  setManualPicks([]);
  setRevealed({});
  setPool([]);
  setPackPool(false);

  // 2) 清“阶段”，最关键的两行
  setPhase("idle");
  setShuffleStage("idle");

  // 3) 如果之前在手动洗牌，有一个 5s 的定时器，要清掉
  if (shuffleTimerRef.current) {
    clearTimeout(shuffleTimerRef.current);
    shuffleTimerRef.current = null;
  }

  // 4) 清理本轮视觉/流程状态，准备开新一轮
setShowPayModal(false);
setPaying(false);
setResultSeq(-1);
setAiStatus("idle");
setPaidFlow(false);
}


// —— 抽牌方式切换（自动/手动）——：切换时顺带清空上一次的一轮状态
function changeDrawMode(mode) {
  if (
    aiStatus === "requesting" ||
    aiStatus === "rendering" ||
    paying ||
    showPayModal
  ) {
    alert("AI正在解读中，请先等它结束再切换。");
    return;
  }

  if (mode === drawMode) return;
  setDrawMode(mode);
  resetRoundStates();
}

function startManualRound() {
   // 必须先连接钱包
  if (!wallet) {
    alert("请先连接钱包");
    return;
  }
  //重置一轮
  resetRoundStates();        
  setPhase("in-progress");   // 进入占卜中
  setShuffleStage("shuffling"); // 先播洗牌动画

  // 准备新的候选池，但暂时不展示两行牌池，等动画结束后再展示
  const poolShuffled = shuffle(TAROT_DECK);
  setPool(poolShuffled);

  // 把本轮的一些标记清好，避免串单
  setDrawSeq((x) => x + 1);
  setResultSeq(-1);
  setAIResult("");
  setManualPicks([]);
  setRevealed({});
  setPackPool(false);
  setDrawnCards([]);

    // 5 秒后，让用户可以抽牌
  if (shuffleTimerRef.current) {
    clearTimeout(shuffleTimerRef.current);
  }
  shuffleTimerRef.current = setTimeout(() => {
    setShuffleStage("choose"); // 动画结束，允许挑牌
    shuffleTimerRef.current = null; // 用完清掉
  }, 5000);
}

   function resetAndIdle() {
  // 防呆：AI 还在生成/渲染中时，不允许清空本轮结果
  if (aiStatus === "requesting" || aiStatus === "rendering") {
    alert("AI正在解读中，请稍后再重新占卜，以免丢失本次结果。");
    return;
  }

  // 安全了，才真正重置
  resetRoundStates();    
  setPhase("idle");      
  setShuffleStage("idle");
}


    async function onConnect() {
    try {
      const { address, onPaseo: ok } = await ensureNetworkAndConnect();
      setWallet(address);
      setOnPaseo(ok);
      setShowSwitchBar(!ok);
      alert("钱包已连接：" + address);
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

   async function onSwitchPaseo() {
    try {
      await switchToPaseo();
      const st = await checkNetwork();
      setOnPaseo(st.ok);
      setShowSwitchBar(!st.ok);
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  function onDisconnectLocal() {
    // 只能清 UI，本质断开需在 MetaMask “已连接站点”里移除
    setWallet(null);
    setWalletMenu(false);
  }

   const [page, setPage] = useState("main");      // main / leaderboard
   const [leaderboard, setLeaderboard] = useState([]); // [{addr, score}]
   const [lbUpdatedAt, setLbUpdatedAt] = useState(""); // 最近更新时间(本地)

  // ======== LB_UTILS (CTRL+F: LB_UTILS) ========
function shortAddr(addr){
  if(!addr || addr.length < 10) return addr || "";
  // 需求：只显示 "0x" + 之后5位 + 省略号 + 末尾5位
  return `${addr.slice(0, 2 + 5)}...${addr.slice(-5)}`;
}

// ======== LB_BUILD (CTRL+F: LB_BUILD) ========
// 说明：统计规则 = 每次 mint 记 1 分（ERC721 Transfer 事件里 from 为 0x000...0）
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_TOPIC     = "0x0000000000000000000000000000000000000000000000000000000000000000";

// 读取并统计（带本地缓存，每天凌晨刷新）
async function buildLeaderboard(force=false){
  try{
    // 1) 先看今天是否已有缓存
    const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    const cacheRaw = localStorage.getItem("LB_CACHE_V1");
    if(!force && cacheRaw){
      const cache = JSON.parse(cacheRaw);
      if(cache?.day === today && Array.isArray(cache?.data)){
        setLeaderboard(cache.data);
        setLbUpdatedAt(cache.updatedAt || "");
        return;
      }
    }

    // 2) 读链上日志
    const provider = await getProvider(); // 只读不弹窗（见 chain.js）
    const net = await provider.getNetwork();
    // 可选：不在目标网就提醒（但仍尝试读取）
    // if (Number(net.chainId) !== 420420422) alert("建议切到 Paseo 再看排行榜");

    const latest = await provider.getBlockNumber(); // number
    const step = 20_000; // 分段拉，避免一次性过大
    const scores = new Map(); // addr -> count

    for(let from = 0; from <= latest; from += step){
      const to = Math.min(latest, from + step - 1);
      const logs = await provider.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: from,
        toBlock: to,
        topics: [TRANSFER_TOPIC, ZERO_TOPIC] // 只要 mint（from == 0x00）
      });
      for(const lg of logs){
        const toTopic = lg.topics?.[2];   // indexed to
        if(!toTopic) continue;
        const addr = "0x" + toTopic.slice(-40); // 末40位
        scores.set(addr, (scores.get(addr) || 0) + 1);
      }
    }

    // 3) 排序取前50
    const top = Array.from(scores.entries())
      .map(([addr, score]) => ({ addr, score }))
      .sort((a,b) => b.score - a.score)
      .slice(0, 50);

    // 4) 落地缓存（按天）
    const updatedAt = new Date().toLocaleString();
    localStorage.setItem("LB_CACHE_V1", JSON.stringify({
      day: today, updatedAt, data: top
    }));

    setLeaderboard(top);
    setLbUpdatedAt(updatedAt);
  }catch(err){
    console.error("buildLeaderboard error:", err);
    alert("排行榜统计失败：" + (err?.message || String(err)));
  }
}

// 每天凌晨自动刷新一次
useEffect(() => {
  // 初次进入就构建一次
  buildLeaderboard(false);

  // 计算到下一个 00:00 的毫秒数
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0,0,0,0);
  const delay = next.getTime() - now.getTime();

  const t1 = setTimeout(() => {
    buildLeaderboard(true);
    // 之后每天 24h 刷新
    const t2 = setInterval(() => buildLeaderboard(true), 24*60*60*1000);
    // 把 interval 句柄挂到 window 也行，这里闭包里就行
    window.__lb_interval = t2;
     }, Math.max(1000, delay));

  return () => {
    clearTimeout(t1);
    if (window.__lb_interval) clearInterval(window.__lb_interval);
    };
   }, []);


  async function onMint() {
    try {
      if (!wallet) { alert("请先连接钱包"); return; }
      if (!onPaseo) { alert("当前不在 Paseo 测试网，请先切换网络"); setShowSwitchBar(true); return; }
      if (!drawnCards?.length) {
        alert("请先抽牌");
        return;
      }
      if (!aiResult) {
        alert("请先生成 AI 解读");
        return;
      }
        // 只有当 AI 请求完成且文本渲染稳定（ready）才允许 mint
   if (aiStatus !== "ready") {
     const msgMap = {
      requesting: "AI 正在思考/生成，请稍候…",
      rendering:  "AI 解读已生成，正在排版，请稍候…",
      error:      "AI 解读失败，请重试后再铸造",
      idle:       "请先生成 AI 解读"
     };
     alert(msgMap[aiStatus] || "AI 解读未就绪，请稍候…");
     return;
    }
      setMinting(true);
      // 1) 截图（抽牌 + AI 文本）
      const el = captureRef.current || document.body;
      const png = await elementToPngFile(el);

      // 2) 上传 IPFS -> 得到 tokenURI
      const tokenURI = await uploadReadingToIPFS(png, {
        name: "AI Tarot Reading",
        description: "一次链上塔罗占卜结果（卡牌 + AI 解读）",
        attributes: drawnCards.map((c, i) => ({
          trait_type: `Position ${i + 1}`,
          value: `${c.name}（${c.position}）`
        }))
      });

        // 3) 调合约 mint（必须正确获取价格）
       const contract = await getContract();
       let p;
       try {
      p = await contract.mintPriceWei();     // BigInt
     console.log("获取到的Mint价格:", p.toString());
     } catch (err) {
    console.error("获取Mint价格失败:", err);
    alert("获取铸造价格失败，请检查网络连接: " + (err.message || String(err)));
    setMinting(false);
    return; // 重要：获取价格失败时直接返回，不继续执行
    }

  // 确保p是有效的BigInt
   if (p === undefined || p === null) {
    alert("无法获取铸造价格，请重试");
    setMinting(false);
    return;
   }
        let tx;
        try {
        if (p > 0n) {
        console.log("支付金额:", p.toString(), "wei");
        tx = await contract.mintReading(tokenURI, { value: p });
                        } else {
        tx = await contract.mintReading(tokenURI);
        }
        } catch (err) {
    console.error("Mint交易失败:", err);
    // 更详细的错误信息
    if (err.message && err.message.includes("PriceNotMatch")) {
        alert("价格不匹配！实际价格: " + p.toString() + " wei，请刷新页面重试");
    } else {
        alert("铸造失败: " + (err.reason || err.message || String(err)));
    }
    setMinting(false);
    return;
   }
      await tx.wait();

      alert("Mint 成功！TokenURI: " + tokenURI);
    } catch (e) {
      console.error(e);
      alert(e.reason || e.message || String(e));
    } finally {
      setMinting(false);
    }
  }

      // —— 付费前的“是否全部翻开”判断 ——：
  // 自动模式下，抽到即视为展示正面，因此直接 true；
  // 手动模式下，需逐个检查 revealed 是否都为 true。
  const need = spread?.positions?.length || 0;
  const allRevealed =
    drawMode === "auto" ? true : [...Array(need).keys()].every((i) => revealed[i]);


 return (
  <div className="page">
    <div 
       className="glass"
       style={page === "leaderboard" ? { display: "none" } : undefined}
      >
       <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px", position: "relative" }}>
   {!wallet ? (
     <button className="bg-indigo-500 text-white px-4 py-2 rounded" onClick={onConnect}>
       连接钱包
     </button>
   ) : (
     <div>
       <button className="bg-indigo-500 text-white px-4 py-2 rounded" onClick={() => setWalletMenu(v => !v)}>
         已连接：{wallet.slice(0,6)}...{wallet.slice(-4)}
       </button>
       {walletMenu && (
         <div style={{
           position: "absolute", right: 12, top: 48,
           background: "white", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)"
         }}>
           <button
             style={{ padding: "10px 16px", minWidth: 140, textAlign: "left" }}
             onClick={onDisconnectLocal}
             className="text-sm hover:bg-gray-100"
           >
             退出账户
           </button>
         </div>
       )}
     </div>
   )}
 </div>

 {showSwitchBar && (
   <div style={{
     display: "flex",
     alignItems: "center",
     justifyContent: "space-between",
     gap: 12,
     margin: "0 12px 8px",
     padding: "10px 12px",
     borderRadius: 12,
     background: "rgba(255, 214, 102, .15)",
     color: "#8a6d1d",
     border: "1px solid rgba(255,214,102,.35)"
   }}>
     <div>当前不在 Paseo 测试网</div>
     <button className="bg-yellow-500 text-white px-3 py-1 rounded" onClick={onSwitchPaseo}>
       切换到 Paseo 测试网
     </button>
   </div>
 )}

      {/* === 排行按钮条 (CTRL+F: LB_TOPBAR) === */}
<div className="lb-topbar">
  <button className="lb-btn" onClick={() => { setPage("leaderboard"); buildLeaderboard(false); }}>
    积分排行榜
  </button>
  <button className="lb-btn ghost" disabled title="即将上线">
    塔罗勇士救公主（即将上线，敬请期待）
  </button>
</div>


     <h1 className="title">AI链上塔罗占卜</h1>

      {/* 主题导航 */}
      <div className="flex gap-4 mb-4">
        {ALL_CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={`px-3 py-2 rounded-lg ${category.value === c.value ? "btn-toggle active" : "btn-toggle"}`}
            onClick={() => handleCategoryChange(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 牌阵选择 */}
      <div className="flex gap-3 items-center mb-4">
        <span>请选择牌阵：</span>
        <select
          className="border rounded px-2 py-1"
          value={spread.value}
          onChange={(e) => handleSpreadChange(e.target.value)}
        >
          {category.spreads.map((sp) => (
            <option value={sp.value} key={sp.value}>
              {sp.label}
            </option>
          ))}
        </select>
      </div>

      {/* 占卜问题 */}
      <div className="mb-3">
        <input
          className="w-full border px-3 py-2 rounded-lg"
          placeholder="请输入你要占卜的问题（如：下半年我的工作运如何？）"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      {/* 抽牌方式切换 + 主按钮区域 */}
<div className="mb-3" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
  {/* 第一行：抽牌方式两个切换按钮 */}
  <div className="flex gap-3 items-center">
    <span>抽牌方式：</span>
    <button
      className={`btn-toggle ${drawMode === "auto" ? "active" : ""}`}
      onClick={() => changeDrawMode("auto")}
    >
      自动
    </button>

    <button
      className={`btn-toggle ${drawMode === "manual" ? "active" : ""}`}
      onClick={() => changeDrawMode("manual")}
    >
      手动
    </button>
  </div>

  {/* 第二行：主操作按钮（不同模式显示不同内容） */}
  <div style={{ textAlign: "left" }}>
    {/* 自动模式：极简，立刻抽牌出结果 */}
    {drawMode === "auto" && (
      <button
        className="bg-pink-600 text-white px-4 py-2 rounded-xl shadow-lg"
        onClick={() => {
          // 自动模式：直接抽牌
          drawCards(spread.positions.length);
        }}
      >
        点击抽牌
      </button>
    )}

    {/* 手动模式：阶段式按钮 */}
    {drawMode === "manual" && (
      <>
        {phase === "idle" && (
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded-xl shadow-lg"
            onClick={startManualRound}
          >
            开始占卜
          </button>
        )}

        {phase === "in-progress" && (
          <button
            className="bg-gray-400 text-white px-4 py-2 rounded-xl shadow-lg"
            disabled={true}
          >
            占卜进行中…
          </button>
        )}

        {phase === "done" && (
          <button
            className="bg-indigo-500 text-white px-4 py-2 rounded-xl shadow-lg"
            onClick={resetAndIdle}
            disabled={aiStatus === "requesting" || aiStatus === "rendering"}
            style={{
            opacity: (aiStatus === "requesting" || aiStatus === "rendering") ? 0.5 : 1,
            cursor: (aiStatus === "requesting" || aiStatus === "rendering") ? "not-allowed" : "pointer",
           }}
          >
          重新占卜
         </button>

        )}
      </>
    )}
  </div>
</div>

{/* 手动模式：占卜进行中（包括洗牌动画阶段 + 抽牌阶段） */}
{drawMode === "manual" && phase === "in-progress" && (
  <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "24px" }}>

    {/* 阶段A：正在洗牌 */}
{shuffleStage === "shuffling" && (
  <div
    style={{
      color: "#fff",
      textAlign: "center",

      // 给这一整个洗牌阶段一块“舞台高度”
      minHeight: "420px",

      // 让它跟上面的输入区域拉开一点距离
      marginTop: "40px",

      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
    }}
  >
    {/* 顶部提示语（单独一行） */}
    <div
      style={{
        fontWeight: 600,
        fontSize: "16px",
        lineHeight: 1.4,

        // 让它和洗牌动画之间有空隙
        marginBottom: "24px",

        // 加点发光，读起来更清楚
        textShadow: "0 2px 4px rgba(0,0,0,.6)",
      }}
    >
      请对着塔罗牌，心中默念你最想问的问题…
    </div>

    {/* 大范围洗牌动画本体 */}
    <div
      className="shuffle-area"
      style={{
        // 控制牌堆整体相对于提示语的距离
        marginBottom: "16px",
      }}
    >
      {Array.from({ length: 78 }).map((_, i) => (
        <img
          key={i}
          src={tarotBack}
          alt="shuffling"
          className="shuffle-card"
          style={{ animationDelay: `${i * 0.03}s` }}
        />
      ))}
    </div>

    {/* 动画下面的小状态字 */}
    <div
      style={{
        fontSize: "14px",
        opacity: 0.8,
        lineHeight: 1.4,
        textShadow: "0 2px 4px rgba(0,0,0,.6)",
      }}
    >
      正在洗牌中…
    </div>
  </div>
)}




    {/* 阶段B：允许抽牌 */}
    {shuffleStage === "choose" && (
  <div className={`manual-choose-wrap ${needScaleDown ? "scale-down" : ""}`}>
    {/* 上面的小提示文案（还没抽满才出现） */}
    {manualPicks.length < (spread?.positions?.length || 0) && (
      <div style={{ textAlign: "center", color: "#fff", fontWeight: 600, marginBottom: "12px" }}>
        请凭第一直觉，选出你想要的牌
      </div>
    )}

    {/* 两行牌池（可点某张，把它发到牌阵） */}
    <div className={`deck-wrap ${packPool ? "pack" : ""}`}>
      <div className="deck-rows">
        {/* 第1行 0~38 */}
        <div className="deck-row">
          {pool.slice(0, 39).map((cardObj, idx) => (
            <img
              key={"row1-" + idx}
              src={tarotBack}
              alt="back"
              className="tarot-card deck-card"
              style={{ "--i": idx }}
              onClick={() => dealAt(idx)}
            />
          ))}
        </div>

        {/* 第2行 39~78 */}
        <div className="deck-row">
          {pool.slice(39, 78).map((cardObj, idx) => (
            <img
              key={"row2-" + idx}
              src={tarotBack}
              alt="back"
              className="tarot-card deck-card"
              style={{ "--i": idx }}
              onClick={() => dealAt(idx + 39)}
            />
          ))}
        </div>
      </div>
    </div>

    {/* 当前牌阵框，展示已抽走的牌位 + 高亮下一张要抽的位置 */}
    <SpreadBoardUI
      spread={spread}
      manualPicks={manualPicks}
      revealed={revealed}
      revealAt={revealAt}
      getTarotImageById={getTarotImageById}
      highlightIndex={manualPicks.length}
    />
  </div>
)}

  </div>
)}


            {phase === "done" && (
  <>
  {/* ===== 截图区域：牌阵 + AI解读（不含按钮）===== */}
<div
  ref={captureRef}
  style={{
     width: "1000px",
  maxWidth: "1000px",
  paddingTop: "100px",   
  margin: "-40px auto 24px auto",
  backgroundColor: "transparent",
  color: "#fff",
  }}
>
  {/* 牌阵成品，只有 phase === "done" 时才显示 */}
  {phase === "done" && (
    <>
      {/* 摆阵展示区域：按牌阵几何形状把牌摆进来 */}
      {drawnCards.length > 0 && (
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "600px",
            height: "600px",
            margin: "16px auto 32px auto",
            borderRadius: "16px",
            background: "transparent",
          }}
        >
          {SPREAD_LAYOUTS[spread.label] &&
            SPREAD_LAYOUTS[spread.label].map((slot, idx) => {
              const card = drawnCards[idx];
              if (!card) return null;

              // 手动模式下，没翻开的牌用背面
              const opened =
                drawMode === "auto"
                  ? true
                  : !!revealed[idx]; // revealed[idx] 为 true 才算翻开

              const isReversed = card.position === "逆位";
              const imgSrc = opened
                ? getTarotImageById(card.id)
                : tarotBack;

              return (
                <div
                  key={idx}
                  style={{
                    position: "absolute",
                    left: slot.x,
                    top: slot.y,
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    width: "110px",
                  }}
                >
                  {/* 点击翻面（仅手动模式 & 未翻开） */}
                  <img
                    src={imgSrc}
                    alt={card.name}
                    onClick={() => {
                      if (drawMode === "manual" && !opened) {
                        revealAt(idx);
                      }
                    }}
                    style={{
                      width: "100px",
                      height: "180px",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                      backgroundColor: "#00000066",
                      objectFit: "cover",
                      cursor:
                        drawMode === "manual" && !opened
                          ? "pointer"
                          : "default",
                      transform:
                        opened && isReversed
                          ? "rotate(180deg)"
                          : "none",
                    }}
                  />

                  {/* 下面的小字标签：位置含义 + 抽到的牌名+正逆位（如果已翻开） */}
                  <div
                    style={{
                      marginTop: "8px",
                      color: "#fff",
                      fontSize: "12px",
                      lineHeight: 1.4,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {/* spread.positions 里该位的中文说明 */}
                    <div>{spread?.positions?.[idx] || slot.label}</div>

                    {/* 只有翻开后才公开牌名和正/逆位 */}
                    {opened && (
                      <div>
                        {card.name}（{card.position}）
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* —— 未全部翻开时的提示：请翻开牌面揭示结果 —— */}
      {drawnCards.length > 0 && !allRevealed && (
        <div
          className="tip-blink"
          style={{
            marginTop: 8,
            textAlign: "center",
            color: "#fff",
            fontWeight: 600,
            textShadow: "0 2px 4px rgba(0,0,0,.8)",
          }}
        >
          请翻开牌面揭示结果
        </div>
      )}
    </>
  )}

  {/* ===== AI解读块（要上链的文字精华；不含按钮）===== */}
  {aiResult && (
    <div
      className="ai-reading mt-6 bg-gray-50 border rounded-xl p-4 text-gray-800 whitespace-pre-line shadow"
      style={{
        marginTop: "24px",
        maxWidth: "700px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <strong>AI解读：</strong>
          <div>{aiResult}</div>
        </div>
      )}
    </div>
  </>
)}


       
      {/* AI解读 & 付费判断 */}
{drawnCards.length > 0 && (
  <div
    className="mt-4"
    style={{ display: "flex", flexDirection: "column", gap: "12px" }}
  >
    {/* 第一行：按钮们 */}
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {!freeUsed ? (
        <button
          style={{
            background: "#2ecc71",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: "14px",
            fontWeight: 700,
            boxShadow: "0 4px 16px rgba(0,0,0,.25)",
          }}
          onClick={() => handleAI(false)}
          disabled={loading}
        >
          {loading ? "AI智能分析中..." : "免费AI解读（每日一次）"}
        </button>
      ) : (
        <button
          style={{
            background: "#ffd166",
            color: "#222",
            padding: "10px 16px",
            borderRadius: "14px",
            fontWeight: 700,
            boxShadow: "0 4px 16px rgba(0,0,0,.25)",
          }}
          onClick={handlePay}
          disabled={!allRevealed}
          title={!allRevealed ? "请先翻开所有牌面，查看抽牌结果！" : undefined}
        >
          支付解锁更多占卜（支持加密货币）
        </button>
      )}

      <button
        style={{
          background: "#4f46e5",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: "14px",
          fontWeight: 700,
          boxShadow: "0 4px 16px rgba(0,0,0,.25)",
        }}
        onClick={onMint}
        disabled={minting || aiStatus !== "ready"}
        title={
          minting
            ? "铸造中…"
            : aiStatus === "requesting"
            ? "AI 正在思考/生成…"
            : aiStatus === "rendering"
            ? "AI 文本正在稳定渲染…"
            : aiStatus === "error"
            ? "AI 调用失败，请重试"
            : aiStatus === "idle"
            ? "请先生成 AI 解读"
            : "上链铸造 NFT"
        }
      >
        {minting ? "铸造中..." : "上链铸造 NFT"}
      </button>
    </div>

    {/* 第二行：支付确认面板，点了黄色按钮才出来 */}
    {showPayModal && (
      <div
        style={{
          marginTop: "4px",
          background: "rgba(31,20,51,0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          padding: "12px 14px 10px",
          width: "min(100%, 360px)",
          color: "#fff",
          boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        }}
      >
        {/* 头部：标题 + 关闭 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "15px" }}>支付确认</div>
          <button
            onClick={() => !paying && setShowPayModal(false)}
            style={{
              background: "transparent",
              border: 0,
              color: "#fff",
              fontSize: "16px",
              cursor: paying ? "not-allowed" : "pointer",
              lineHeight: 1,
            }}
            aria-label="close"
          >
            ✕
          </button>
        </div>

        {/* 金额信息 */}
        <div style={{ fontSize: "13px", lineHeight: 1.5 }}>
          <div>单价：{formatEther(quote.unit)} PAS / 张</div>
          <div>张数：{quote.cards} 张</div>
          <div style={{ fontWeight: 600, marginTop: "4px" }}>
            合计：{formatEther(quote.total)} PAS
          </div>
        </div>

        {/* 按钮区 */}
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <button
            onClick={() => setShowPayModal(false)}
            disabled={paying}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "10px",
              padding: "6px 14px",
              color: "#fff",
              cursor: paying ? "not-allowed" : "pointer",
              opacity: paying ? 0.6 : 1,
            }}
          >
            取消
          </button>
          <button
            onClick={confirmPay}
            disabled={paying}
            style={{
              background: "#4f46e5",
              border: "none",
              borderRadius: "10px",
              padding: "6px 14px",
              color: "#fff",
              fontWeight: 700,
              cursor: paying ? "not-allowed" : "pointer",
              opacity: paying ? 0.6 : 1,
            }}
          >
            {paying ? "支付中…" : "确认并支付"}
          </button>
        </div>
      </div>
    )}
  </div>
)}

     </div>
     {/* === 排行榜覆盖层 (CTRL+F: LB_OVERLAY) === */}
{page === "leaderboard" && (
  <div className="lb-overlay">
    <div className="lb-card">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
        <div className="lb-title">积分排行榜</div>
        <div style={{display:"flex", gap:8}}>
          <button className="lb-btn ghost" onClick={() => buildLeaderboard(true)}>手动刷新</button>
          <button className="lb-btn" onClick={() => setPage("main")}>返回</button>
        </div>
      </div>

      <div style={{fontSize:12, opacity:.8, margin:"-4px 0 10px"}}>
        规则：每次成功 mint 记 1 分；每日 00:00（本地）自动重新统计。最近更新时间：{lbUpdatedAt || "—"}
      </div>

      <table className="lb-table">
        <thead>
          <tr>
            <th className="lb-rank">名次</th>
            <th>钱包地址（已脱敏）</th>
            <th className="lb-score">积分</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.length === 0 && (
            <tr><td colSpan={3} style={{padding:"18px 8px", opacity:.8}}>暂无数据或正在统计中…</td></tr>
          )}
          {leaderboard.map((row, i) => (
            <tr key={row.addr}>
              <td className="lb-rank">#{String(i+1).padStart(2,"0")}</td>
              <td className="lb-addr">{shortAddr(row.addr)}</td>
              <td className="lb-score">{row.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
 
     </div>
  );
}


