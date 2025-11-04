import type { Address } from "viem";

/**
 * Contract Address Configuration
 * Supports multi-chain deployment, returns corresponding contract addresses based on chain ID
 */

// Deployed contract addresses (Local Node with PolkaVM - Chain ID: 420420420)
const HARDHAT_CONTRACTS = {
  vDOT: "0x3ed62137c5DB927cb137c26455969116BF0c23Cb" as Address,
  StakingContract: "0x598efcBD0B5b4Fd0142bEAae1a38f6Bd4d8a218d" as Address,
  VotingTicket: "0x21cb3940e6Ba5284E1750F1109131a8E8062b9f1" as Address,
  VotingContract: "0x9c1da847B31C0973F26b1a2A3d5c04365a867703" as Address,
  VotingNFTReward: "0x7d4567B7257cf869B01a47E8cf0EDB3814bDb963" as Address,
  BTCOracle: "0x527FC4060Ac7Bf9Cd19608EDEeE8f09063A16cd4" as Address,
  OmniLSAdapter: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318" as Address,
} as const;

// Moonbase Alpha Testnet Contract Addresses
const MOONBASE_ALPHA_CONTRACTS = {
  vDOT: "0xD8e779Ca9D22E587f64f613dE9615c797095d225" as Address,
  StakingContract: "0xc0b279c4918F236e9d82f54DFd2e4A819c1Ce156" as Address,
  VotingTicket: "0x911896E86EC581cAD2D919247F5ae2f61F17849C" as Address,
  VotingContract: "0x0CeCa1B57D8f024c81223ABAE786C643BBBd3F8B" as Address,
  VotingNFTReward: "0xF7496a303D8D811f8A10203B5825fed9e6119b01" as Address,
  BTCOracle: "0x0bc48e6406C91448D8BE6c00AD77Cad8FaE4Fb2b" as Address,
  OmniLSAdapter: "0x0000000000000000000000000000000000000000" as Address,
} as const;

// Moonbeam Mainnet Contract Addresses (To be deployed)
const MOONBEAM_CONTRACTS = {
  vDOT: "0x0000000000000000000000000000000000000000" as Address,
  StakingContract: "0x0000000000000000000000000000000000000000" as Address,
  VotingTicket: "0x0000000000000000000000000000000000000000" as Address,
  VotingContract: "0x0000000000000000000000000000000000000000" as Address,
  VotingNFTReward: "0x0000000000000000000000000000000000000000" as Address,
  BTCOracle: "0x0000000000000000000000000000000000000000" as Address,
  OmniLSAdapter: "0x0000000000000000000000000000000000000000" as Address,
} as const;

// Moonriver Testnet Contract Addresses (To be deployed)
const MOONRIVER_CONTRACTS = {
  vDOT: "0x0000000000000000000000000000000000000000" as Address,
  StakingContract: "0x0000000000000000000000000000000000000000" as Address,
  VotingTicket: "0x0000000000000000000000000000000000000000" as Address,
  VotingContract: "0x0000000000000000000000000000000000000000" as Address,
  VotingNFTReward: "0x0000000000000000000000000000000000000000" as Address,
  BTCOracle: "0x0000000000000000000000000000000000000000" as Address,
  OmniLSAdapter: "0x0000000000000000000000000000000000000000" as Address,
} as const;

/**
 * Get contract addresses by chain ID
 */
export function getContractAddresses(
  chainId: number,
): typeof HARDHAT_CONTRACTS {
  switch (chainId) {
    case 31337: // Hardhat Local
      return HARDHAT_CONTRACTS;
    case 420420420: // PolkaVM Local
      return HARDHAT_CONTRACTS; // Use the same contract addresses
    case 1287: // Moonbase Alpha
      return MOONBASE_ALPHA_CONTRACTS;
    case 1284: // Moonbeam
      return MOONBEAM_CONTRACTS;
    case 1285: // Moonriver
      return MOONRIVER_CONTRACTS;
    default:
      console.warn(
        `Unsupported chain ID: ${chainId}, falling back to Moonbase Alpha`,
      );
      return MOONBASE_ALPHA_CONTRACTS;
  }
}

/**
 * Get specific contract address
 */
export function getContractAddress(
  chainId: number,
  contractName: keyof typeof HARDHAT_CONTRACTS,
): Address {
  const contracts = getContractAddresses(chainId);
  return contracts[contractName];
}

/**
 * Check if contract is deployed (address is not zero address)
 */
export function isContractDeployed(
  chainId: number,
  contractName: keyof typeof HARDHAT_CONTRACTS,
): boolean {
  const address = getContractAddress(chainId, contractName);
  return address !== "0x0000000000000000000000000000000000000000";
}

/**
 * Get all deployed contract information
 */
export function getDeployedContracts(chainId: number): Record<string, Address> {
  const contracts = getContractAddresses(chainId);
  const deployed: Record<string, Address> = {};

  Object.entries(contracts).forEach(([name, address]) => {
    if (address !== "0x0000000000000000000000000000000000000000") {
      deployed[name] = address;
    }
  });

  return deployed;
}

// Export default configuration (currently using Moonbase Alpha)
export const DEFAULT_CONTRACTS = MOONBASE_ALPHA_CONTRACTS;

// Export contract addresses and ABIs
export const btcOracleAddress = MOONBASE_ALPHA_CONTRACTS.BTCOracle;
export const votingContractAddress = MOONBASE_ALPHA_CONTRACTS.VotingContract;
export const votingTicketAddress = MOONBASE_ALPHA_CONTRACTS.VotingTicket;
export const stakingContractAddress = MOONBASE_ALPHA_CONTRACTS.StakingContract;
export const vDOTAddress = MOONBASE_ALPHA_CONTRACTS.vDOT;

// 导入 ABIs
import BTCOracleArtifact from "@/contracts/abis/BTCOracle.json";
import VotingContractArtifact from "@/contracts/abis/VotingContract.json";
import VotingTicketArtifact from "@/contracts/abis/VotingTicket.json";
import StakingContractArtifact from "@/contracts/abis/StakingContract.json";
import VDOTArtifact from "@/contracts/abis/vDOT.json";

// Extract ABI from Hardhat compilation output
export const btcOracleAbi = (BTCOracleArtifact as { abi: unknown[] }).abi;
export const votingContractAbi = (VotingContractArtifact as { abi: unknown[] })
  .abi;
export const votingTicketAbi = (VotingTicketArtifact as { abi: unknown[] }).abi;
export const stakingContractAbi = (
  StakingContractArtifact as { abi: unknown[] }
).abi;
export const vDOTAbi = (VDOTArtifact as { abi: unknown[] }).abi;
