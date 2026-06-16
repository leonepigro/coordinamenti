export default function SkeletonCard({
  width = "100%",
  height = 120,
  borderRadius = 14,
}: {
  width?: string;
  height?: number;
  borderRadius?: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background:
          "linear-gradient(90deg, var(--sabbia) 25%, var(--bordo) 50%, var(--sabbia) 75%)",
        backgroundSize: "800px 100%",
        animation: "shimmer 1.4s infinite linear",
        flexShrink: 0,
      }}
    />
  );
}
