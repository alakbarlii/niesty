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
  /** Zero-based index of the current stage in DEAL_STAGES */
  currentStage: number;
  /** Latest submitted content link (if any) */
  contentLink?: string;
  /** Compatibility flags (not rendered in this component) */
  isEditable?: boolean;
  isRejected?: boolean;
  rejectionReason?: string | null;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  /** No agreement button here — kept only to satisfy callers */
  onAgree?: () => void;
  /** Creator submission handler (optional) */
  onSubmitContent?: (url: string) => void;
  canApprove?: boolean;

  /** Are you the creator? Enables submit/resubmit input at Content Submitted stage */
  isCreator?: boolean;
  /** Kept for compatibility with callers; not used here */
  isSender?: boolean;

  /**
   * Status of the latest submission.
   * Used to render:
   *  - rework banner
   *  - ⏳ at Content Submitted when rework/pending
   *  - ⏳ at Payment Released while payout is in-flight
   */
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
  onAgree: _onAgree, // intentionally unused here
  onSubmitContent,
  canApprove: _canApprove,
  isCreator = false,
  isSender: _isSender = false,
  submissionStatus = null,
}: DealProgressProps) {
  // neutralize unused props to satisfy TS/ESLint
  void _isEditable;
  void _onApprove;
  void _onReject;
  void _canApprove;
  void _isSender;
  void _onAgree;

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
          const isCompleted = index < safeStageIndex;
          const isLastStage = index === DEAL_STAGES.length - 1;
          const isCurrent = index === safeStageIndex;

          // Drive last-stage pending clock if submission was approved but payout not yet confirmed.
          const lastStagePending = isCurrent && isLastStage && submissionStatus === 'approved';

          // Decide which indicator to show
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

                {/* Content Submitted — allow (re)submit for creators only */}
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
