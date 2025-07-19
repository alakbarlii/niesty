'use client';

import { CheckCircle, Clock } from 'lucide-react';

export const DEAL_STAGES = [
  'Waiting for Response',
  'Negotiating Terms',
  'Platform Escrow',
  'Content Submitted',
  'Approved',
  'Payment Released',
];

export interface DealProgressProps {
  currentStage: number;
}

export default function DealProgress({ currentStage }: DealProgressProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-gray-300">Deal Progress</h2>

      <ol className="relative border-l border-gray-700 ml-3">
        {DEAL_STAGES.map((stage, index) => {
          const isCompleted = index < currentStage;
          const isLastStage = index === DEAL_STAGES.length - 1;
          const isCurrent = index === currentStage;

          const showCheck =
            isCompleted || (isCurrent && isLastStage); 
          const showClock =
            isCurrent && !isLastStage; // ⏳ Clock only if current and not last

          return (
            <li key={stage} className="mb-6 ml-4">
              <div className="absolute w-3 h-3 rounded-full -left-1.5 border border-gray-500 flex items-center justify-center bg-gray-900">
                {showCheck ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                ) : showClock ? (
                  <Clock className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                )}
              </div>
              <p
                className={`text-sm ml-4 ${
                  showCheck
                    ? 'text-green-400'
                    : showClock
                    ? 'text-yellow-300 font-semibold animate-pulse'
                    : 'text-gray-400'
                }`}
              >
                {stage}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
