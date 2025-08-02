import { CheckCircle, Clock, XCircle } from 'lucide-react';

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
  canApprove?: boolean;
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
  canApprove = false,
}: DealProgressProps) {
  const handleApprove = () => {
    const confirm = window.confirm('Are you sure you want to approve this content?');
    if (confirm && onApprove) {
      onApprove();
    }
  };

  const handleReject = () => {
    const reason = window.prompt('Enter reason for rejection:');
    if (reason && onReject) {
      onReject(reason);
    }
  };

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-gray-300">Deal Progress</h2>

      <ol className="relative border-l border-gray-700 ml-3">
        {DEAL_STAGES.map((stage, index) => {
          const isCompleted = index < currentStage;
          const isLastStage = index === DEAL_STAGES.length - 1;
          const isCurrent = index === currentStage;

          const showCheck = isCompleted || (isCurrent && isLastStage);
          const showClock = isCurrent && !isLastStage;

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
                  {stage}
                </p>

                {/* Show content link in Content Submitted stage */}
                {stage === 'Content Submitted' && contentLink && (
                  <a
                    href={contentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs ml-1 underline"
                  >
                    View Content
                  </a>
                )}

                {/* Show edit option if editable and not approved */}
                {stage === 'Content Submitted' && isEditable && !isRejected && (
                  <button
                    onClick={onEditContentLink}
                    className="ml-2 text-xs text-yellow-300 underline hover:text-yellow-200"
                  >
                    Edit Content Link
                  </button>
                )}

                {/* Show rejection reason if rejected */}
                {stage === 'Content Submitted' && isRejected && rejectionReason && (
                  <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    <span>Rejected: {rejectionReason}</span>
                  </div>
                )}

                {/* Show Approve/Reject buttons if applicable */}
                {stage === 'Content Submitted' && canApprove && !isRejected && (
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
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
