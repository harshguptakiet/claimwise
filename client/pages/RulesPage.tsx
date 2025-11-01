import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Edit, X } from "lucide-react";
import { toast } from "sonner";
import {
  getRules,
  getRuleAttributes,
  createRule,
  updateRule,
  Rule,
  CreateRuleData,
} from "@/api/rules";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const OPERATORS = ["=", ">", "<", ">=", "<=", "!="];
const DEPARTMENTS = [
  "High Priority",
  "Medium Priority",
  "Low Priority",
  "Medical Review",
];

const RulesPage = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<Rule[]>([]);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  // Form state for Add New Rule
  const [addForm, setAddForm] = useState<CreateRuleData>({
    attribute: "",
    operator: "",
    amount: 0,
    forward_to: "",
  });

  // Form state for Edit Rule
  const [editForm, setEditForm] = useState<CreateRuleData>({
    attribute: "",
    operator: "",
    amount: 0,
    forward_to: "",
  });

  useEffect(() => {
    loadRules();
    loadAttributes();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await getRules();
      setRules(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load rules";
      toast.error(errorMessage);
      // Use mock data if API fails
      setRules([
        {
          id: "1",
          name: "High Severity Rule",
          attribute: "severity_score",
          operator: ">",
          amount: 0.8,
          forward_to: "High Priority",
          enabled: true,
        },
        {
          id: "2",
          name: "Low Confidence Rule",
          attribute: "confidence_score",
          operator: "<",
          amount: 0.5,
          forward_to: "Medical Review",
          enabled: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadAttributes = async () => {
    try {
      const data = await getRuleAttributes();
      setAttributes(data);
    } catch (error) {
      // Fallback to default attributes
      setAttributes(["severity_score", "confidence_score", "claim_type", "amount"]);
    }
  };

  const handleAddRule = async () => {
    // Validate form
    if (!addForm.attribute || !addForm.operator || !addForm.forward_to) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const newRule = await createRule(addForm);
      toast.success("Rule created successfully");
      setShowAddModal(false);
      setAddForm({ attribute: "", operator: "", amount: 0, forward_to: "" });
      loadRules(); // Reload rules list
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create rule";
      toast.error(errorMessage);
      // For mock/demo purposes, add to local state
      const mockRule: Rule = {
        id: Date.now().toString(),
        name: `${addForm.attribute} ${addForm.operator} ${addForm.amount}`,
        attribute: addForm.attribute,
        operator: addForm.operator,
        amount: addForm.amount,
        forward_to: addForm.forward_to,
        enabled: true,
      };
      setRules([...rules, mockRule]);
      toast.success("Rule created (mock)");
      setShowAddModal(false);
      setAddForm({ attribute: "", operator: "", amount: 0, forward_to: "" });
    }
  };

  const handleOpenEditModal = () => {
    if (rules.length === 0) {
      toast.error("No rules available to edit");
      return;
    }
    setShowEditModal(true);
    // Auto-select first rule if none selected
    if (!selectedRuleId && rules.length > 0) {
      setSelectedRuleId(rules[0].id);
      const firstRule = rules[0];
      setEditForm({
        attribute: firstRule.attribute || "",
        operator: firstRule.operator || "",
        amount: firstRule.amount || 0,
        forward_to: firstRule.forward_to || "",
      });
    }
  };

  const handleRuleSelect = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      setEditForm({
        attribute: rule.attribute || "",
        operator: rule.operator || "",
        amount: rule.amount || 0,
        forward_to: rule.forward_to || "",
      });
    }
  };

  const handleUpdateRule = async () => {
    if (!selectedRuleId) {
      toast.error("Please select a rule to update");
      return;
    }

    // Validate form
    if (!editForm.attribute || !editForm.operator || !editForm.forward_to) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const updatedRule = await updateRule(selectedRuleId, editForm);
      toast.success("Rule updated successfully");
      setShowEditModal(false);
      setSelectedRuleId(null);
      loadRules(); // Reload rules list
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update rule";
      toast.error(errorMessage);
      // For mock/demo purposes, update local state
      setRules(
        rules.map((rule) =>
          rule.id === selectedRuleId
            ? {
                ...rule,
                attribute: editForm.attribute,
                operator: editForm.operator,
                amount: editForm.amount,
                forward_to: editForm.forward_to,
              }
            : rule
        )
      );
      toast.success("Rule updated (mock)");
      setShowEditModal(false);
      setSelectedRuleId(null);
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
          <h1 className="text-3xl font-bold text-[#f3f4f6] mb-2">Rules Page</h1>
          <p className="text-[#9ca3af]">
            Manage triage rules and AI classification
          </p>
        </div>

        {/* Rules List Section */}
        <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#f3f4f6] mb-4">
            List of Rules Fetched from Backend
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-t-[#a855f7] border-[#a855f7]/20 mx-auto mb-4"></div>
                <p className="text-[#9ca3af]">Loading rules...</p>
              </div>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#9ca3af]">No rules found</p>
              <p className="text-[#6b7280] text-sm mt-2">
                Create your first rule using the "Add New Rule" button below.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-[#0b0b0f] border border-[#2a2a32] rounded-lg p-4 hover:border-[#a855f7]/30 transition-all duration-300"
                >
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-[#9ca3af] mb-1">Rule ID</p>
                      <p className="text-[#f3f4f6] font-mono">{rule.id}</p>
                    </div>
                    <div>
                      <p className="text-[#9ca3af] mb-1">Attribute</p>
                      <p className="text-[#f3f4f6]">{rule.attribute || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[#9ca3af] mb-1">Operator</p>
                      <p className="text-[#f3f4f6] font-mono">{rule.operator || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[#9ca3af] mb-1">Amount</p>
                      <p className="text-[#f3f4f6]">{rule.amount ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[#9ca3af] mb-1">Forward To Department</p>
                      <p className="text-[#f3f4f6]">{rule.forward_to || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6 pt-6 border-t border-[#2a2a32]">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white rounded-lg hover:from-[#9333ea] hover:to-[#db2777] transition-all duration-300 ease-in-out font-medium shadow-lg shadow-[#a855f7]/20 hover:shadow-[#a855f7]/40"
            >
              <Plus className="w-5 h-5" />
              Add New Rule
            </button>
            <button
              onClick={handleOpenEditModal}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-[#2a2a32] text-[#f3f4f6] rounded-lg hover:bg-[#2a2a32] hover:border-[#a855f7]/50 transition-all duration-300 ease-in-out font-medium"
            >
              <Edit className="w-5 h-5" />
              Change Rule
            </button>
          </div>
        </div>

        {/* Add New Rule Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="bg-[#1a1a22] border-[#2a2a32] text-[#f3f4f6] max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#f3f4f6]">
                Make New Rule
              </DialogTitle>
              <DialogDescription className="text-[#9ca3af]">
                Create a new routing rule for claim classification
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-4 gap-4 py-6">
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Attribute
                </label>
                <select
                  value={addForm.attribute}
                  onChange={(e) =>
                    setAddForm({ ...addForm, attribute: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                >
                  <option value="">Select attribute</option>
                  {attributes.map((attr) => (
                    <option key={attr} value={attr}>
                      {attr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Operator
                </label>
                <select
                  value={addForm.operator}
                  onChange={(e) =>
                    setAddForm({ ...addForm, operator: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                >
                  <option value="">Select operator</option>
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={addForm.amount || ""}
                  onChange={(e) =>
                    setAddForm({ ...addForm, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Forward To
                  <br />
                  Department
                </label>
                <select
                  value={addForm.forward_to}
                  onChange={(e) =>
                    setAddForm({ ...addForm, forward_to: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-[#2a2a32]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2 border border-[#2a2a32] text-[#f3f4f6] rounded-lg hover:bg-[#2a2a32] transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRule}
                className="px-6 py-2 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white rounded-lg hover:from-[#9333ea] hover:to-[#db2777] transition-all duration-300 ease-in-out font-medium shadow-lg shadow-[#a855f7]/20"
              >
                Save Changes
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Rule Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="bg-[#1a1a22] border-[#2a2a32] text-[#f3f4f6] max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#f3f4f6]">
                Make Changes
              </DialogTitle>
              <DialogDescription className="text-[#9ca3af]">
                Select a rule and update its parameters
              </DialogDescription>
            </DialogHeader>

            {/* Rule Selection Dropdown */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                Drop down shows all the rules / Click on any claim to change rule
              </label>
              <select
                value={selectedRuleId || ""}
                onChange={(e) => handleRuleSelect(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
              >
                <option value="">Select a rule to edit</option>
                {rules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name ||
                      `${rule.attribute} ${rule.operator} ${rule.amount} → ${rule.forward_to}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-4 gap-4 py-6">
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Attribute
                </label>
                <select
                  value={editForm.attribute}
                  onChange={(e) =>
                    setEditForm({ ...editForm, attribute: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                >
                  <option value="">Select attribute</option>
                  {attributes.map((attr) => (
                    <option key={attr} value={attr}>
                      {attr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Operator
                </label>
                <select
                  value={editForm.operator}
                  onChange={(e) =>
                    setEditForm({ ...editForm, operator: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                >
                  <option value="">Select operator</option>
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Forward To
                  <br />
                  Department
                </label>
                <select
                  value={editForm.forward_to}
                  onChange={(e) =>
                    setEditForm({ ...editForm, forward_to: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-[#2a2a32]">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRuleId(null);
                }}
                className="px-6 py-2 border border-[#2a2a32] text-[#f3f4f6] rounded-lg hover:bg-[#2a2a32] transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRule}
                className="px-6 py-2 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white rounded-lg hover:from-[#9333ea] hover:to-[#db2777] transition-all duration-300 ease-in-out font-medium shadow-lg shadow-[#a855f7]/20"
              >
                Save Changes
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default RulesPage;