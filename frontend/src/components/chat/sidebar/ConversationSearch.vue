<template>
  <div class="conversation-search">
    <el-input
      v-model="searchQuery"
      placeholder="搜索联系人或群组"
      :prefix-icon="Search"
      clearable
      @input="handleSearch"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'

const searchQuery = ref('')

const handleSearch = () => {
  // TODO: 实现搜索逻辑，可能会过滤 ConversationList 的数据源
  console.log('Searching for:', searchQuery.value)
}
</script>

<style scoped>
.conversation-search {
  padding: 8px 0px 8px 0px; /* 上下留白 */
}
</style>