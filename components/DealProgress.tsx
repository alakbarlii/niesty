'use client';

import { useState, type KeyboardEventHandler } from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

export const DEAL_STAGES = [
  'Waiting for Response',
  'Negotiating Terms',
  'Platform Escrow',
  'Content Submitted',
  'Approved',
  'Payment Released',
] as const;

type SubmissionStatus = 'pending' | 'rework' | 'approved' | null;

export interface DealProgressProps {
  /** Zero-based index of the current stage. Pass -1 to render all stages as not-started (gray). */
  currentStage: number;
  contentLink?: string;
  isEditable?: boolean;
  isRejected?: boolean;
  rejectionReason?: string | null;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onAgree?: () => void; // not used here
  onSubmitContent?: (url: string) => void;
  canApprove?: boolean;
  isCreator?: boolean;
  isSender?: boolean;
  submissionStatus?: SubmissionStatus;
}

export default function DealProgress({
  currentStage,
  contentLink,
  isEditable: _isEditable = false,
  isRejected = false,
  rejectionReason = null,
  onApprove: _onApprove,
  onReject: _onReject,
  onAgree: _onAgree,
  onSubmitContent,
  canApprove: _canApprove,
  isCreator = false,
  isSender: _isSender = false,
  submissionStatus = null,
}: DealProgressProps) {
  // silence unused-args warnings
  void _isEditable; void _onApprove; void _onReject; void _onAgree; void _canApprove; void _isSender;

  const [contentUrl, setContentUrl] = useState<string>('');
  const isValidHttpUrl = (url: string): boolean => /^https?:\/\/\S+/i.test(url);

  const submitIfValid = (): void => {
    if (!onSubmitContent) return;
    const url = contentUrl.trim();
    if (!isValidHttpUrl(url)) {
      alert('Enter a valid URL starting with http:// or https://');
      return;
    }
    onSubmitContent(url);
  };

  const onUrlKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitIfValid();
    }
  };

  // NEW: allow -1 = “no stage started” (everything gray)
  const noStageStarted = Number.isInteger(currentStage) && currentStage < 0;

  const safeStageIndex =
    Number.isInteger(currentStage) && currentStage >= 0 && currentStage < DEAL_STAGES.length
      ? currentStage
      : 0;

  const latestIsRework = submissionStatus === 'rework';
  const showResubmit = latestIsRework || !contentLink;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-gray-300">Deal Progress</h2>

      <ol className="relative border-l border-gray-700 ml-3">
        {DEAL_STAGES.map((stageLabel, index) => {
          const isLastStage = index === DEAL_STAGES.length - 1;
          const isCompleted = !noStageStarted && index < safeStageIndex;
          const isCurrent = !noStageStarted && index === safeStageIndex;

          // last-stage pending clock if content approved but payout not confirmed
          const lastStagePending = isCurrent && isLastStage && submissionStatus === 'approved';

          let showCheck = false;
          let showClock = false;

          if (isCurrent) {
            if (isLastStage) {
              showClock = lastStagePending;
              showCheck = !lastStagePending;
            } else {
              showClock = true;
            }
          } else if (isCompleted) {
            showCheck = true;
          }

          return (
            <li key={stageLabel} className="mb-6 ml-4">
              <div className="absolute w-3 h-3 rounded-full -left-1.5 border border-gray-500 flex items-center justify-center bg-gray-900">
                {showCheck ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                ) : showClock ? (
                  <Clock className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                )}
              </div>

              <div className="ml-4">
                <p
                  className={`text-sm ${
                    showCheck
                      ? 'text-green-400'
                      : showClock
                      ? 'text-yellow-300 font-semibold animate-pulse'
                      : 'text-gray-400'
                  }`}
                >
                  {stageLabel}
                </p>

                {stageLabel === 'Content Submitted' && (
                  <div className="mt-1 space-y-1">
                    {isCreator && onSubmitContent && showResubmit && (
                      <>
                        <input
                          type="url"
                          inputMode="url"
                          autoComplete="off"
                          placeholder="https://your-content-url.com"
                          value={contentUrl}
                          onChange={(e) => setContentUrl(e.target.value)}
                          onKeyDown={onUrlKeyDown}
                          className="text-xs p-1 rounded bg-gray-800 text-white w-full"
                          aria-label="Content URL"
                        />
                        <button
                          onClick={submitIfValid}
                          className="text-xs text-yellow-300 underline hover:text-yellow-200"
                        >
                          {latestIsRework ? 'Resubmit Content' : 'Submit Content'}
                        </button>
                      </>
                    )}

                    {(latestIsRework || isRejected) && rejectionReason && (
                      <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>Rejected: {rejectionReason}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}