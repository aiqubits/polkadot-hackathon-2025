"use client";

import { useState, useEffect } from "react";

// API configuration - we'll move this to env later
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const optionLabels: Record<number, { label: string; color: string }> = {
  3: { label: "Within 3 years", color: "bg-red-500" },
  5: { label: "Within 5 years", color: "bg-orange-500" },
  10: { label: "Within 10 years", color: "bg-yellow-500" },
  20: { label: "Within 20 years", color: "bg-green-500" },
  99: { label: "Never", color: "bg-blue-500" },
};

interface VoteResult {
  option: number;
  label: string;
  votes: number;
  votingPower: number;
  percentage: number;
  color: string;
}

export function VoteResults() {
  const [results, setResults] = useState<VoteResult[]>([]);
  const [_totalVotingPower, setTotalVotingPower] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    try {
      if (!API_BASE_URL) {
        // Mock data for development
        setResults([
          {
            option: 3,
            label: "Within 3 years",
            votes: 15,
            votingPower: 1500,
            percentage: 15,
            color: "bg-red-500",
          },
          {
            option: 5,
            label: "Within 5 years",
            votes: 25,
            votingPower: 2500,
            percentage: 25,
            color: "bg-orange-500",
          },
          {
            option: 10,
            label: "Within 10 years",
            votes: 30,
            votingPower: 3000,
            percentage: 30,
            color: "bg-yellow-500",
          },
          {
            option: 20,
            label: "Within 20 years",
            votes: 20,
            votingPower: 2000,
            percentage: 20,
            color: "bg-green-500",
          },
          {
            option: 99,
            label: "Never",
            votes: 10,
            votingPower: 1000,
            percentage: 10,
            color: "bg-blue-500",
          },
        ]);
        setTotalVotingPower(10000);
        setTotalParticipants(100);
        setTotalStaked(10000);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/results`);
      const data = (await response.json()) as {
        results: Array<{
          option: number;
          votes: number;
          votingPower: number;
          percentage: string;
        }>;
        totalVotingPower: number;
        totalParticipants: number;
        totalStaked: number;
      };

      if (response.ok) {
        // Format results data
        const formattedResults: VoteResult[] = data.results.map((r) => ({
          option: r.option,
          label: optionLabels[r.option]?.label ?? "Unknown",
          votes: r.votes,
          votingPower: r.votingPower,
          percentage: parseFloat(r.percentage),
          color: optionLabels[r.option]?.color ?? "bg-gray-500",
        }));

        setResults(formattedResults);
        setTotalVotingPower(data.totalVotingPower);
        setTotalParticipants(data.totalParticipants);
        setTotalStaked(data.totalStaked);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchResults();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      void fetchResults();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const topChoice = results.reduce(
    (max, r) => (r.percentage > max.percentage ? r : max),
    { percentage: 0, label: "" },
  );

  if (loading) {
    return (
      <div className="sticky top-24 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-lg">
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-8 w-8 animate-spin text-cyan-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-24 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-lg">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-white">Real-time Vote Results</h2>
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
      </div>

      <div className="mb-6 rounded-lg bg-white/5 p-4">
        <div className="text-center">
          <div className="mb-1 text-3xl text-white">
            {totalParticipants.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total Votes</div>
        </div>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{result.label}</span>
              <span className="text-white">{result.percentage}%</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full ${result.color} rounded-full transition-all duration-500`}
                style={{ width: `${result.percentage}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-400">
              {result.votingPower.toLocaleString()} voting rights
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        <div className="rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="mb-1 text-sm text-white">Community Trend</p>
              <p className="text-xs text-gray-400">
                {topChoice.label
                  ? `Most users believe BTC will be surpassed ${topChoice.label}`
                  : "No vote data yet"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-2 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>Participating Addresses:</span>
          <span className="text-white">{totalParticipants}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Total Locked vDOT:</span>
          <span className="text-white">{totalStaked.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Last Update:</span>
          <span className="text-white">Real-time</span>
        </div>
      </div>
    </div>
  );
}
