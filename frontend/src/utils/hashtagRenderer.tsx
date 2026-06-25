import type { NavigateFunction } from 'react-router-dom';

const HASHTAG_REGEX = /#([\w぀-鿿]+)/g;

export function renderContentWithHashtags(content: string, navigate: NavigateFunction) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  HASHTAG_REGEX.lastIndex = 0;
  while ((match = HASHTAG_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const tag = match[1];
    parts.push(
      <button
        key={`${tag}-${match.index}`}
        className="text-[#1d9bf0] hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/search?hashtag=${encodeURIComponent(tag)}`);
        }}
      >
        #{tag}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts;
}
