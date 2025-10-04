"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  PieChart,
  Plus,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  LogOut,
  X,
  AlertCircle,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";

// ---------------- Types ----------------
type Member = {
  id: number;
  name: string;
  shares: number; // number of shares (can be fractional)
  initialInvestment: number; // sum of deposits made by this member
};

type PoolData = {
  currentValue: number; // total pool USD/USDT value
  totalShares: number;
  members: Member[];
};

type NewMember = {
  name: string;
  investment: string; // keep as string for controlled input
};

type TransactionType = "deposit" | "withdraw" | null;

// ---------------- Helpers ----------------
const safeRound = (n: number, digits = 2) => {
  if (!isFinite(n) || isNaN(n)) return 0;
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
};

const formatMoney = (n: number) => {
  return (isFinite(n) ? n : 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ---------------- Component ----------------
export default function InvestmentPoolTracker() {
  const { data: session, status } = useSession();
  const [poolData, setPoolData] = useState<PoolData>({
    currentValue: 0,
    totalShares: 0,
    members: [],
  });

  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState<NewMember>({
    name: "",
    investment: "",
  });
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [showTransaction, setShowTransaction] = useState<TransactionType>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------------- Fetch Pool Data on Mount ----------------
  const fetchPoolData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/pool");
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Failed to fetch" }));
        throw new Error(err.message || "Failed to fetch pool data");
      }
      const response = await res.json();

      // Expect response in shape { success: boolean, data: { totalPool, members: [{ id, name, shares, contribution|initialInvestment }]}}
      if (response && response.success && response.data) {
        const apiData = response.data;
        const membersFromApi = Array.isArray(apiData.members)
          ? apiData.members
          : [];

        const transformed: PoolData = {
          currentValue: Number(apiData.totalPool) || 0,
          totalShares:
            membersFromApi.reduce(
              (sum: number, m: unknown) => sum + Number(m.shares || 0),
              0
            ) || 0,
          members: membersFromApi.map((m: unknown, index: number) => ({
            id: Number(m.id ?? index + 1),
            name: String(m.name ?? "Unknown"),
            shares: Number(m.shares ?? 0),
            initialInvestment: Number(
              m.contribution ?? m.initialInvestment ?? 0
            ),
          })),
        };

        if (mountedRef.current) setPoolData(transformed);
      } else if (response && response.data) {
        // fallback if success flag missing
        if (mountedRef.current) setPoolData(response.data as PoolData);
      }
    } catch (err: unknown) {
      console.error("Error fetching pool data:", err);
      setErrorMessage(err?.message ?? "Unable to fetch pool data");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoolData();
  }, [fetchPoolData]);

  // ---------------- Utility Functions ----------------
  const calculateSharePrice = useCallback(() => {
    // If there are no shares, define a sensible default price.
    // If pool has value but no shares (edge case), treat price = poolValue (so one share represents full pool) OR default to 1.
    const { currentValue, totalShares } = poolData;
    if (!isFinite(currentValue) || !isFinite(totalShares)) return 1;

    if (totalShares <= 0) {
      // if pool has some value but no shares, choose 1 as share price to allow contributions
      return currentValue > 0 ? currentValue : 1;
    }

    // normal case
    return totalShares === 0 ? 1 : currentValue / totalShares;
  }, [poolData]);

  const getMemberStats = useCallback(
    (member: Member | null) => {
      if (!member)
        return {
          currentValue: 0,
          profit: 0,
          profitPercent: "0.00",
          ownership: "0.00",
          sharePrice: calculateSharePrice(),
        };

      const sharePrice = calculateSharePrice();
      const currentValue = Number(member.shares) * sharePrice;
      const profit = currentValue - Number(member.initialInvestment || 0);
      const profitPercent =
        Number(member.initialInvestment) > 0
          ? (profit / member.initialInvestment) * 100
          : NaN;
      const ownership =
        poolData.totalShares > 0
          ? (member.shares / poolData.totalShares) * 100
          : 0;

      return {
        currentValue: safeRound(currentValue, 2),
        profit: safeRound(profit, 2),
        profitPercent: Number.isFinite(profitPercent)
          ? safeRound(profitPercent, 2).toFixed(2)
          : "—",
        ownership: safeRound(ownership, 2).toFixed(2),
        sharePrice: safeRound(sharePrice, 4),
      } as const;
    },
    [calculateSharePrice, poolData.totalShares]
  );

  // ---------------- Add Member ----------------
  const addMember = useCallback(async () => {
    const name = newMember.name.trim();
    const investment = parseFloat(newMember.investment || "0");

    if (!name) {
      alert("Please enter member name");
      return;
    }

    if (!isFinite(investment) || investment <= 0) {
      alert("Please enter a valid investment amount greater than 0");
      return;
    }

    const sharePrice = calculateSharePrice();
    const sharesToReceive = investment / sharePrice;

    // prepare optimistic update (but we'll refetch after)
    const newId =
      poolData.members.length > 0
        ? Math.max(...poolData.members.map((m) => m.id)) + 1
        : 1;

    // optimistic state change so UI is snappy
    setPoolData((prev) => ({
      currentValue: prev.currentValue + investment,
      totalShares: prev.totalShares + sharesToReceive,
      members: [
        ...prev.members,
        {
          id: newId,
          name,
          shares: sharesToReceive,
          initialInvestment: investment,
        },
      ],
    }));

    setNewMember({ name: "", investment: "" });
    setShowAddMember(false);

    try {
      const res = await fetch("/api/pool/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newId,
          name,
          shares: sharesToReceive,
          initialInvestment: investment,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to add member on server");
      }

      // server should return canonical pool state; if not, just refetch
      await fetchPoolData();
    } catch (err: unknown) {
      console.error("Add member error:", err);
      setErrorMessage(
        "Failed to persist new member on server — changes remain locally."
      );
      // keep optimistic state but still attempt to refetch later
    }
  }, [newMember, poolData.members, calculateSharePrice, fetchPoolData]);

  // ---------------- Delete Member ----------------
  const confirmDeleteMember = (memberId: number) => {
    const member = poolData.members.find((m) => m.id === memberId) ?? null;
    if (!member) return;
    setMemberToDelete(member);
  };

  const deleteMember = useCallback(async () => {
    if (!memberToDelete) return;

    // calculate what we remove from pool value based on member's currentValue
    const stats = getMemberStats(memberToDelete);

    // optimistic update
    setPoolData((prev) => {
      const updatedMembers = prev.members.filter(
        (m) => m.id !== memberToDelete.id
      );
      const newTotalShares = updatedMembers.reduce((s, m) => s + m.shares, 0);
      const newCurrentValue = Math.max(
        0,
        prev.currentValue - stats.currentValue
      );
      return {
        members: updatedMembers,
        totalShares: newTotalShares,
        currentValue: newCurrentValue,
      };
    });

    setMemberToDelete(null);

    try {
      const res = await fetch("/api/pool/delete-member", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberToDelete.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete member on server");
      }

      // server should return updated pool — refresh to be safe
      await fetchPoolData();
    } catch (err: unknown) {
      console.error("Delete member error:", err);
      setErrorMessage(
        "Failed to delete member on server — changes remain locally."
      );
    }
  }, [memberToDelete, fetchPoolData, getMemberStats]);

  // ---------------- Transaction ----------------
  const handleTransaction = useCallback(
    async (type: TransactionType) => {
      if (!type) return;

      const amount = parseFloat(transactionAmount || "0");
      if (!isFinite(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      if (!selectedMember) {
        alert("Please select a member");
        return;
      }

      const member = poolData.members.find((m) => m.id === selectedMember);
      if (!member) {
        alert("Selected member not found");
        return;
      }

      const sharePrice = calculateSharePrice();
      if (!isFinite(sharePrice) || sharePrice <= 0) {
        alert("Invalid share price — cannot proceed");
        return;
      }

      const sharesChange = amount / sharePrice;

      // validate withdraw amount
      const memberStats = getMemberStats(member);
      if (type === "withdraw" && amount > memberStats.currentValue + 1e-9) {
        alert("Insufficient funds to withdraw");
        return;
      }

      // optimistic update
      setPoolData((prev) => {
        const updatedMembers = prev.members.map((m) => {
          if (m.id !== selectedMember) return m;

          if (type === "deposit") {
            return {
              ...m,
              shares: m.shares + sharesChange,
              initialInvestment: m.initialInvestment + amount,
            };
          }

          // withdraw: remove shares proportionally. Reduce initialInvestment proportionally to shares removed if useful.
          const newShares = Math.max(0, m.shares - sharesChange);
          // proportion of shares removed to previous shares
          const removedRatio =
            m.shares > 0 ? (m.shares - newShares) / m.shares : 0;
          const newInitialInvestment = Math.max(
            0,
            m.initialInvestment - m.initialInvestment * removedRatio
          );

          return {
            ...m,
            shares: newShares,
            initialInvestment: newInitialInvestment,
          };
        });

        const newTotalShares = updatedMembers.reduce(
          (s, mm) => s + mm.shares,
          0
        );
        const newCurrentValue =
          type === "deposit"
            ? prev.currentValue + amount
            : Math.max(0, prev.currentValue - amount);

        return {
          members: updatedMembers,
          totalShares: newTotalShares,
          currentValue: newCurrentValue,
        };
      });

      // reset UI inputs
      setTransactionAmount("");
      setShowTransaction(null);
      setSelectedMember(null);

      try {
        const res = await fetch("/api/pool/transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: selectedMember, type, amount }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Transaction failed on server");
        }

        // refresh authoritative state
        await fetchPoolData();
      } catch (err: unknown) {
        console.error("Transaction error:", err);
        setErrorMessage(
          "Transaction failed on server — changes remain locally."
        );
      }
    },
    [
      transactionAmount,
      selectedMember,
      poolData.members,
      calculateSharePrice,
      fetchPoolData,
      getMemberStats,
    ]
  );

  // ---------------- Sign Out Handler ----------------
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // ---------------- Derived values ----------------
  const totalInvested = useMemo(
    () =>
      poolData.members.reduce((sum, m) => sum + (m.initialInvestment || 0), 0),
    [poolData.members]
  );
  const totalProfit = useMemo(
    () => (poolData.currentValue || 0) - totalInvested,
    [poolData.currentValue, totalInvested]
  );
  const profitPercent =
    totalInvested > 0
      ? ((totalProfit / totalInvested) * 100).toFixed(2)
      : "0.00";

  // ---------------- Loading State ----------------
  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading pool data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Investment Pool Manager
            </h1>
            <p className="text-slate-600">
              Professional multi-investor portfolio tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-xl border border-slate-200 hover:border-red-200 transition-all shadow-sm group"
            >
              <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-900">
            {errorMessage}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">
                Pool Value
              </span>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              ${formatMoney(poolData.currentValue)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">
                Total Profit
              </span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">
              ${formatMoney(totalProfit)}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              {profitPercent}% return
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">
                Total Invested
              </span>
              <PieChart className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              ${formatMoney(totalInvested)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">
                Members
              </span>
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {poolData.members.length}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              ${safeRound(calculateSharePrice(), 4).toFixed(4)}/share
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Pool Members</h2>
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium">Add Member</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                    Member
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">
                    Shares
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">
                    Ownership
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">
                    Invested
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">
                    Current Value
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">
                    P/L
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {poolData.members.map((member) => {
                  const stats = getMemberStats(member);
                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {member.name.charAt(0)?.toUpperCase() ?? "U"}
                          </div>
                          <span className="font-semibold text-slate-900">
                            {member.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {safeRound(member.shares, 2).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {stats.ownership}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        ${formatMoney(member.initialInvestment)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">
                        ${formatMoney(stats.currentValue)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div
                          className={`font-semibold ${
                            stats.profit >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ${formatMoney(stats.profit)}
                          <div className="text-xs">{stats.profitPercent}%</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedMember(member.id);
                              setShowTransaction("deposit");
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Deposit"
                          >
                            <ArrowDownCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMember(member.id);
                              setShowTransaction("withdraw");
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Withdraw"
                          >
                            <ArrowUpCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => confirmDeleteMember(member.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Member Modal */}
        {showAddMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Add New Member
                    </h3>
                    <p className="text-sm text-slate-500">
                      Add a new investor to the pool
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMember({ name: "", investment: "" });
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Member Name
                  </label>
                  <input
                    type="text"
                    value={newMember.name}
                    onChange={(e) =>
                      setNewMember((s) => ({ ...s, name: e.target.value }))
                    }
                    className="w-full px-4 py-3 border border-slate-300 text-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter member name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Investment Amount (USDT)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <DollarSign className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      value={newMember.investment}
                      onChange={(e) =>
                        setNewMember((s) => ({
                          ...s,
                          investment: e.target.value,
                        }))
                      }
                      className="w-full pl-11 pr-4 py-3 border text-slate-700 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <PieChart className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-semibold text-slate-900">
                        Investment Summary
                      </div>
                      <div className="space-y-1 text-sm text-slate-600">
                        <div className="flex justify-between">
                          <span>Current share price:</span>
                          <span className="font-semibold text-slate-900">
                            ${safeRound(calculateSharePrice(), 4).toFixed(4)}
                          </span>
                        </div>
                        {newMember.investment &&
                          parseFloat(newMember.investment) > 0 && (
                            <div className="flex justify-between pt-2 border-t border-blue-200">
                              <span>Shares to receive:</span>
                              <span className="font-bold text-blue-600">
                                {safeRound(
                                  parseFloat(newMember.investment) /
                                    calculateSharePrice(),
                                  2
                                ).toFixed(2)}{" "}
                                shares
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 bg-slate-50 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMember({ name: "", investment: "" });
                  }}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={addMember}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Member Confirmation Modal */}
        {memberToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Confirm Deletion
                    </h3>
                    <p className="text-sm text-slate-500">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMemberToDelete(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-slate-700">
                    Are you sure you want to remove{" "}
                    <span className="font-bold text-slate-900">
                      {memberToDelete.name}
                    </span>{" "}
                    from the investment pool?
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="text-sm font-semibold text-slate-900 mb-3">
                    Member Details
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Current Value:</span>
                      <span className="font-semibold text-slate-900">
                        $
                        {formatMoney(
                          getMemberStats(memberToDelete).currentValue
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Shares Owned:</span>
                      <span className="font-semibold text-slate-900">
                        {safeRound(memberToDelete.shares, 2).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Ownership:</span>
                      <span className="font-semibold text-slate-900">
                        {getMemberStats(memberToDelete).ownership}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 bg-slate-50 rounded-b-2xl">
                <button
                  onClick={() => setMemberToDelete(null)}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteMember}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-sm hover:shadow-md"
                >
                  Delete Member
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Modal */}
        {showTransaction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      showTransaction === "deposit"
                        ? "bg-green-100"
                        : "bg-orange-100"
                    }`}
                  >
                    {showTransaction === "deposit" ? (
                      <ArrowDownCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <ArrowUpCircle className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {showTransaction === "deposit"
                        ? "Deposit Funds"
                        : "Withdraw Funds"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {poolData.members.find((m) => m.id === selectedMember)
                        ?.name ?? ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTransaction(null);
                    setSelectedMember(null);
                    setTransactionAmount("");
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {showTransaction === "withdraw" && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-semibold text-orange-900 mb-1">
                          Available Balance
                        </div>
                        <div className="text-orange-700">
                          $
                          {formatMoney(
                            getMemberStats(
                              poolData.members.find(
                                (m) => m.id === selectedMember
                              ) ?? null
                            ).currentValue
                          )}{" "}
                          USDT
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Amount (USDT)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <DollarSign className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {transactionAmount && parseFloat(transactionAmount) > 0 && (
                  <div
                    className={`rounded-xl p-4 border ${
                      showTransaction === "deposit"
                        ? "bg-green-50 border-green-200"
                        : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900 mb-2">
                      Transaction Summary
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Share Price:</span>
                        <span className="font-semibold text-slate-900">
                          ${safeRound(calculateSharePrice(), 4).toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">
                          Shares{" "}
                          {showTransaction === "deposit" ? "Added" : "Removed"}:
                        </span>
                        <span
                          className={`font-bold ${
                            showTransaction === "deposit"
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {showTransaction === "deposit" ? "+" : "-"}
                          {safeRound(
                            parseFloat(transactionAmount) /
                              calculateSharePrice(),
                            2
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 p-6 bg-slate-50 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowTransaction(null);
                    setSelectedMember(null);
                    setTransactionAmount("");
                  }}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTransaction(showTransaction)}
                  className={`flex-1 px-4 py-3 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow-md ${
                    showTransaction === "deposit"
                      ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      : "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
                  }`}
                >
                  {showTransaction === "deposit" ? "Deposit" : "Withdraw"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
