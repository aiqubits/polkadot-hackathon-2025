"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface VoteSectionProps {
  votingPower: number;
  hasVoted: boolean;
  onVote: (yearOption: number) => void;
}

const voteOptions = [
  {
    value: 3,
    label: "Within 3 years",
    description: "Surpassed before 2028",
    color: "from-[#ff4d8a] to-[#e6007a]",
    glow: "shadow-[#e6007a]/50",
  },
  {
    value: 5,
    label: "Within 5 years",
    description: "Surpassed before 2030",
    color: "from-[#e6007a] to-[#552bbf]",
    glow: "shadow-[#552bbf]/50",
  },
  {
    value: 10,
    label: "Within 10 years",
    description: "Surpassed before 2035",
    color: "from-[#552bbf] to-[#00b2ff]",
    glow: "shadow-[#00b2ff]/50",
  },
  {
    value: 20,
    label: "Within 20 years",
    description: "Surpassed before 2045",
    color: "from-[#00b2ff] to-[#56f39a]",
    glow: "shadow-[#56f39a]/50",
  },
  {
    value: 99,
    label: "Never Surpassed",
    description: "BTC will remain leading",
    color: "from-[#56f39a] to-[#e6007a]",
    glow: "shadow-[#e6007a]/50",
  },
];

export function VoteSection({
  votingPower,
  hasVoted,
  onVote,
}: VoteSectionProps) {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async () => {
    if (!selectedOption || votingPower === 0) return;

    setIsVoting(true);
    // Simulate voting transaction
    await new Promise((resolve) => setTimeout(resolve, 2000));
    onVote(parseInt(selectedOption));
    setIsVoting(false);
  };

  if (hasVoted) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-lg">
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
            <svg
              className="h-10 w-10 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl text-white">Vote Successful!</h3>
          <p className="text-gray-300">
            Thank you for participating, your prediction has been recorded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-lg">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-white">Participate in Voting</h2>
        <div className="flex items-center space-x-2">
          <svg
            className="h-5 w-5 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span className="text-sm text-gray-300">
            Available Voting Rights:{" "}
            <span className="text-purple-400">{votingPower}</span>
          </span>
        </div>
      </div>

      {votingPower === 0 ? (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
          <svg
            className="mx-auto mb-3 h-12 w-12 text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-yellow-300">
            You need to stake vDOT first to get voting rights
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="mb-4 text-sm text-gray-300">
            When do you think Bitcoin (BTC) will be surpassed by other competing
            chains?
          </p>

          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            <div className="space-y-3">
              {voteOptions.map((option) => (
                <div
                  key={option.value}
                  className={`relative cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                    selectedOption === option.value.toString()
                      ? `glass-effect border-white/40 shadow-lg ${option.glow} scale-[1.02]`
                      : "glass-effect border-white/10 hover:scale-[1.01] hover:border-white/30"
                  }`}
                  onClick={() => setSelectedOption(option.value.toString())}
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem
                      value={option.value.toString()}
                      id={`option-${option.value}`}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`option-${option.value}`}
                        className="cursor-pointer font-semibold text-white"
                      >
                        {option.label}
                      </Label>
                      <p className="mt-1 text-sm text-gray-300">
                        {option.description}
                      </p>
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full bg-gradient-to-r ${option.color} shadow-lg ${option.glow}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>

          <div className="space-y-2 rounded-lg bg-white/5 p-4 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Your Voting Weight:</span>
              <span className="text-white">{votingPower} votes</span>
            </div>
            <p className="text-xs text-gray-400">
              * Votes cannot be changed after submission, please choose
              carefully
            </p>
          </div>

          <Button
            onClick={handleVote}
            disabled={!selectedOption || isVoting}
            className="w-full border-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVoting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
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
                Voting...
              </span>
            ) : (
              "Submit Vote"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
