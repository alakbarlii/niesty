'use client';

import { useState } from 'react';
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
  isEditable?: boolean;
  isRejected?: boolean;
  rejectionReason?: string | null;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onAgree?: () => void;
  onSubmitContent?: (url: string) => void;
  canApprove?: boolean;
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
  isEditable = false,
  isRejected = false,
  rejectionReason = null,
  onApprove,
  onReject,
  onAgree,
  onSubmitContent,
  canApprove = false,
  isCreator = false,
  // keep prop for callers; alias to avoid unused-var lint
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSender: _isSender = false,
  submissionStatus = null,
}: DealProgressProps) {
  const [contentUrl, setContentUrl] = useState<string>('');

  const isValidHttpUrl = (url: string) => /^https?:\/\/\S+/i.test(url);

  const handleApprove = () => {
    if (!onApprove) return;
    if (window.confirm('Approve this content?')) onApprove();
  };

  const handleReject = () => {
    if (!onReject) return;
    const reason = window.prompt('Reason for rejection:')?.trim();
    if (!reason) return;
    onReject(reason);
  };

  const submitIfValid = () => {
    if (!onSubmitContent) return;
    const url = contentUrl.trim();
    if (!isValidHttpUrl(url)) {
      alert('Enter a valid URL starting with http:// or https://');
      return;
    }
    if (window.confirm('Submit this URL?')) onSubmitContent(url);
  };

  const handleSubmitContent = () => submitIfValid();

  const onUrlKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
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

                {/* Legacy support: submit at Platform Escrow if your flow shows it there */}
                {stageLabel === 'Platform Escrow' && isCreator && onSubmitContent && (
                  <div className="mt-1 space-y-1">
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
                      Submit Content
                    </button>
                  </div>
                )}

                {/* Primary flow: submit / resubmit in Content Submitted */}
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

                    {/* View link if present */}
                    {contentLink && (
                      <a
                        href={contentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs ml-1 underline break-all"
                      >
                        View Content
                      </a>
                    )}

                    {/* Rework banner (new flow) OR legacy rejection banner */}
                    {(latestIsRework || isRejected) && rejectionReason && (
                      <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>Rejected: {rejectionReason}</span>
                      </div>
                    )}

                    {/* Business controls when pending */}
                    {canApprove && submissionStatus === 'pending' && (
                      <div className="mt-1 flex gap-2">
                        <button
                          onClick={handleApprove}
                          className="text-xs text-green-400 underline hover:text-green-300"
                        >
                          Approve
                        </button>
                        <button
                          onClick={handleReject}
                          className="text-xs text-red-400 underline hover:text-red-300"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Optional edit link (legacy) */}
                    {isEditable && contentLink && onSubmitContent && (
                      <button
                        onClick={() => {
                          const next = window.prompt('Edit content URL:', contentLink || '')?.trim();
                          if (!next) return;
                          if (!isValidHttpUrl(next)) {
                            alert('Enter a valid URL starting with http:// or https://');
                            return;
                          }
                          onSubmitContent(next);
                        }}
                        className="ml-2 text-xs text-yellow-300 underline hover:text-yellow-200"
                      >
                        Edit Content Link
                      </button>
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
