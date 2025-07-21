import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '7860',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
    allowedDevOrigins: ['https://*.cloudworkstations.dev'],
  },
};

export default nextConfig;
