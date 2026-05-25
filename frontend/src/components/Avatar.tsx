interface AvatarProps {
  name: string;
  avatarUrl: string | null;
  size?: number;
}

export default function Avatar({ name, avatarUrl, size = 10 }: AvatarProps) {
  const px = size * 4;
  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0"
      style={{ width: px, height: px }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-white font-bold bg-[#1d9bf0]"
          style={{ fontSize: px * 0.4 }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
