<script lang="ts" setup>
import { PropType } from 'vue'
import { Status, StatusType } from '@injectivelabs/utils'
import {
  UiDerivativeMarketWithToken,
  MarketType
} from '@injectivelabs/sdk-ui-ts'
import { GeneralException } from '@injectivelabs/exceptions'
import { UIDerivativeOrder } from '@/types'

const FilterList = {
  OpenPositions: 'OpenPositions',
  OpenOrders: 'OpenOrders',
  Triggers: 'Triggers',
  OrderHistory: 'OrderHistory',
  TradeHistory: 'TradeHistory'
}

const derivativeStore = useDerivativeStore()
const positionStore = usePositionStore()
const { $onError } = useNuxtApp()
const { t } = useLang()
const { success } = useNotifications()

const props = defineProps({
  filterByCurrentMarket: Boolean,

  market: {
    type: Object as PropType<UiDerivativeMarketWithToken>,
    required: true
  },

  status: {
    type: Object as PropType<Status>,
    required: true
  }
})

const emit = defineEmits<{
  (e: 'update:filterByCurrentMarket', state: boolean): void
}>()

const actionStatus = reactive(new Status(StatusType.Idle))
const activeType = ref(FilterList.OpenOrders)

const filteredConditionalOrders = computed(() => {
  return derivativeStore.subaccountConditionalOrders.filter((order) => {
    if (props.market.subType !== MarketType.BinaryOptions) {
      return derivativeStore.markets.some(
        (market) => market.marketId === order.marketId
      )
    }

    return derivativeStore.binaryOptionsMarkets.some(
      (market) => market.marketId === order.marketId
    )
  })
})

const filteredOrders = computed(() => {
  return derivativeStore.subaccountOrders.filter((order) => {
    if (props.market.subType !== MarketType.BinaryOptions) {
      return derivativeStore.markets.some(
        (market) => market.marketId === order.marketId
      )
    }

    return derivativeStore.binaryOptionsMarkets.some(
      (market) => market.marketId === order.marketId
    )
  })
})

const filteredPositions = computed(() => {
  const result = positionStore.subaccountPositions.filter((position) => {
    return !!derivativeStore.markets.find(
      (m) => m.marketId === position.marketId
    )
  })

  return result.filter((position) => {
    if (props.market.subType !== MarketType.BinaryOptions) {
      return position
    }

    return derivativeStore.binaryOptionsMarkets.some(
      (market) => market.marketId === position.marketId
    )
  })
})

const orders = computed<UIDerivativeOrder[]>(() =>
  activeType.value === FilterList.OpenOrders
    ? derivativeStore.subaccountOrders
    : filteredOrders.value
)

const checked = computed({
  get: (): boolean => props.filterByCurrentMarket,
  set: (value: boolean) => {
    emit('update:filterByCurrentMarket', value)
  }
})

onMounted(() => {
  if (positionStore.subaccountPositions.length > 0) {
    activeType.value = FilterList.OpenPositions
  } else if (derivativeStore.subaccountOrders.length > 0) {
    activeType.value = FilterList.OpenOrders
  }
})

function handleCancelAllClick() {
  actionStatus.setLoading()

  const action =
    orders.value.length === 1
      ? derivativeStore.cancelOrder(orders.value[0])
      : derivativeStore.batchCancelOrder(orders.value)

  action
    .then(() => {
      success({ title: t('trade.orders_cancelled') })
    })
    .catch($onError)
    .finally(() => {
      actionStatus.setIdle()
    })
}

function closeAllPositions(): Promise<void> {
  return positionStore.closeAllPosition(filteredPositions.value)
}

function closePosition(): Promise<void> {
  const [position] = filteredPositions.value
  const market = derivativeStore.markets.find(
    (m) => m.marketId === position.marketId
  )

  if (!market) {
    return Promise.reject(
      new GeneralException(
        Error(
          t('trade.position_market_not_found', {
            marketId: position.marketId
          })
        )
      )
    )
  }

  return positionStore.closePosition({
    position,
    market
  })
}

