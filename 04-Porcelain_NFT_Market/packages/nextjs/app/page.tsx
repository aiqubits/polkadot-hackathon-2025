"use client";

import Image from "next/image";
import type { NextPage } from "next";
import Link from "next/link";
import { motion } from "framer-motion";
import { CrossChainNFT } from "~~/components/CrossChainNFT";

const Home: NextPage = () => {
  // 简化动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // 减少延迟
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 }, // 减小移动距离
    visible: { y: 0, opacity: 1 }
  };

  // 浮动图片配置
  const floatingImages = [
    {
      src: "/porcelain-1.jpg",
      alt: "传统瓷板画",
      delay: 0
    },
    {
      src: "/porcelain-2.jpg",
      alt: "现代瓷板画",
      delay: 0.2
    },
    {
      src: "/porcelain-3.jpg",
      alt: "瓷板画工艺",
      delay: 0.4
    },
    {
      src: "/porcelain-4.jpg",
      alt: "瓷板画展示",
      delay: 0.6
    }
  ];

  // 平台特色数据
  const platformFeatures = [
    {
      icon: "🔒",
      title: "数字确权",
      description: "基于区块链技术，为每件瓷板画作品提供唯一数字身份认证"
    },
    {
      icon: "💎",
      title: "价值保障",
      description: "通过智能合约确保艺术品交易的安全性和透明度"
    },
    {
      icon: "🎨",
      title: "艺术传承",
      description: "连接传统工艺大师与数字艺术收藏家，促进文化传承"
    },
    {
      icon: "🌐",
      title: "全球市场",
      description: "打造全球化的瓷板画数字艺术交易平台"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 上层：介绍内容 */}
      <div className="relative z-10">
        <motion.div
          className="container mx-auto px-6 py-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 主标题 */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">
              <span className="block mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                非遗瓷艺数字确权与交易平台
              </span>
              <span className="text-xl text-base-content/70">
                传承千年工艺，链接数字未来
              </span>
            </h1>
          </motion.div>

          {/* 平台介绍 */}
          <motion.div variants={itemVariants} className="mb-12">
            <div className="bg-base-100/20 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/10">
              <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">平台简介</h2>
              <div className="grid grid-cols-1 gap-8">
                <div>
                  <h3 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">非遗瓷艺数字化</h3>
                  <p className="text-base-content/80 leading-relaxed text-lg">
                  我们将传统瓷板画艺术与区块链技术相结合，为每件作品赋予独一无二的数字身份，确保真实性与所有权。通过数字化确权，让经典艺术在新时代焕发全新生命力。
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 平台特色 */}
          <motion.div variants={itemVariants} className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">平台特色</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {platformFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="bg-base-100/30 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-base-content/5
                    hover:shadow-2xl hover:bg-base-100/40 hover:-translate-y-1 transition-all duration-200"
                >
                  <span className="text-4xl mb-4 block">{feature.icon}</span>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-base-content/70">{feature.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 行动按钮 */}
          <motion.div variants={itemVariants} className="text-center">
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/market">
                <button
                  className="px-8 py-4 rounded-xl font-semibold text-white text-lg
                  bg-gradient-to-r from-[#DBA363] to-[#E8BB7C] 
                  hover:from-[#E8BB7C] hover:to-[#DBA363] 
                  shadow-lg hover:shadow-[#DBA36366] 
                  transform hover:scale-105 transition-all duration-300
                  border border-[#F0D7AF]/20"
                >
                  <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    浏览艺术品
                  </span>
                </button>
              </Link>
              <Link href="/create">
                <button
                  className="px-8 py-4 rounded-xl font-semibold text-white text-lg
                  bg-gradient-to-r from-[#6B7A8C] to-[#8899AF] 
                  hover:from-[#8899AF] hover:to-[#6B7A8C] 
                  shadow-lg hover:shadow-[#6B7A8C66] 
                  transform hover:scale-105 transition-all duration-300
                  border border-[#A7B6C9]/20"
                >
                  <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    创作与铸造
                  </span>
                </button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* 下层：浮动图片 - 简化动画 */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {floatingImages.map((image, index) => (
          <div
            key={index}
            className="absolute w-64 h-[650px]"
            style={{
              left: `${42 + (index - 1.5) * 21}%`,
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.4,
              animation: `float${index + 1} ${6 + index * 0.5}s ease-in-out infinite`
            }}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover rounded-2xl shadow-2xl"
              loading="eager"
              priority={index < 2}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-2xl"
            />
          </div>
        ))}
      </div>

      {/* 跨链NFT功能区域 */}
      <div className="relative z-10 mt-16 px-4">
        <div className="max-w-4xl mx-auto">
          <CrossChainNFT />
        </div>
      </div>

      {/* 添加全局CSS动画 */}
      <style jsx global>{`
        @keyframes float1 {
          0%, 100% { transform: translateY(-50%); }
          50% { transform: translateY(-45%); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(-50%); }
          50% { transform: translateY(-40%); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(-50%); }
          50% { transform: translateY(-42%); }
        }
        @keyframes float4 {
          0%, 100% { transform: translateY(-50%); }
          50% { transform: translateY(-38%); }
        }
      `}</style>
    </div>
  );
};

export default Home;
