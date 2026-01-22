/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    // Ensure trailing slashes are handled consistently to avoid 404s on Amplify
    trailingSlash: false,
    // Recommended for monorepo and SSR deployments on Amplify
    output: 'standalone',
};

export default nextConfig;
