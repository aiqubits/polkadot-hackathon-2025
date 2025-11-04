// 文件：src/chain.js
import { BrowserProvider, Contract } from "ethers";

/** 选择注入的钱包（优先 MetaMask，避免 OKX 抢占 window.ethereum） */
function pickInjectedProvider() {
  const eth = window.ethereum;
  if (!eth) return null;
  const list = eth.providers && Array.isArray(eth.providers) ? eth.providers : [eth];
  const metamask = list.find((p) => p && p.isMetaMask);
  return metamask || list[0] || null;
}

/** Paseo PassetHub (Polkadot Astar EVM) */
export const PASEO = {
  chainIdHex: "0x190F1B46", // 420420422 十六进制
  chainIdDec: 420420422,
  chainName: "Paseo (Astar zKatana / PassetHub)",
  rpcUrls: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  blockExplorerUrls: ["https://blockscout-passet-hub.parity-testnet.parity.io/"],
};

export const CONTRACT_ADDRESS = "0x8257117c08231fD84C94046399a798DEdFF82439";
export const ABI = [
  // 价格相关
  "function mintPriceWei() view returns (uint256)",
  "function unitPricePerCard() view returns (uint256)",
  "function setMintPrice(uint256 p)",
  "function setUnitPrice(uint256 p)",

  // 核心业务
  "function mintReading(string uri) payable returns (uint256)",
  "function payToUnlock(uint256 cards) payable",

  // 订单 & 退款
  "function nextOrderId(address user) view returns (uint256)",
  "function getOrder(address user, uint256 oid) view returns (uint256 amountWei,bool delivered,bool refunded)",
  "function refundFailedOrders()",
  "function markDelivered(uint256 oid)",

  // 商家余额 & 提现
  "function merchantBalance() view returns (uint256)",
  "function withdraw(uint256 amountWei)",
  "function ownerRefund(address to, uint256 amountWei)",

  // NFT 事件
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

/** 统一获取 BrowserProvider（只取到我们挑的 injected provider） */
export async function getProvider() {
  const injected = pickInjectedProvider();
  if (!injected) throw new Error("未检测到注入钱包（请安装/启用 MetaMask）");
  return new BrowserProvider(injected);
}

/** 仅在明确授权成功时，返回地址；拒绝（4001）抛错 */
export async function connectWallet() {
  const provider = await getProvider();
  try {
    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts || accounts.length === 0) throw new Error("用户未授权账户访问");
    const signer = await provider.getSigner();
    return { provider, signer, address: accounts[0] };
  } catch (e) {
    if (e?.code === 4001) throw new Error("你已取消连接钱包");
    throw e;
  }
}

/** 仅检测当前网络是否 Paseo；返回 { ok, chainId } */
export async function checkNetwork() {
  const provider = await getProvider();
  const net = await provider.getNetwork();
  const cid = Number(net.chainId); // v6: bigint -> number
  return { ok: cid === PASEO.chainIdDec, chainId: cid };
}

/** 切换/添加 Paseo（给按钮调用） */
export async function switchToPaseo() {
  const injected = pickInjectedProvider();
  if (!injected) throw new Error("未检测到注入钱包");
  try {
    await injected.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: PASEO.chainIdHex }],
    });
  } catch (e) {
    if (e?.code === 4902) {
      await injected.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: PASEO.chainIdHex,
          chainName: PASEO.chainName,
          rpcUrls: PASEO.rpcUrls,
          nativeCurrency: PASEO.nativeCurrency,
          blockExplorerUrls: PASEO.blockExplorerUrls.filter(Boolean),
        }],
      });
    } else {
      throw e;
    }
  }
}

/** 既连接又确保在 Paseo；失败时抛错让 UI 给出切换按钮 */
export async function ensureNetworkAndConnect() {
  // 先连，再检测；不强制自动切换，交给 UI 按钮触发 switchToPaseo
  const { provider, signer, address } = await connectWallet();
  const net = await provider.getNetwork();
  const ok = Number(net.chainId) === PASEO.chainIdDec;
  return { provider, signer, address, onPaseo: ok };
}

/** 获取合约实例（会先校验钱包存在/网络正确） */
export async function getContract() {
  const { signer } = await connectWallet();
  const provider = await getProvider();
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== PASEO.chainIdDec) {
    throw new Error("当前不在 Paseo 测试网，请先切换网络再进行铸造。");
  }
  return new Contract(CONTRACT_ADDRESS, ABI, signer);
}