function handleCloseAllPositionsClick() {
  actionStatus.setLoading()

  const action =
    filteredPositions.value.length === 1 ? closePosition : closeAllPositions

  action()
    .then(() => {
      success({ title: t('trade.positions_closed') })
    })
    .catch($onError)
    .finally(() => {
      actionStatus.setIdle()
    })
}
</script>

<template>
  <CommonCardTableWrap>
    <template #actions>
      <div class="col-span-12 lg:col-span-7 xl:col-span-8 m-4 lg:mx-0">
        <div
          class="flex items-center justify-between lg:justify-start gap-2 ml-2 flex-wrap"
        >
          <template
            v-for="(filterType, index) in Object.values(FilterList)"
            :key="`derivative-orders-type-${filterType}`"
          >
            <AppSelectButton v-model="activeType" :value="filterType">
              <template #default="{ active }">
                <span
                  class="uppercase text-xs font-semibold whitespace-nowrap overflow-ellipsis"
                  :class="[active ? 'text-blue-500' : 'text-gray-500']"
                >
                  <span v-if="filterType === FilterList.OpenPositions">
                    {{ $t('activity.openPositions') }}
                    {{ `(${filteredPositions.length})` }}
                  </span>

                  <span v-if="filterType === FilterList.OpenOrders">
                    {{ $t('activity.openOrders') }}
                    {{ `(${filteredOrders.length})` }}
                  </span>

                  <span v-if="filterType === FilterList.Triggers">
                    {{ $t('activity.triggers') }}
                    {{ `(${filteredConditionalOrders.length})` }}
                  </span>

                  <span v-if="filterType === FilterList.TradeHistory">
                    {{ $t('activity.tradeHistory') }}
                  </span>

                  <span v-if="filterType === FilterList.OrderHistory">
                    {{ $t('activity.orderHistory') }}
                  </span>
                </span>
              </template>
            </AppSelectButton>

            <CommonSeparator
              v-if="index !== Object.values(FilterList).length - 1"
            />
          </template>
        </div>
      </div>

      <div
        class="col-span-12 lg:col-span-5 xl:col-span-4 mx-4 mb-4 flex items-center justify-between lg:justify-end lg:ml-0 lg:mr-2 lg:mt-4"
      >
        <AppCheckbox
          v-if="market"
          v-model="checked"
          data-cy="trade-page-filter-by-ticker-checkbox"
          class="lg:mr-4"
        >
          {{ $t('trade.asset_only', { asset: market.ticker }) }}
        </AppCheckbox>

        <AppButton
          v-if="
            [FilterList.OpenOrders, FilterList.Triggers].includes(activeType) &&
            orders.length > 0
          "
          class="bg-red-500 bg-opacity-10 text-red-500 hover:text-white"
          xs
          :status="actionStatus"
          data-cy="trade-page-cancel-all-button"
          @click="handleCancelAllClick"
        >
          {{ $t('trade.cancelAllOrders') }}
        </AppButton>

        <AppButton
          v-if="
            activeType === FilterList.OpenPositions &&
            filteredPositions.length > 0
          "
          xs
          :status="actionStatus"
          data-cy="trade-page-cancel-all-button"
          class="bg-red-500 bg-opacity-10 text-red-500 hover:text-white"
          @click="handleCloseAllPositionsClick"
        >
          {{ $t('trade.closeAllPositions') }}
        </AppButton>
      </div>
    </template>

    <AppHocLoading class="h-full" :status="status">
      <CommonCard class="h-full">
        <PartialsCommonSubaccountTradeHistory
          v-if="activeType === FilterList.TradeHistory"
          :market="market"
        />

        <PartialsCommonSubaccountOrder
          v-else-if="activeType === FilterList.OpenOrders"
          :market="market"
        />

        <PartialsCommonSubaccountTrigger
          v-else-if="activeType === FilterList.Triggers"
        />

        <PartialsCommonSubaccountOrderHistory
          v-else-if="activeType === FilterList.OrderHistory"
          :market="market"
        />

        <PartialsCommonSubaccountPosition
          v-else-if="activeType === FilterList.OpenPositions"
          :market="market"
        />
      </CommonCard>
    </AppHocLoading>
  </CommonCardTableWrap>
</template>
