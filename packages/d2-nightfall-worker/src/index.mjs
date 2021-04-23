import {
  PublicMilestoneHandler,
  ActivityHandler,
} from '@the-traveler-times/bungie-api-gateway'

export default {
  async fetch(request, env) {
    const publicMilestoneHandler = new PublicMilestoneHandler()
    await publicMilestoneHandler.init(env.BUNGIE_API)
    const activityHandler = new ActivityHandler()
    await activityHandler.init(env.BUNGIE_API, env.DESTINY_2_DEFINITIONS)

    try {
      const nightfallMilestone = await publicMilestoneHandler.getPublicMilestoneByHash(
        '1942283261',
      )

      const activities = await activityHandler.getActivities(
        nightfallMilestone.activities,
      )

      return new Response(
        JSON.stringify({ ...nightfallMilestone, activities }),
        {
          status: 200,
        },
      )
    } catch (e) {
      return new Response(e.message, {
        status: 500,
      })
    }
  },
}
