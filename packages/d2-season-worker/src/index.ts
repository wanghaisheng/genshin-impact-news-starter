import {
  DefinitionHandler,
  SeasonHandler,
} from '@the-traveler-times/bungie-api-gateway'
import { isAuthorized } from '@the-traveler-times/utils'

export default {
  async fetch(request, env) {
    if (!isAuthorized(request, env)) {
      return new Response('Unauthorized', { status: 401 })
    }

    const definitionHandler = new DefinitionHandler()
    await definitionHandler.init(env.BUNGIE_API)
    const seasonHandler = new SeasonHandler()
    await seasonHandler.init(env.BUNGIE_API)

    try {
      const seasonsInfo = seasonHandler.getAllSeasons()
      const currentSeason = seasonHandler.getCurrentSeason()
      const nextSeason = seasonHandler.getNextSeason()

      const seasonalNode = await definitionHandler.getPresentationNode(
        '3443694067'
      )
      const weeklyNode = await definitionHandler.getPresentationNode(
        seasonalNode.children.presentationNodes[0].presentationNodeHash
      )
      const allWeekNodes = await Promise.all(
        weeklyNode.children.presentationNodes.map((node) => {
          return definitionHandler.getPresentationNode(
            node.presentationNodeHash
          )
        })
      )
      allWeekNodes.shift()
      const weeklyRecords = await Promise.all(
        allWeekNodes.map(async (weekNode) => {
          const challenges = await Promise.all(
            weekNode.children.records.map((record) =>
              definitionHandler.getRecord(record.recordHash)
            )
          )
          return { name: weekNode.displayProperties.name, challenges }
        })
      )

      let currentWeek = seasonHandler.getCurrentWeek(
        new Date(currentSeason.startDate)
      )
      if (currentWeek > weeklyRecords.length) {
        currentWeek = weeklyRecords.length
      }
      let currentWeekIndex = currentWeek - 1

      const festivalOfTheLost = await seasonHandler.getFestivalOfTheLost()

      return new Response(
        JSON.stringify({
          currentSeason,
          nextSeason,
          allSeasons: seasonsInfo,
          seasonalChallenges: {
            currentWeekIndex,
            weeks: weeklyRecords,
            name: seasonalNode.displayProperties.name,
            icon: seasonalNode.displayProperties.icon,
            description: seasonalNode.displayProperties.description,
          },
          festivalOfTheLost,
          isAvailable: !!(currentSeason && weeklyRecords),
        }),
        {
          status: 200,
        }
      )
    } catch (e) {
      return new Response(
        JSON.stringify({ isAvailable: false, errorMessage: e.message }),
        {
          status: 500,
        }
      )
    }
  },
}
