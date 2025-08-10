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
  currentStage: number;
  contentLink?: string;
  isEditable?: boolean;                 // kept for compatibility
  isRejected?: boolean;
  rejectionReason?: string | null;
  onApprove?: () => void;               // kept for compatibility (not rendered here)
  onReject?: (reason: string) => void;  // kept for compatibility (not rendered here)
  onAgree?: () => void;
  onSubmitContent?: (url: string) => void;
  canApprove?: boolean;                 // kept for compatibility (not rendered here)
  /** Are *you* the creator participant on this deal? */
  isCreator?: boolean;
  /** Kept for compatibility with callers; not used here */
  isSender?: boolean;
  /** Status of the latest submission from deal_submissions */
  submissionStatus?: SubmissionStatus;
}

export default function DealProgress({
  currentStage,
  contentLink,
  isEditable: _isEditable = false, // alias + neutralize to satisfy eslint
  isRejected = false,
  rejectionReason = null,
  onApprove: _onApprove,            // neutralized (not rendered here)
  onReject: _onReject,              // neutralized (not rendered here)
  onAgree,
  onSubmitContent,
  canApprove: _canApprove,          // neutralized (not rendered here)
  isCreator = false,
  // keep prop for callers; alias to avoid unused-var lint
  isSender: _isSender = false,
  submissionStatus = null,
}: DealProgressProps) {
  // mark intentionally-unused props as used to satisfy no-unused-vars
  void _isEditable;
  void _onApprove;
  void _onReject;
  void _canApprove;
  void _isSender;

  const [contentUrl, setContentUrl] = useState<string>('');

  const isValidHttpUrl = (url: string): boolean => /^https?:\/\/\S+/i.test(url);

  const submitIfValid = (): void => {
    if (!onSubmitContent) return;
    const url = contentUrl.trim();
    if (!isValidHttpUrl(url)) {
      alert('Enter a valid URL starting with http:// or https://');
      return;
    }
    if (window.confirm('Submit this URL?')) onSubmitContent(url);
  };

  const handleSubmitContent = (): void => submitIfValid();

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

          const showCheck = isCompleted || (isCurrent && isLastStage);
          const showClock = isCurrent && !isLastStage;

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

                {/* Agree during Negotiating */}
                {stageLabel === 'Negotiating Terms' && onAgree && (
                  <button
                    onClick={onAgree}
                    className="text-xs mt-1 text-yellow-300 underline hover:text-yellow-200"
                  >
                    I Agree to Terms
                  </button>
                )}

                {/* NOTE: Removed inline submit at Platform Escrow (submission happens in big section below) */}

                {/* Primary flow: submit / resubmit in Content Submitted (input only; no view/approve/reject here) */}
                {stageLabel === 'Content Submitted' && (
                  <div className="mt-1 space-y-1">
                    {/* Creator can (re)submit when needed */}
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
                          onClick={handleSubmitContent}
                          className="text-xs text-yellow-300 underline hover:text-yellow-200"
                        >
                          {latestIsRework ? 'Resubmit Content' : 'Submit Content'}
                        </button>
                      </>
                    )}

                    

                    {/* Rework banner */}
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
