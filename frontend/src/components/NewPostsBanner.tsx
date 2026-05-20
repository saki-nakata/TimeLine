interface NewPostsBannerProps {
  count: number;
  onClick: () => void;
}

export default function NewPostsBanner({ count, onClick }: NewPostsBannerProps) {
  if (count === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <button
        onClick={onClick}
        className="pointer-events-auto flex items-center gap-2 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg transition-colors"
      >
        <span>{count}件の新しい投稿 ↑</span>
      </button>
    </div>
  );
}
