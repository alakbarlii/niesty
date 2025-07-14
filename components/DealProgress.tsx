'use client';

import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DealProgressProps {
  currentStage: number; // 0 = Waiting for Response, 5 = Payment Released
}

const DEAL_STAGES = [
  'Waiting for Response',
  'Negotiating Terms',
  'Platform Escrow',
  'Content Submitted',
  'Approved',
  'Payment Released',
];

export default function DealProgress({ currentStage }: DealProgressProps) {
  return (
    <div className="mt-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Deal Progress</h2>
      <ol className="space-y-2 ml-4 list-decimal">
        {DEAL_STAGES.map((stage, index) => (
          <li
            key={stage}
            className={cn(
              'flex items-center gap-2 text-sm',
              index < currentStage && 'text-green-600',
              index === currentStage && 'text-yellow-500 font-semibold',
              index > currentStage && 'text-gray-400'
            )}
          >
            {index < currentStage && <Check className="w-4 h-4 text-green-600" />}
            {index === currentStage && <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />}
            {index > currentStage && (
              <span className="w-4 h-4 inline-block rounded-full border border-gray-300" />
            )}
            {stage}
          </li>
        ))}
      </ol>
    </div>
  );
}
