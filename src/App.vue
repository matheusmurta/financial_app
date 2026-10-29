<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinanceStore } from '@/stores/finance'
import AppLayout from '@/layouts/AppLayout.vue'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const bare = computed(() => route.meta.bare === true)

watchEffect(() => {
  if (!store.data.settings.onboarded && route.name && route.name !== 'welcome') router.replace('/boas-vindas')
})
</script>

<template>
  <RouterView v-if="bare" />
  <AppLayout v-else>
    <RouterView />
  </AppLayout>
</template>
