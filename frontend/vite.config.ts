import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';

export default defineConfig({

   assetsInclude: ['**/*.wasm'],
   
  plugins: [

    react(),

    glsl({
      include: '**/*.glsl',  // also supports .vert and .frag automatically
    }),

  ],


  server: {
    proxy: {
      // Proxy all requests starting with /api to the Flask server
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  },
});



