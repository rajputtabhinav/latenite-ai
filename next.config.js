/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static page generation completely
  staticPageGenerationTimeout: 0,
  
  // App directory is stable in Next.js 14, no experimental config needed
  webpack: (config, { isServer, dev }) => {
    // Handle ssh2 package and Node.js modules
    if (!isServer) {
      // For client-side, completely ignore Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'ssh2': false,
        'glob': false,  // Server-only for codebase indexing
        fs: false,
        'fs/promises': false,
        net: false,
        tls: false,
        path: false,
        stream: false,
        events: false,
        url: false,
        string_decoder: false,
        crypto: require.resolve('crypto-browserify'),
      }
      
      // Define 'self' for XTerm and other browser libraries during client build
      config.plugins = config.plugins || []
      config.plugins.push(
        new (require('webpack').DefinePlugin)({
          'typeof self': JSON.stringify('object'),
        })
      )
    } else {
      // For server-side, externalize ssh2 and other native modules
      config.externals = config.externals || []
      config.externals.push('ssh2')
      
      // Externalize socket.io-client on server to prevent 'self' errors
      config.externals.push('socket.io-client')
      
      // Externalize XTerm on server (browser-only)
      config.externals.push('@xterm/xterm')
      config.externals.push('@xterm/addon-fit')
      config.externals.push('@xterm/addon-search')
      config.externals.push('@xterm/addon-web-links')
      config.externals.push('@xterm/addon-unicode11')
      config.externals.push('@xterm/addon-serialize')
    }
    
    // Ignore .node files in webpack bundling
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    })
    
    return config
  },
}

module.exports = nextConfig 