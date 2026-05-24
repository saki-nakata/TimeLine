import { useEffect, useRef, useState } from 'react';
import { userService } from '../services/user';
import type { UserProfileResponse } from '../types/user';

interface ProfileEditModalProps {
  profile: UserProfileResponse;
  onClose: () => void;
  onUpdated: (updated: UserProfileResponse) => void;
}

const MAX_USERNAME = 50;
const MAX_DISPLAY_NAME = 100;
const MAX_BIO = 160;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{1,50}$/;

export default function ProfileEditModal({ profile, onClose, onUpdated }: ProfileEditModalProps) {
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [usernameError, setUsernameError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (value && !USERNAME_PATTERN.test(value)) {
      setUsernameError('半角英数字・アンダースコアのみ、50文字以内で入力してください');
    } else {
      setUsernameError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || usernameError) return;
    setSubmitting(true);
    try {
      let updated: UserProfileResponse;

      const res = await userService.updateProfile(profile.id, {
        username: username !== profile.username ? username : undefined,
        displayName: displayName || undefined,
        bio: bio || undefined,
      });
      updated = res.data;

      if (avatarFile) {
        const avatarRes = await userService.uploadAvatar(profile.id, avatarFile);
        updated = avatarRes.data;
      }

      onUpdated(updated);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const currentAvatar = avatarPreview ?? profile.avatarUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="プロフィールを編集"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#0f1419]">プロフィールを編集</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* アイコン */}
          <div className="flex items-center gap-4">
            <div
              className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 cursor-pointer flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              {currentAvatar ? (
                <img src={currentAvatar} alt="アイコン" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-bold">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-bold">変更</span>
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-[#1d9bf0] hover:underline font-medium"
              >
                画像を変更
              </button>
              <p className="text-xs text-gray-400 mt-1">JPEG / PNG / GIF / WebP、最大5MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* ユーザー名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー名</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                maxLength={MAX_USERNAME}
                className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0]"
              />
            </div>
            {usernameError && (
              <p className="text-xs text-red-500 mt-0.5">{usernameError}</p>
            )}
            <p className="text-xs text-gray-400 text-right mt-0.5">
              {username.length} / {MAX_USERNAME}
            </p>
          </div>

          {/* 表示名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">表示名</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={MAX_DISPLAY_NAME}
              placeholder={profile.username}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0]"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">
              {displayName.length} / {MAX_DISPLAY_NAME}
            </p>
          </div>

          {/* 自己紹介 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">自己紹介</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={MAX_BIO}
              placeholder="自己紹介を入力してください"
              className="w-full resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0]"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">
              {bio.length} / {MAX_BIO}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-bold text-[#0f1419]"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting || !!usernameError}
              className="rounded-full bg-[#0f1419] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
