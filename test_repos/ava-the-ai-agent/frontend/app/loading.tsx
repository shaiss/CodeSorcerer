export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-electric-purple border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-white/80 text-lg animate-pulse">Loading Ava the AI agent...</p>
      </div>
    </div>
  );
}
