"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ShoppingCartIcon,
  Bars3Icon,
  BugAntIcon,
  PhotoIcon,
  WrenchScrewdriverIcon,
  ClipboardIcon,
} from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  subMenu?: HeaderMenuLink[];
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "铸造数藏",
    href: "/create",
    icon: <WrenchScrewdriverIcon className="h-4 w-4" />,
    //subMenu: [
      //{ label: "IPFS 查询", href: "/ipfsDownload" },
      //{ label: "IPFS 上传", href: "/ipfsUpload" },
    //],
  },
  {
    label: "数藏市场",
    href: "/market",
    icon: <ShoppingCartIcon className="h-4 w-4" />,
    subMenu: [
      { label: "碎片化市场", href: "/fractionalize" },
      { label: "盲盒市场", href: "/market/mysterybox" },
      // { label: "3d 模型", href: "/models" },
    ],
  },
  {
    label: "盲盒管理",
    href: "/mysterybox",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  {
    label: "交易记录",
    href: "/transfers",
    icon: <ClipboardIcon className="h-4 w-4" />,
  },
  {
    label: "空投管理",
    href: "/airdrop",
    icon: <ArrowDownTrayIcon className="h-4 w-4" />,
    subMenu: [
      { label: "领取空投", href: "/claim" },
    ],
  },
  {
    label: "我的数藏",
    href: "/profile",
    icon: <ArrowUpTrayIcon className="h-4 w-4" />,
  },
  {
    label: "包装NFT",
    href: "/wrapped-nfts",
    icon: <PhotoIcon className="h-4 w-4" />,
  }
  //{
    //label: "调试合约",
    //href: "/debug",
    //icon: <BugAntIcon className="h-4 w-4" />,
  //},
  
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveSubMenu(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveSubMenu(null);
    }, 300); // 延迟300ms隐藏
  };

  return (
    <>
      {menuLinks.map(({ label, href, icon, subMenu }) => {
        const isActive = pathname === href;
        const isSubMenuActive = activeSubMenu === label;

        return (
          <li
            key={label}
            className="relative group"
            onMouseEnter={() => handleMouseEnter(label)}
            onMouseLeave={handleMouseLeave}
          >
            <Link
              href={href || "#"}
              passHref
              className={`${
                isActive ? "bg-secondary/70 shadow-md" : ""
              } hover:bg-secondary/50 hover:shadow-md focus:!bg-secondary/70 active:!text-neutral py-1.5 px-3 text-sm rounded-full flex items-center gap-2`}
            >
              {icon}
              <span>{label}</span>
            </Link>

            {subMenu && (
              <ul
                className={`absolute left-0 top-full mt-1 bg-base-100/80 backdrop-blur-sm shadow-lg rounded-box p-2 w-40 ${
                  isSubMenuActive ? "block" : "hidden"
                }`}
              >
                {subMenu.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href || "#"}
                      passHref
                      className="hover:bg-secondary/70 hover:text-white py-1 px-3 text-sm rounded-md block"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header with support for nested menus
 */
export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), []),
  );

  return (
    <div className="sticky xl:static top-0 navbar bg-transparent backdrop-blur-sm min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-secondary/30 px-0 sm:px-2">
      <div className="navbar-start w-auto xl:w-1/2">
        {/* Mobile dropdown */}
        <div className="xl:hidden dropdown" ref={burgerMenuRef}>
          <label
            tabIndex={0}
            className={`ml-1 btn btn-ghost ${isDrawerOpen ? "hover:bg-secondary/50" : "hover:bg-transparent"}`}
            onClick={() => {
              setIsDrawerOpen((prevIsOpenState) => !prevIsOpenState);
            }}
          >
            <Bars3Icon className="h-1/2" />
          </label>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100/80 backdrop-blur-sm rounded-box w-52"
              onClick={() => {
                setIsDrawerOpen(false);
              }}
            >
              <HeaderMenuLinks />
            </ul>
          )}
        </div>

        {/* Desktop menu */}
        <Link href="/" passHref className="hidden xl:flex items-center gap-1 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="瓷板画logo" className="cursor-pointer" fill src="/Adobe Express - file.png" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight">瓷板画</span>
            <span className="text-xs">数字艺术馆</span>
          </div>
        </Link>
        <ul className="hidden xl:flex xl:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end flex-grow mr-4">
        <RainbowKitCustomConnectButton />
        {/* <FaucetButton /> */}
      </div>
    </div>
  );
};
