<script lang="ts" setup>
import { Modal } from '@/types'

const modalStore = useModalStore()

const isModalOpen = computed(() => modalStore.modals[Modal.USDCDetected])

function handleClose() {
  modalStore.closeModal(Modal.USDCDetected)
}
</script>

<template>
  <AppModal :show="isModalOpen" sm @modal:closed="handleClose">
    <template #title>
      <h3>
        {{ $t('trade.usdcLegacyBalanceDetected') }}
      </h3>
    </template>

    <div class="flex flex-col gap-4">
      <span class="text-sm font-semibold">
        {{ $t('trade.haveLegacyUSDC') }}
      </span>
      <NuxtLink
        class="whitespace-nowrap w-full bg-blue-500 text-black rounded"
        :to="{ name: 'account' }"
      >
        <div
          class="flex items-center justify-center py-2 text-blue-900 font-bold"
        >
          {{ $t('trade.viewUSDC') }}
        </div>
      </NuxtLink>
    </div>
  </AppModal>
</template>
