import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { reassignClaim, fetchQueues, Queue } from "@/api/claims";

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimId: string;
  onSuccess?: () => void;
}

const ReassignModal: React.FC<ReassignModalProps> = ({
  isOpen,
  onClose,
  claimId,
  onSuccess,
}) => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingQueues, setFetchingQueues] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadQueues();
    }
  }, [isOpen]);

  const loadQueues = async () => {
    setFetchingQueues(true);
    try {
      const data = await fetchQueues();
      setQueues(data);
      if (data.length > 0) {
        setSelectedQueue(data[0].id);
      }
    } catch (error) {
      toast.error("Failed to load queues");
    } finally {
      setFetchingQueues(false);
    }
  };

  const currentQueue = queues.find((q) => q.id === selectedQueue);
  const assignees = currentQueue?.assignees || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedQueue || !selectedAssignee) {
      toast.error("Please select a queue and assignee");
      return;
    }

    setLoading(true);
    try {
      await reassignClaim(claimId, {
        queue: selectedQueue,
        assignee: selectedAssignee,
        note: note,
      });
      toast.success("Claim reassigned successfully");
      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to reassign claim";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Reassign Claim
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Queue *
            </label>
            <select
              value={selectedQueue}
              onChange={(e) => {
                setSelectedQueue(e.target.value);
                setSelectedAssignee("");
              }}
              disabled={fetchingQueues}
              className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Select queue</option>
              {queues.map((queue) => (
                <option key={queue.id} value={queue.id}>
                  {queue.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Assignee *
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              disabled={assignees.length === 0}
              className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Select assignee</option>
              {assignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note for the assignee..."
              className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 font-medium"
            >
              {loading ? "Reassigning..." : "Reassign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReassignModal;
