"use client";

import { WrappedNFTManager } from "~~/components/WrappedNFTManager";
import type { NextPage } from "next";

const WrappedNFTsPage: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-full max-w-7xl">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              🎁 包装NFT管理器
            </h1>
            <p className="text-lg text-center text-gray-600 max-w-3xl">
              管理您的跨链包装NFT。包装NFT是通过XCM跨链协议从其他链转移过来的NFT在当前链上的表示。
              您可以查看、管理这些包装NFT，并在需要时销毁它们以解锁源链上的原始NFT。
            </p>
          </div>
          
          <WrappedNFTManager />
        </div>
      </div>
    </>
  );
};

export default WrappedNFTsPage;