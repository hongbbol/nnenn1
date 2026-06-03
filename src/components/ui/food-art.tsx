type Props = {
  size?: number;
  accent?: string;
  label?: string;
  brand?: string;
  imageSrc?: string | null;
};

export function FoodArt({
  size = 96,
  accent = '#CEE6F7',
  label = '건식',
  brand = '',
  imageSrc,
}: Props) {
  if (imageSrc) {
    return (
      <div
        style={{ width: size, height: size, padding: Math.round(size * 0.06) }}
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-border-soft bg-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={brand}
          className="block max-h-full max-w-full object-contain"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        background: `repeating-linear-gradient(135deg, ${accent} 0 10px, rgba(255,255,255,0.55) 10px 20px)`,
      }}
      className="relative flex shrink-0 items-end justify-start rounded-[18px] border border-border-soft p-2.5"
    >
      <div className="rounded bg-white/85 px-1.5 py-[3px] font-mono text-[10px] font-semibold tracking-wider text-brand-text">
        {label}
      </div>
    </div>
  );
}
