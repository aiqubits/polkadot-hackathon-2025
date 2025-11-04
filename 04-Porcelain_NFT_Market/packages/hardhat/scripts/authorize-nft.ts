import { ethers } from "hardhat";

async function main() {
    console.log("🔐 授权 YourCollectible NFT 合约...");
    
    // 获取部署的合约地址
    const MOONBASE_ALPHA_CONTRACTS = {
        XCMBridge: "0x737E65458Ee133815D03A886f174cAb2dA2bd4f5",
        YourCollectible: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea"
    };
    
    const POLKADOT_HUB_CONTRACTS = {
        XCMBridge: "0xad004515E7aC3081cd56604A37FE7950A2d04B2D",
        YourCollectible: "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce"
    };
    
    // 获取当前网络
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    let contracts;
    if (chainId === 1287) { // Moonbase Alpha
        contracts = MOONBASE_ALPHA_CONTRACTS;
        console.log("📍 当前网络: Moonbase Alpha TestNet");
    } else if (chainId === 420420422) { // Polkadot Hub TestNet
        contracts = POLKADOT_HUB_CONTRACTS;
        console.log("📍 当前网络: Polkadot Hub TestNet");
    } else {
        throw new Error(`不支持的网络 Chain ID: ${chainId}`);
    }
    
    // 获取 XCMBridge 合约实例
    const xcmBridge = await ethers.getContractAt("XCMBridge", contracts.XCMBridge);
    
    // 检查当前授权状态
    const isAuthorized = await xcmBridge.authorizedContracts(contracts.YourCollectible);
    console.log(`📋 YourCollectible 当前授权状态: ${isAuthorized}`);
    
    if (!isAuthorized) {
        console.log("🔓 正在授权 YourCollectible 合约...");
        
        // 授权 YourCollectible 合约
        const tx = await xcmBridge.setContractAuthorization(contracts.YourCollectible, true);
        console.log(`📝 交易哈希: ${tx.hash}`);
        
        // 等待交易确认
        await tx.wait();
        console.log("✅ YourCollectible 合约授权成功！");
        
        // 再次检查授权状态
        const newStatus = await xcmBridge.authorizedContracts(contracts.YourCollectible);
        console.log(`📋 YourCollectible 新授权状态: ${newStatus}`);
    } else {
        console.log("✅ YourCollectible 合约已经被授权");
    }
    
    console.log("\n📋 授权完成摘要:");
    console.log(`XCMBridge 地址: ${contracts.XCMBridge}`);
    console.log(`YourCollectible 地址: ${contracts.YourCollectible}`);
    console.log(`网络 Chain ID: ${chainId}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 授权失败:", error);
        process.exit(1);
    });