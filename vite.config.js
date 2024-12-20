import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Custom plugin to copy files after build
const copyManifestFiles = () => {
  return {
    name: 'copy-manifest-files',
    closeBundle() {
      // Create dist/icons directory if it doesn't exist
      if (!existsSync('dist/icons')) {
        mkdirSync('dist/icons', { recursive: true });
      }

      // Copy manifest and other files
      copyFileSync('manifest.json', 'dist/manifest.json');
      copyFileSync('privacy_policy.md', 'dist/privacy_policy.md');
      
      // Copy icons
      const iconSizes = ['16', '48', '64', '128'];
      iconSizes.forEach(size => {
        try {
          copyFileSync(
            `icons/icon${size}.png`, 
            `dist/icons/icon${size}.png`
          );
        } catch (e) {
          console.log(`Warning: icon${size}.png not found in icons folder`);
        }
      });
    }
  };
};

export default defineConfig({
  plugins: [
    react(),
    copyManifestFiles()
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        background: resolve(__dirname, 'src/background.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? 'background.js' : '[name].[hash].js';
        },
        chunkFileNames: '[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.html')) {
            return '[name][extname]';
          }
          return '[name].[hash][extname]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}); 