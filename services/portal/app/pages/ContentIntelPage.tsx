"use client";

import { useEffect, useState } from "react";
import {
  fetchCreators,
  fetchContentIdeas,
  updateIdeaStatus,
  Creator,
  ContentIdea,
} from "../lib/api";
import { TrendingUp, Users, CheckCircle, XCircle, Clock } from "lucide-react";

export default function ContentIntelPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"score" | "date">("score");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">(
    "all"
  );

  useEffect(() => {
    async function loadData() {
      try {
        const [creatorsData, ideasData] = await Promise.all([
          fetchCreators(),
          fetchContentIdeas(),
        ]);
        setCreators(creatorsData);
        setIdeas(ideasData);
      } catch (error) {
        console.error("Failed to load content intel data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleIdeaAction(id: string, action: "approved" | "rejected") {
    try {
      await updateIdeaStatus(id, action);
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === id ? { ...idea, status: action } : idea))
      );
    } catch (error) {
      console.error("Failed to update idea:", error);
    }
  }

  const sortedIdeas = [...ideas].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filteredIdeas =
    filterStatus === "all"
      ? sortedIdeas
      : sortedIdeas.filter((idea) => idea.status === filterStatus);

  return (
    <div className="h-full overflow-y-auto p-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white/90">Content Intelligence</h1>
          <p className="text-white/50">Track creators, trends, and content ideas</p>
        </div>

        {loading ? (
          <div className="text-white/50 text-center py-12">Loading...</div>
        ) : (
          <>
            {/* Creators Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white/90 flex items-center gap-2">
                <Users size={20} />
                Tracked Creators
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creators.map((creator) => (
                  <div key={creator.id} className="glass-heavy rounded-panel p-4">
                    <h3 className="text-lg font-semibold text-white/90 mb-2">
                      {creator.name}
                    </h3>
                    <div className="text-sm text-white/50 space-y-1">
                      <div>Platform: {creator.platform}</div>
                      {creator.subscribers && (
                        <div>
                          Subscribers: {creator.subscribers.toLocaleString()}
                        </div>
                      )}
                      {creator.avg_views && (
                        <div>Avg Views: {creator.avg_views.toLocaleString()}</div>
                      )}
                      <div className="text-xs text-white/30 mt-2">
                        Last checked: {new Date(creator.last_checked).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Topics */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white/90 flex items-center gap-2">
                <TrendingUp size={20} />
                Trending Topics
              </h2>
              <div className="glass-heavy rounded-panel p-6">
                <div className="flex flex-wrap gap-2">
                  {["AI", "Developer Tools", "Cloud", "Edge Computing", "Code Review"].map(
                    (topic) => (
                      <div
                        key={topic}
                        className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm"
                      >
                        {topic}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Content Ideas */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white/90">Content Ideas</h2>
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as typeof filterStatus)
                    }
                    className="px-3 py-1 rounded-button bg-white/5 border border-white/10 text-sm text-white/90"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-1 rounded-button bg-white/5 border border-white/10 text-sm text-white/90"
                  >
                    <option value="score">Sort by Score</option>
                    <option value="date">Sort by Date</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {filteredIdeas.map((idea) => (
                  <div key={idea.id} className="glass-heavy rounded-panel p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white/90 mb-2">
                          {idea.title}
                        </h3>
                        <p className="text-sm text-white/50 mb-3">{idea.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {idea.topics.map((topic) => (
                            <span
                              key={topic}
                              className="px-2 py-1 rounded-button bg-white/5 text-xs text-white/70"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-2xl font-bold text-accent mb-1">
                          {idea.score}
                        </div>
                        <div className="text-xs text-white/40">Score</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Clock size={12} />
                        {new Date(idea.created_at).toLocaleDateString()}
                      </div>
                      {idea.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleIdeaAction(idea.id, "approved")}
                            className="px-3 py-1 rounded-button bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm flex items-center gap-1"
                          >
                            <CheckCircle size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleIdeaAction(idea.id, "rejected")}
                            className="px-3 py-1 rounded-button bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm flex items-center gap-1"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            idea.status === "approved"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {idea.status.charAt(0).toUpperCase() + idea.status.slice(1)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
