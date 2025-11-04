const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查所有相关事件...\n");

  const network = await ethers.provider.getNetwork();
  console.log(`📡 当前网络: ${network.name}`);

  // 获取合约地址
  const addresses = {
    XCMBridge: "0x73C506D96F474653f7bEbDDDf2b92AC95983e1E0",
    WrappedNFT: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  };

  console.log(`🏗️  XCMBridge地址: ${addresses.XCMBridge}`);
  console.log(`🎁 WrappedNFT地址: ${addresses.WrappedNFT}\n`);

  try {
    // 获取当前区块号
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`📊 当前区块号: ${currentBlock}`);

    // 检查最近的所有事件
    const fromBlock = Math.max(0, currentBlock - 500);
    console.log(`🔍 检查区块范围: ${fromBlock} - ${currentBlock}\n`);

    // 获取XCMBridge合约
    const XCMBridge = await ethers.getContractFactory("XCMBridgeV2");
    const xcmBridge = XCMBridge.attach(addresses.XCMBridge);

    // 获取WrappedNFT合约
    const WrappedNFT = await ethers.getContractFactory("WrappedNFT");
    const wrappedNFT = WrappedNFT.attach(addresses.WrappedNFT);

    // 检查XCMBridge的所有事件
    console.log("📋 检查XCMBridge事件...");
    const xcmFilter = {
      address: addresses.XCMBridge,
      fromBlock: fromBlock,
      toBlock: currentBlock
    };
    
    const xcmEvents = await ethers.provider.getLogs(xcmFilter);
    console.log(`🎯 找到 ${xcmEvents.length} 个XCMBridge事件`);
    
    xcmEvents.forEach((event, index) => {
      console.log(`  事件 ${index + 1}:`);
      console.log(`    区块: ${event.blockNumber}`);
      console.log(`    交易哈希: ${event.transactionHash}`);
      console.log(`    主题: ${event.topics[0]}`);
    });

    // 检查WrappedNFT的所有事件
    console.log("\n📋 检查WrappedNFT事件...");
    const nftFilter = {
      address: addresses.WrappedNFT,
      fromBlock: fromBlock,
      toBlock: currentBlock
    };
    
    const nftEvents = await ethers.provider.getLogs(nftFilter);
    console.log(`🎯 找到 ${nftEvents.length} 个WrappedNFT事件`);
    
    nftEvents.forEach((event, index) => {
      console.log(`  事件 ${index + 1}:`);
      console.log(`    区块: ${event.blockNumber}`);
      console.log(`    交易哈希: ${event.transactionHash}`);
      console.log(`    主题: ${event.topics[0]}`);
    });

    // 尝试解析事件
    if (nftEvents.length > 0) {
      console.log("\n🔍 尝试解析WrappedNFT事件...");
      for (let i = 0; i < nftEvents.length; i++) {
        try {
          const parsedEvent = wrappedNFT.interface.parseLog(nftEvents[i]);
          console.log(`  解析事件 ${i + 1}: ${parsedEvent.name}`);
          console.log(`    参数:`, parsedEvent.args);
        } catch (error) {
          console.log(`  无法解析事件 ${i + 1}: ${error.message}`);
        }
      }
    }

    // 检查特定的交易
    console.log("\n🔍 检查最近的交易: 0xb173618634ff2072e2e96057d3ac7579ad8e58fa3e3db10e9c22ef61e8b40b0e");
    try {
      const txReceipt = await ethers.provider.getTransactionReceipt("0xb173618634ff2072e2e96057d3ac7579ad8e58fa3e3db10e9c22ef61e8b40b0e");
      if (txReceipt) {
        console.log(`📊 交易状态: ${txReceipt.status === 1 ? '成功' : '失败'}`);
        console.log(`📊 Gas使用: ${txReceipt.gasUsed}`);
        console.log(`📊 事件数量: ${txReceipt.logs.length}`);
        
        txReceipt.logs.forEach((log, index) => {
          console.log(`  日志 ${index + 1}:`);
          console.log(`    地址: ${log.address}`);
          console.log(`    主题数量: ${log.topics.length}`);
          
          // 尝试解析日志
          try {
            if (log.address.toLowerCase() === addresses.WrappedNFT.toLowerCase()) {
              const parsedLog = wrappedNFT.interface.parseLog(log);
              console.log(`    解析结果: ${parsedLog.name}`);
              console.log(`    参数:`, parsedLog.args);
            } else if (log.address.toLowerCase() === addresses.XCMBridge.toLowerCase()) {
              const parsedLog = xcmBridge.interface.parseLog(log);
              console.log(`    解析结果: ${parsedLog.name}`);
              console.log(`    参数:`, parsedLog.args);
            }
          } catch (error) {
            console.log(`    无法解析: ${error.message}`);
          }
        });
      } else {
        console.log("❌ 交易未找到");
      }
    } catch (error) {
      console.log(`❌ 检查交易时出错: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ 检查过程中出错:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });