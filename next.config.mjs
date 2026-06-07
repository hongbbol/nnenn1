/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  // typedRoutes는 M1에서 라우트 채워진 뒤 켭니다.
  typedRoutes: false,
  experimental: {
    // 온보딩 완료 시 고양이 사진 base64 dataURL을 Server Action 인자로 전달한다.
    // 압축 후 ~1.5MB + base64 오버헤드 → 기본 1MB 한도를 넘으므로 상향.
    serverActions: { bodySizeLimit: '3mb' },
  },
};

export default nextConfig;
