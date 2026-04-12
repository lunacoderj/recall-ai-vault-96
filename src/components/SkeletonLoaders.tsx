import { motion } from "framer-motion";

const shimmer =
  "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent";

const RecordCardSkeleton = () => (
  <div className={`rounded-xl border border-border bg-card p-5 ${shimmer}`}>
    <div className="flex items-center gap-2 mb-3">
      <div className="h-5 w-16 rounded-full bg-secondary animate-pulse" />
    </div>
    <div className="h-5 w-3/4 rounded bg-secondary animate-pulse mb-2" />
    <div className="h-4 w-full rounded bg-secondary/60 animate-pulse mb-3" />
    <div className="h-3 w-24 rounded bg-secondary/40 animate-pulse" />
  </div>
);

const ProfileSkeleton = () => (
  <div className={`rounded-xl border border-border bg-card p-6 ${shimmer}`}>
    <div className="flex items-center gap-4 mb-4">
      <div className="h-16 w-16 rounded-full bg-secondary animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-32 rounded bg-secondary animate-pulse" />
        <div className="h-4 w-48 rounded bg-secondary/60 animate-pulse" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 w-full rounded bg-secondary/40 animate-pulse" />
      <div className="h-4 w-2/3 rounded bg-secondary/40 animate-pulse" />
    </div>
  </div>
);

const FriendCardSkeleton = () => (
  <div className={`rounded-xl border border-border bg-card p-4 flex items-center gap-3 ${shimmer}`}>
    <div className="h-10 w-10 rounded-full bg-secondary animate-pulse shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-4 w-24 rounded bg-secondary animate-pulse" />
      <div className="h-3 w-36 rounded bg-secondary/60 animate-pulse" />
    </div>
    <div className="h-8 w-16 rounded-lg bg-secondary animate-pulse" />
  </div>
);

interface SkeletonGridProps {
  count?: number;
  type?: "record" | "profile" | "friend";
}

const SkeletonGrid = ({ count = 6, type = "record" }: SkeletonGridProps) => {
  const Component =
    type === "profile"
      ? ProfileSkeleton
      : type === "friend"
        ? FriendCardSkeleton
        : RecordCardSkeleton;

  return (
    <div
      className={
        type === "friend"
          ? "space-y-3"
          : "grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <Component />
        </motion.div>
      ))}
    </div>
  );
};

export { RecordCardSkeleton, ProfileSkeleton, FriendCardSkeleton, SkeletonGrid };
export default SkeletonGrid;
