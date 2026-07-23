"use client";

type SocialPost = {
  id: string;
  platform: "instagram" | "facebook";
  postType: "feed" | "story" | "reels";
  status: "scheduled" | "posting" | "posted" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

const PLATFORM_LABELS: Record<SocialPost["platform"], string> = { instagram: "Instagram", facebook: "Facebook" };
const POST_TYPE_LABELS: Record<SocialPost["postType"], string> = { feed: "Gönderi", story: "Story", reels: "Reels" };

export function SocialPostsPanel({
  posts,
  onRetry,
  retrying,
}: {
  posts: SocialPost[];
  onRetry: () => void;
  retrying: boolean;
}) {
  if (posts.length === 0) return null;

  const anyFailed = posts.some((p) => p.status === "failed");

  return (
    <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
      <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>Sosyal Medya Paylaşımları</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {posts.map((post) => (
          <div key={post.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
            <span className="badge">
              {PLATFORM_LABELS[post.platform]} · {POST_TYPE_LABELS[post.postType]}
            </span>
            {post.status === "posted" && <span style={{ color: "var(--success)" }}>paylaşıldı</span>}
            {post.status === "failed" && <span style={{ color: "var(--danger)" }}>{post.errorMessage}</span>}
            {(post.status === "posting" || post.status === "scheduled") && (
              <span style={{ color: "var(--muted)" }}>{post.status === "posting" ? "paylaşılıyor…" : "zamanlandı"}</span>
            )}
          </div>
        ))}
      </div>
      {anyFailed && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: "0.75rem" }}
          disabled={retrying}
          onClick={onRetry}
        >
          Başarısız Paylaşımları Tekrar Dene
        </button>
      )}
    </div>
  );
}
