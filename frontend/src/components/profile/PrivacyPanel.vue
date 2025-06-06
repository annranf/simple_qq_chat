<!-- src/components/profile/PrivacyPanel.vue -->
<template>
  <div class="privacy-panel">
    <div class="panel-header">
      <h2>隐私设置</h2>
      <p>管理您的隐私偏好和可见性设置</p>
    </div>

    <!-- 在线状态设置 -->
    <el-card class="status-card">
      <div class="status-section">
        <h3>在线状态</h3>
        <p class="section-description">
          控制其他用户是否能看到您的在线状态和最后上线时间
        </p>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">显示在线状态</div>
            <div class="setting-description">
              允许其他用户看到您当前是否在线
            </div>
          </div>
          <el-switch
            v-model="privacySettings.showOnlineStatus"
            @change="handleSettingChange"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">显示最后上线时间</div>
            <div class="setting-description">
              允许其他用户看到您最后一次上线的时间
            </div>
          </div>
          <el-switch
            v-model="privacySettings.showLastSeen"
            @change="handleSettingChange"
            :disabled="!privacySettings.showOnlineStatus"
          />
        </div>
      </div>
    </el-card>

    <!-- 好友设置 -->
    <el-card class="friends-card">
      <div class="friends-section">
        <h3>好友设置</h3>
        <p class="section-description">
          管理谁可以向您发送好友请求和消息
        </p>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">允许陌生人添加好友</div>
            <div class="setting-description">
              任何人都可以向您发送好友请求
            </div>
          </div>
          <el-switch
            v-model="privacySettings.allowStrangerFriendRequest"
            @change="handleSettingChange"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">自动同意好友请求</div>
            <div class="setting-description">
              自动接受所有好友请求，无需手动确认
            </div>
          </div>
          <el-switch
            v-model="privacySettings.autoAcceptFriendRequest"
            @change="handleSettingChange"
            :disabled="!privacySettings.allowStrangerFriendRequest"
          />
        </div>
      </div>
    </el-card>

    <!-- 消息设置 -->
    <el-card class="message-card">
      <div class="message-section">
        <h3>消息设置</h3>
        <p class="section-description">
          控制消息通知和已读回执
        </p>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">显示已读回执</div>
            <div class="setting-description">
              让发送方知道您已经阅读了他们的消息
            </div>
          </div>
          <el-switch
            v-model="privacySettings.showReadReceipts"
            @change="handleSettingChange"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">显示正在输入</div>
            <div class="setting-description">
              当您正在输入消息时，让对方看到提示
            </div>
          </div>
          <el-switch
            v-model="privacySettings.showTypingIndicator"
            @change="handleSettingChange"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">消息预览</div>
            <div class="setting-description">
              在通知中显示消息内容预览
            </div>
          </div>
          <el-switch
            v-model="privacySettings.showMessagePreview"
            @change="handleSettingChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 搜索设置 -->
    <el-card class="search-card">
      <div class="search-section">
        <h3>搜索设置</h3>
        <p class="section-description">
          控制其他用户是否可以通过搜索找到您
        </p>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">允许通过用户名搜索</div>
            <div class="setting-description">
              其他用户可以通过您的用户名找到您
            </div>
          </div>
          <el-switch
            v-model="privacySettings.allowSearchByUsername"
            @change="handleSettingChange"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">允许通过昵称搜索</div>
            <div class="setting-description">
              其他用户可以通过您的昵称找到您
            </div>
          </div>
          <el-switch
            v-model="privacySettings.allowSearchByNickname"
            @change="handleSettingChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 群组设置 -->
    <el-card class="group-card">
      <div class="group-section">
        <h3>群组设置</h3>
        <p class="section-description">
          管理群组相关的隐私设置
        </p>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">允许被邀请加入群组</div>
            <div class="setting-description">
              其他用户可以邀请您加入群组
            </div>
          </div>
          <el-switch
            v-model="privacySettings.allowGroupInvitation"
            @change="handleSettingChange"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">自动接受群组邀请</div>
            <div class="setting-description">
              自动接受好友发出的群组邀请
            </div>
          </div>
          <el-switch
            v-model="privacySettings.autoAcceptGroupInvitation"
            @change="handleSettingChange"
            :disabled="!privacySettings.allowGroupInvitation"
          />
        </div>
      </div>
    </el-card>

    <!-- 数据设置 -->
    <el-card class="data-card">
      <div class="data-section">
        <h3>数据设置</h3>
        <p class="section-description">
          管理您的数据和隐私
        </p>

        <div class="data-actions">
          <div class="action-item">
            <div class="action-info">
              <div class="action-title">下载我的数据</div>
              <div class="action-description">
                下载您在此应用中的所有数据副本
              </div>
            </div>
            <el-button 
              @click="handleDownloadData"
              :loading="downloadingData"
            >
              下载数据
            </el-button>
          </div>

          <div class="action-item">
            <div class="action-info">
              <div class="action-title">清除聊天记录</div>
              <div class="action-description">
                清除所有聊天记录，此操作不可恢复
              </div>
            </div>
            <el-button 
              type="warning"
              @click="handleClearChatHistory"
              :loading="clearingHistory"
            >
              清除记录
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 保存按钮 -->
    <div class="save-section">
      <el-button 
        type="primary" 
        size="large"
        @click="saveSettings"
        :loading="savingSettings"
      >
        保存设置
      </el-button>
      <el-button 
        size="large"
        @click="resetSettings"
      >
        重置为默认
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { User } from '../../types'

