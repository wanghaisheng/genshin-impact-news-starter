import {
  DefinitionHandler,
  // VendorHandler,
  PublicMilestoneHandler,
  Hashes,
  getStrippedItem,
  dateUtilities,
} from '@the-traveler-times/bungie-api-gateway'
import { isAuthorized } from '@the-traveler-times/utils'

export default {
  async fetch(request: Request, env: CloudflareEnvironment) {
    if (!isAuthorized(request, env)) {
      return new Response('Unauthorized', { status: 401 })
    }
    const definitionHandler = new DefinitionHandler()
    await definitionHandler.init(env.BUNGIE_API)
    const publicMilestoneHandler = new PublicMilestoneHandler()
    await publicMilestoneHandler.init(env.BUNGIE_API)

    try {
      const nextWeeklyReset = dateUtilities.getNextWeeklyReset()
      const nextWeekendReset = dateUtilities.getNextWeekendReset()
      const lastWeeklyReset = dateUtilities.getLastWeeklyReset()
      const lastWeekendReset = dateUtilities.getLastWeekendReset()

      let ironBannerMilestone
      try {
        ironBannerMilestone =
          await publicMilestoneHandler.getPublicMilestoneByHash(
            Hashes.IRON_BANNER
          )
      } catch (e) {
        console.log('Iron Banner not available.')
      }

      let ironBanner
      if (ironBannerMilestone) {
        const ironBannerDefinition = await definitionHandler.getMilestone(
          ironBannerMilestone.milestoneHash
        )
        const ironBannerRewards = await definitionHandler.getInventoryItems(
          1141547457, // Frontier's Cry
          1796949035, // Razor's Edge
          829330711, // Peacebond
          1076810832, // Forge's Pledge
          108221785, // Riiswalker
          // 701922966, // Finite Impactor
          // 852551895, // Occluded Finality
          1967303408 // Archon's Thunder
        )
        const awardsStripped = await Promise.all(
          ironBannerRewards.map(async (weapon) => {
            const damageType = await definitionHandler.getDamageType(
              weapon.defaultDamageTypeHash
            )
            weapon.damageType = damageType

            return {
              ...weapon,
              ...getStrippedItem(weapon),
            }
          })
        )

        ironBanner = {
          isAvailable: true,
          rewards: awardsStripped,
          startDate: lastWeeklyReset,
          endDate: nextWeeklyReset,
          ...ironBannerDefinition,
          ...ironBannerMilestone,
        }
      } else {
        ironBanner = { isAvailable: false }
      }

      let wellspringMilestone =
        await publicMilestoneHandler.getPublicMilestoneByHash(Hashes.WELLSPRING)

      let wellspring
      if (wellspringMilestone) {
        const activities = await definitionHandler.getActivities(
          ...wellspringMilestone.activities.map(
            (activity) => activity.activityHash
          )
        )

        const rewardHashes = activities.map((activity) => {
          const rewards = activity.rewards.map((reward) =>
            reward.rewardItems.map((item) => item.itemHash)
          )
          return rewards.flat()
        })

        const wellspringRewards = await definitionHandler.getInventoryItems(
          ...rewardHashes.flat()
        )

        const wellspringFetchedRewards = await Promise.all(
          wellspringRewards.map(async (item) => {
            const damageType = await definitionHandler.getDamageType(
              item.defaultDamageTypeHash
            )
            item.damageType = damageType

            return {
              ...item,
              ...getStrippedItem(item),
            }
          })
        )
        wellspring = {
          ...wellspringMilestone,
          activities,
          rewards: wellspringFetchedRewards,
          isAvailable: true,
        }
      } else {
        wellspring = {
          isAvailable: false,
        }
      }

      return new Response(
        JSON.stringify({
          nextWeeklyReset,
          lastWeeklyReset,
          nextWeekendReset,
          lastWeekendReset,
          ironBanner,
          wellspring,
          isAvailable: true,
        }),
        {
          status: 200,
        }
      )
    } catch (e) {
      return new Response(
        JSON.stringify({ isAvailable: false, error: e.message })
      )
    }
  },
}
