import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const UploadConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const claimId = (location.state?.claimId as string) || "CLM-XXXX-XXXXXX";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <CheckCircle2 className="w-24 h-24 text-primary animate-bounce" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Claim Submitted Successfully!
        </h1>

        <p className="text-muted-foreground mb-6">
          Your insurance claim has been received and is now being processed by
          our AI system.
        </p>

        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <p className="text-sm text-muted-foreground mb-2">Your Claim ID</p>
          <p className="text-2xl font-bold text-primary font-mono">{claimId}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Save this ID for your records
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate("/")}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
          >
            Back Home
          </button>
          <button
            onClick={() => navigate("/team")}
            className="w-full px-6 py-3 border border-border text-foreground rounded-lg hover:bg-card transition-colors font-medium"
          >
            Go to Team Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadConfirmation;
