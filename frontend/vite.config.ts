import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173, // 前端开发服务器端口
    proxy: {
      // 字符串简写写法
      // '/api': 'http://localhost:3000',
      // 选项写法
      '/api': {
        target: 'http://localhost:3000', // 后端服务实际地址
        changeOrigin: true, // Needed for virtual hosted sites
        // rewrite: (path) => path.replace(/^\/api/, '') // 如果后端接口没有 /api 前缀
      },
      '/uploads': { // 如果你需要代理上传文件的访问
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Vite server 不直接处理 ws 代理, WebSocket 连接通常直接写后端 ws 地址
      // 但如果后端 HTTP server 和 WS server 在同一个端口，API 代理就够了
    }
  }
})