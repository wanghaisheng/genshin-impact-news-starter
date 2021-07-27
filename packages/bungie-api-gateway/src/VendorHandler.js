import BungieAPIHandler from './BungieAPIHandler'
import DefinitionHandler from './DefinitionHandler'
import { XUR, ZAVALA, SPIDER, ADA, BANSHEE } from './Hashes'

export default class VendorHandler {
  async init(bungieApiEnv) {
    this.bungieAPIHandler = new BungieAPIHandler()
    await this.bungieAPIHandler.init(bungieApiEnv)
    this.definitionHandler = new DefinitionHandler()
    await this.definitionHandler.init(bungieApiEnv)
  }

  // TODO: This function is fairly gnarly, split out some of the item sales code it's own module
  async getVendorLiveData(hash, components = ['Vendors', 'VendorSales']) {
    let response = await this.bungieAPIHandler.callApi({
      path: `/Destiny2/${this.bungieAPIHandler.membershipType}/Profile/${this.bungieAPIHandler.membershipId}/Character/${this.bungieAPIHandler.characterId}/Vendors/`,
      components,
      method: 'GET',
    })
    if (response.Message !== 'Ok') {
      throw new Error(`Failed to get vendors with error: ${response.Message}`)
    }
    const vendor = response.Response.vendors.data[hash]
    const saleObject = response.Response.sales.data[hash].saleItems
    let sales = []
    if (saleObject) {
      const saleItems = Object.values(saleObject)
      const itemHashes = saleItems.map((sale) => sale.itemHash)

      const items = await this.definitionHandler.getInventoryItems(
        ...itemHashes
      )

      sales = await Promise.all(
        items.map(async (item) => {
          const sale = saleItems.find((i) => i.itemHash === item.hash)

          const classType = await this.definitionHandler.getCharacterClass(
            item.classType
          )

          const damageType = await this.definitionHandler.getDamageType(
            item.defaultDamageTypeHash
          )

          let costs = []
          if (sale.costs) {
            costs = await this.definitionHandler.getSaleItemCosts(sale.costs)
          }

          return { ...sale, ...item, classType, damageType, costs }
        })
      )
    }
    return { ...vendor, sales }
  }

  async getVendorByHash(hash) {
    try {
      const vendorLiveData = await this.getVendorLiveData(hash)
      const vendorStaticData = await this.definitionHandler.getVendor(hash)

      // TODO: Bungie's API is wrong. Xur does not show up at 4AM... so we need to adjust that to make sure Twitter
      // stuff works correctly... (https://github.com/Bungie-net/api/issues/353)
      let nextRefreshDate = vendorLiveData.nextRefreshDate
      if (hash === XUR) {
        const nextRefreshDateXur = new Date(nextRefreshDate)
        nextRefreshDateXur.setUTCHours(17)
        nextRefreshDate = nextRefreshDateXur.toISOString()
      }
      const lastRefreshDate = this.getVendorLastRefreshDate(
        hash,
        nextRefreshDate
      )

      if (vendorLiveData && vendorStaticData) {
        return {
          ...vendorStaticData,
          ...vendorLiveData,
          lastRefreshDate,
          nextRefreshDate,
        }
      }
      throw new Error('Vendor hash id not found.')
    } catch (e) {
      throw new Error(`Error in 'getVendorByHash [${hash}]: ${e}`)
    }
  }

  getVendorLastRefreshDate(hash, nextRefreshDate) {
    const lastRefreshDate = new Date(nextRefreshDate)
    const refreshIntervalMap = {
      [BANSHEE]: 1,
      [XUR]: 7,
      [ADA]: 7,
      [SPIDER]: 7,
      [ZAVALA]: 7,
    }
    const refreshInterval = refreshIntervalMap[hash] || 1
    const currentDate = new Date()
    // This is fairly dumb, but occasionsally Bungie will update the nextRefreshDate before
    // the current nextRefreshDate is reached. This can cause a couple hours where subtracting
    // a week will still be ahead of the current date.
    while (currentDate < lastRefreshDate) {
      lastRefreshDate.setDate(lastRefreshDate.getDate() - refreshInterval)
    }
    return lastRefreshDate.toISOString()
  }

  async getStrippedDownVendorByHash(hash) {
    const completeVendorData = await this.getVendorByHash(hash)

    const {
      name,
      description,
      icon,
      subtitle,
      smallTransparentIcon,
      largeTransparentIcon,
      largeIcon,
    } = completeVendorData.displayProperties
    let { nextRefreshDate, lastRefreshDate, enabled, sales } =
      completeVendorData

    const salesStripped = sales.map((sale) => {
      return {
        name: sale.displayProperties.name,
        icon: sale.displayProperties.icon,
        itemType: sale.itemTypeAndTierDisplayName,
        classType: sale.classType || '',
        damageType:
          (sale.damageType && sale.damageType.displayProperties) || '',
        subtitle: `${
          (sale.damageType && sale.damageType.displayProperties.name) ||
          sale.classType ||
          ''
        } ${sale.itemTypeAndTierDisplayName}`.trim(),
        quantity: sale.quantity,
        description:
          sale.displayProperties.description ||
          sale.displaySource ||
          sale.flavorText ||
          '',
        sort: sale.itemType,
        costs: sale.costs.map((cost) => {
          return {
            name: cost.displayProperties.name,
            icon: cost.displayProperties.icon,
            description: cost.displayProperties.description,
            source: cost.displaySource,
            quantity: cost.quantity,
          }
        }),
      }
    })
    return {
      name,
      description,
      icon,
      subtitle,
      smallTransparentIcon,
      largeIcon,
      largeTransparentIcon,
      lastRefreshDate,
      nextRefreshDate,
      hash,
      enabled,
      sales: salesStripped,
    }
  }

  async getWeeklyResets() {
    // TODO: factor out the api call so I can grab two vendors in one call.
    // This is currently dumb and really inefficient--we don't need all this data.
    const xur = await this.getVendorByHash(XUR)
    const zavala = await this.getVendorByHash(ZAVALA)

    return {
      weeklyReset: zavala.nextRefreshDate,
      weekendReset: xur.nextRefreshDate,
    }
  }
}
