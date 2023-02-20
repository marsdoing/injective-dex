import { INJ_DENOM } from '@injectivelabs/utils'
import { CW20_ADAPTER_CONTRACT_BY_NETWORK } from '@injectivelabs/sdk-ts'
import { Token, TokenType, TokenWithPrice } from '@injectivelabs/token-metadata'
import { INJ_COIN_GECKO_ID, BridgingNetwork } from '@injectivelabs/sdk-ui-ts'
import { getContractAddressesForNetworkOrThrow } from '@injectivelabs/contracts'
import { NETWORK } from '@/app/utils/constants'
import { denomClient } from '@/app/Services'
import { USDCSymbol } from '@/types'

const adapterContract = CW20_ADAPTER_CONTRACT_BY_NETWORK[NETWORK]

export const injToken = {
  denom: INJ_DENOM,
  name: 'Injective',
  symbol: 'INJ',
  decimals: 18,
  logo: '/injective-v3.svg',
  coinGeckoId: INJ_COIN_GECKO_ID,
  tokenType: TokenType.Native,

  erc20: {
    decimals: 18,
    address: getContractAddressesForNetworkOrThrow(NETWORK).injective
  },
  usdPrice: 0
} as TokenWithPrice

interface NetworkToSymbolMap {
  [key: string]: string
}

export const networkToSymbolMap = {
  [BridgingNetwork.Ethereum]: 'ETH',
  [BridgingNetwork.Axelar]: 'AXL',
  [BridgingNetwork.CosmosHub]: 'ATOM',
  [BridgingNetwork.Crescent]: 'CRE',
  [BridgingNetwork.Evmos]: 'EVMOS',
  [BridgingNetwork.Moonbeam]: 'AXL',
  [BridgingNetwork.Osmosis]: 'OSMO',
  [BridgingNetwork.Persistence]: 'XPRT',
  [BridgingNetwork.Secret]: 'SCRT',
  [BridgingNetwork.Stride]: 'STRD'
} as NetworkToSymbolMap

export const getFactoryDenomFromDenom = (address: string): string =>
  `factory/${adapterContract}/${address}`

export const getDenomsFromToken = (token: Token): string[] => {
  const cw20sDenom = (token.cw20s || []).map(({ address }) =>
    getFactoryDenomFromDenom(address)
  )
  const cw20Denom = token.cw20
    ? getFactoryDenomFromDenom(token.cw20.address)
    : ''
  const ibc20Denom = token.ibc ? `ibc/${token.ibc.hash}` : ''
  const peggyDenom = token.erc20 ? `peggy/${token.erc20.address}` : ''

  const denoms = [
    cw20Denom,
    ibc20Denom,
    peggyDenom,
    token.denom,
    ...cw20sDenom
  ].filter((denom) => denom)

  return [...new Set(denoms)]
}

export const getFactoryDenomFromSymbol = (symbol: USDCSymbol) => {
  const tokenMeta = denomClient.getTokenMetaDataBySymbol(symbol)

  if (!tokenMeta || !adapterContract) {
    return ''
  }

  if (tokenMeta.cw20) {
    return getFactoryDenomFromDenom(tokenMeta.cw20.address)
  }

  const cw20TokenMeta = (tokenMeta.cw20s || []).find(
    (cw20) => cw20.symbol.toLowerCase() === symbol.toLowerCase()
  )

  if (!cw20TokenMeta) {
    return ''
  }

  return getFactoryDenomFromDenom(cw20TokenMeta.address)
}

export const getPeggyDenomFromSymbol = (symbol: USDCSymbol) => {
  const tokenMeta = denomClient.getTokenMetaDataBySymbol(symbol)

  if (!tokenMeta || !tokenMeta.erc20) {
    return ''
  }

  return `peggy${tokenMeta.erc20.address.toLowerCase()}`
}

export const usdcTokenDenom = {
  [USDCSymbol.PeggyEthereum]: getPeggyDenomFromSymbol(USDCSymbol.PeggyEthereum),
  [USDCSymbol.WormholeEthereum]: getFactoryDenomFromSymbol(
    USDCSymbol.WormholeEthereum
  ),
  [USDCSymbol.WormholeSolana]: getFactoryDenomFromSymbol(
    USDCSymbol.WormholeSolana
  )
}

export const usdcTokenDenoms = [
  usdcTokenDenom.USDC,
  usdcTokenDenom.USDCet
  // usdcTokenDenom.USDCso
]

export const stableCoinDenoms = ['USDT', 'USDC', 'USDCet', 'USDCso']
