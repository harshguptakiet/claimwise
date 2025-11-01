import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import Badge from "@/components/shared/Badge";
import { getQueues, Queue } from "@/api/queues";
import { fetchClaims, ClaimResponse } from "@/api/claims";

const QueuesPage = () => {
  const navigate = useNavigate();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [queueClaims, setQueueClaims] = useState<ClaimResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClaims, setLoadingClaims] = useState(false);

  useEffect(() => {
    loadQueues();
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      loadQueueClaims(selectedQueue.name);
    }
  }, [selectedQueue]);

  const loadQueues = async () => {
    setLoading(true);
    try {
      const data = await getQueues();
      setQueues(data);
      if (data.length > 0 && !selectedQueue) {
        setSelectedQueue(data[0]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load queues";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadQueueClaims = async (queueName: string) => {
    setLoadingClaims(true);
    try {
      const data = await fetchClaims({
        queue: queueName,
        limit: 50,
        offset: 0,
      });
      setQueueClaims(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load claims";
      toast.error(errorMessage);
    } finally {
      setLoadingClaims(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0f] to-[#1a1a22]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#9ca3af] hover:text-[#a855f7] mb-6 transition-all duration-300 ease-in-out"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f3f4f6] mb-2">Queues</h1>
          <p className="text-[#9ca3af]">
            View and manage claim processing queues
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Queue List */}
          <div className="lg:col-span-1">
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-[#2a2a32]">
                <h2 className="text-lg font-semibold text-[#f3f4f6]">
                  All Queues
                </h2>
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-t-[#a855f7] border-[#a855f7]/20 mx-auto mb-4"></div>
                  <p className="text-[#9ca3af] text-sm">Loading queues...</p>
                </div>
              ) : queues.length === 0 ? (
                <div className="p-8 text-center">
                  <FolderOpen className="w-12 h-12 mx-auto text-[#6b7280] mb-4" />
                  <p className="text-[#9ca3af]">No queues found</p>
                </div>
              ) : (
                <div className="divide-y divide-[#2a2a32]">
                  {queues.map((queue) => (
                    <button
                      key={queue.id}
                      onClick={() => setSelectedQueue(queue)}
                      className={`w-full p-4 text-left transition-all duration-300 ease-in-out ${
                        selectedQueue?.id === queue.id
                          ? "bg-[#a855f7]/10 border-l-4 border-[#a855f7]"
                          : "hover:bg-[#2a2a32]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3
                          className={`font-semibold ${
                            selectedQueue?.id === queue.id
                              ? "text-[#a855f7]"
                              : "text-[#f3f4f6]"
                          }`}
                        >
                          {queue.name}
                        </h3>
                        <ChevronRight
                          className={`w-5 h-5 transition-transform duration-300 ${
                            selectedQueue?.id === queue.id
                              ? "text-[#a855f7] rotate-90"
                              : "text-[#6b7280]"
                          }`}
                        />
                      </div>
                      <p className="text-sm text-[#9ca3af] mb-2">
                        {queue.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#6b7280]">
                          {queue.claimCount} claims
                        </span>
                        <span className="text-xs text-[#6b7280]">
                          {queue.averageProcessingTime}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Selected Queue Details */}
          <div className="lg:col-span-2">
            {selectedQueue ? (
              <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg overflow-hidden">
                <div className="p-6 border-b border-[#2a2a32]">
                  <h2 className="text-2xl font-bold text-[#f3f4f6] mb-2">
                    {selectedQueue.name}
                  </h2>
                  <p className="text-[#9ca3af] mb-4">
                    {selectedQueue.description}
                  </p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-[#9ca3af] mb-1">Total Claims</p>
                      <p className="text-2xl font-bold text-[#a855f7]">
                        {selectedQueue.claimCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9ca3af] mb-1">
                        Avg Processing Time
                      </p>
                      <p className="text-lg font-semibold text-[#f3f4f6]">
                        {selectedQueue.averageProcessingTime}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold text-[#f3f4f6] mb-4">
                    Claims in Queue
                  </h3>
                  {loadingClaims ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-t-[#a855f7] border-[#a855f7]/20 mx-auto mb-4"></div>
                      <p className="text-[#9ca3af]">Loading claims...</p>
                    </div>
                  ) : queueClaims.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderOpen className="w-16 h-16 mx-auto text-[#6b7280] mb-4" />
                      <p className="text-[#9ca3af] text-lg">No claims in this queue</p>
                      <p className="text-[#6b7280] text-sm mt-2">
                        Claims will appear here once they are routed to this queue.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {queueClaims.map((claim) => (
                        <div
                          key={claim.id}
                          onClick={() => navigate(`/team/claims/${claim.id}`)}
                          className="group bg-[#0b0b0f] border border-[#2a2a32] rounded-lg p-4 cursor-pointer transition-all duration-300 ease-in-out hover:border-[#a855f7]/50 hover:shadow-lg hover:shadow-[#a855f7]/10 hover:-translate-y-1"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-sm font-mono text-[#a855f7] group-hover:text-[#c084fc] transition-colors">
                                  {claim.id}
                                </h4>
                                <Badge variant="severity" severity={claim.severity}>
                                  {claim.severity}
                                </Badge>
                                <Badge variant="status" status={claim.status}>
                                  {claim.status}
                                </Badge>
                              </div>
                              <p className="text-base font-semibold text-[#f3f4f6] mb-1 group-hover:text-[#a855f7] transition-colors">
                                {claim.claimant}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-[#9ca3af]">
                                <span>Policy: {claim.policy_no}</span>
                                <span>•</span>
                                <span>{claim.loss_type}</span>
                                <span>•</span>
                                <span>{formatDate(claim.created_at)}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[#6b7280] group-hover:text-[#a855f7] transition-all duration-300 group-hover:translate-x-1 flex-shrink-0" />
                          </div>
                          <div className="mt-3 flex items-center justify-between pt-3 border-t border-[#2a2a32]">
                            <span className="text-xs text-[#9ca3af]">
                              Confidence:{" "}
                              <span className="font-bold text-[#a855f7]">
                                {(claim.confidence * 100).toFixed(0)}%
                              </span>
                            </span>
                            <span className="text-xs text-[#6b7280]">
                              Click to view details
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-12 text-center">
                <FolderOpen className="w-16 h-16 mx-auto text-[#6b7280] mb-4" />
                <p className="text-[#9ca3af] text-lg">
                  Select a queue to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueuesPage;