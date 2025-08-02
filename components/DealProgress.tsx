import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';

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
  contentLink?: string;
  onEditContentLink?: () => void;
  isEditable?: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onAgree?: () => void;
  onSubmitContent?: (url: string) => void;
  canApprove?: boolean;
  isSender: boolean;
}

export default function DealProgress({
  currentStage,
  contentLink,
  onEditContentLink,
  isEditable = false,
  isRejected = false,
  rejectionReason,
  onApprove,
  onReject,
  onAgree,
  onSubmitContent,
  canApprove = false,
  isSender,
}: DealProgressProps) {
  const [contentUrl, setContentUrl] = useState('');

  const handleApprove = () => {
    const confirm = window.confirm('Are you sure you want to approve this content?');
    if (confirm && onApprove) onApprove();
  };

  const handleReject = () => {
    const reason = window.prompt('Enter reason for rejection:');
    if (reason && onReject) onReject(reason);
  };

  const handleSubmitContent = () => {
    if (!contentUrl.trim()) return alert('Enter a valid content URL.');
    const confirm = window.confirm('Submit this content URL?');
    if (confirm && onSubmitContent) onSubmitContent(contentUrl.trim());
  };

  const isDealFrozen = isRejected;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-gray-300">Deal Progress</h2>

      <ol className="relative border-l border-gray-700 ml-3">
        {DEAL_STAGES.map((stageLabel, index) => {
          if (isDealFrozen && index > 3) return null;

          const isCompleted = index < currentStage && !isDealFrozen;
          const isLastStage = index === DEAL_STAGES.length - 1;
          const isCurrent = index === currentStage && !isDealFrozen;

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

                {/* Stage-specific interaction */}
                {stageLabel === 'Negotiating Terms' && onAgree && (
                  <button
                    onClick={onAgree}
                    className="text-xs mt-1 text-yellow-300 underline hover:text-yellow-200"
                  >
                    I Agree to Terms
                  </button>
                )}

                {stageLabel === 'Platform Escrow' && isSender && onSubmitContent && (
                  <div className="mt-1 space-y-1">
                    <input
                      type="text"
                      placeholder="https://your-content-url.com"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      className="text-xs p-1 rounded bg-gray-800 text-white w-full"
                    />
                    <button
                      onClick={handleSubmitContent}
                      className="text-xs text-yellow-300 underline hover:text-yellow-200"
                    >
                      Submit Content
                    </button>
                  </div>
                )}

                {stageLabel === 'Content Submitted' && contentLink && (
                  <>
                    <a
                      href={contentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs ml-1 underline"
                    >
                      View Content
                    </a>
                    {isEditable && !isRejected && (
                      <button
                        onClick={onEditContentLink}
                        className="ml-2 text-xs text-yellow-300 underline hover:text-yellow-200"
                      >
                        Edit Content Link
                      </button>
                    )}
                    {isRejected && rejectionReason && (
                      <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>Rejected: {rejectionReason}</span>
                      </div>
                    )}
                    {canApprove && !isRejected && (
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
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {isDealFrozen && (
        <p className="text-red-400 text-sm mt-2 font-semibold">
          This deal has been rejected and cannot proceed.
        </p>
      )}
    </div>
  );
}
