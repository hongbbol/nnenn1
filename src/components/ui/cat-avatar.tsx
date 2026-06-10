type Props = {
  size?: number;
  name?: string;
  /** Tailwind color class or CSS color */
  accent?: string;
  imageSrc?: string | null;
};

export function CatAvatar({
  size = 56,
  name = '?',
  accent = '#D9EEFB',
  imageSrc,
}: Props) {
  if (imageSrc) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-card"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={name}
          style={{ width: size, height: size }}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        background: accent,
        fontSize: size * 0.4,
      }}
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-brand-text"
    >
      {(name || '?').slice(0, 1)}
    </div>
  );
}