interface Props {
  user: User | null
}

const props = defineProps<Props>()

const savingSettings = ref(false)
const downloadingData = ref(false)
const clearingHistory = ref(false)

// 隐私设置
const privacySettings = reactive({
  // 在线状态
  showOnlineStatus: true,
  showLastSeen: true,
  
  // 好友设置
  allowStrangerFriendRequest: true,
  autoAcceptFriendRequest: false,
  
  // 消息设置
  showReadReceipts: true,
  showTypingIndicator: true,
  showMessagePreview: true,
  
  // 搜索设置
  allowSearchByUsername: true,
  allowSearchByNickname: true,
  
  // 群组设置
  allowGroupInvitation: true,
  autoAcceptGroupInvitation: false
})

// 默认设置
const defaultSettings = {
  showOnlineStatus: true,
  showLastSeen: true,
  allowStrangerFriendRequest: true,
  autoAcceptFriendRequest: false,
  showReadReceipts: true,
  showTypingIndicator: true,
  showMessagePreview: true,
  allowSearchByUsername: true,
  allowSearchByNickname: true,
  allowGroupInvitation: true,
  autoAcceptGroupInvitation: false
}

// 设置项变化时的处理
const handleSettingChange = () => {
  // 这里可以添加实时保存逻辑，或者等用户点击保存按钮
  console.log('Setting changed:', privacySettings)
}

// 保存设置
const saveSettings = async () => {
  try {
    savingSettings.value = true
    
    // 这里应该调用API保存设置
    // 由于后端还没有实现隐私设置API，暂时模拟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 保存到本地存储作为临时方案
    localStorage.setItem('privacySettings', JSON.stringify(privacySettings))
    
    ElMessage.success('隐私设置已保存')
    
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    savingSettings.value = false
  }
}

// 重置设置
const resetSettings = () => {
  Object.assign(privacySettings, defaultSettings)
  ElMessage.info('设置已重置为默认值')
}

// 下载数据
const handleDownloadData = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将生成包含您所有数据的文件并下载到您的设备上。确认继续吗？',
      '下载数据',
      {
        confirmButtonText: '确认下载',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    downloadingData.value = true
    
    // 这里应该调用API生成并下载数据
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 模拟下载
    const dataToDownload = {
      user: props.user,
      settings: privacySettings,
      exportDate: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    
    URL.revokeObjectURL(url)
    
    ElMessage.success('数据下载完成')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('下载数据失败:', error)
      ElMessage.error('下载失败，请重试')
    }
  } finally {
    downloadingData.value = false
  }
}

// 清除聊天记录
const handleClearChatHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将清除您的所有聊天记录，包括文本消息、图片、文件等。此操作不可恢复，确认继续吗？',
      '清除聊天记录',
      {
        confirmButtonText: '确认清除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    // 二次确认
    await ElMessageBox.confirm(
      '您确定要清除所有聊天记录吗？此操作将无法撤销！',
      '最终确认',
      {
        confirmButtonText: '确认清除',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )

    clearingHistory.value = true
    
    // 这里应该调用API清除聊天记录
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('聊天记录已清除')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清除聊天记录失败:', error)
      ElMessage.error('清除失败，请重试')
    }
  } finally {
    clearingHistory.value = false
  }
}

// 初始化设置
onMounted(() => {
  // 从本地存储加载设置
  const savedSettings = localStorage.getItem('privacySettings')
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings)
      Object.assign(privacySettings, parsed)
    } catch (error) {
      console.error('加载隐私设置失败:', error)
    }
  }
})
</script>

<style scoped>
.privacy-panel {
  max-width: 800px;
}

.panel-header {
  margin-bottom: 24px;
}

.panel-header h2 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
  font-size: 24px;
  font-weight: 600;
}

.panel-header p {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.status-card,
.friends-card,
.message-card,
.search-card,
.group-card,
.data-card {
  margin-bottom: 24px;
}

.status-section h3,
.friends-section h3,
.message-section h3,
.search-section h3,
.group-section h3,
.data-section h3 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 600;
}

.section-description {
  margin: 0 0 24px 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.5;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
  margin-right: 20px;
}

.setting-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.setting-description {
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.4;
}

.data-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.action-item:hover {
  border-color: var(--el-border-color-hover);
  background-color: var(--el-fill-color-light);
}

.action-info {
  flex: 1;
  margin-right: 20px;
}

.action-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.action-description {
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.4;
}

.save-section {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 24px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .setting-info {
    margin-right: 0;
  }
  
  .action-item {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .action-info {
    margin-right: 0;
  }
  
  .save-section {
    flex-direction: column;
  }
}
</style>
