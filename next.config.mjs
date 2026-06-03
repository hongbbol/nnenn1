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
};

export default nextConfig;
