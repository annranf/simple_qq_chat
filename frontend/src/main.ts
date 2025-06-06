import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css' // 引入 Element Plus 样式
import App from './App.vue'
// 如果使用 Vue Router
import router from './router'
// 如果使用 Pinia
import { createPinia } from 'pinia'

const app = createApp(App)

app.use(ElementPlus)
app.use(createPinia()) // 启用 Pinia
app.use(router)      // 启用 Vue Router

app.mount('#app')