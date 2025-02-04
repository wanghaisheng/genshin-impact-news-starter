import xurLocations from './xurLocations'
import { maps, rewards } from './trialQueries'

export default class TwitterHandler {
  private twitterToken?: string
  async init(twitterEnv) {
    try {
      this.twitterToken = await twitterEnv.get('BEARER_TOKEN')
    } catch (e) {
      console.error(`Failed to get and parse KV from TWITTER_API: ${e}`)
    }
  }

  /**
    {
      "data": [
          {
              "id": "1355818175577862145",
              "text": "Xûr has left the Tower. #destiny https://t.co/FRDPzBJeyO"
          },
          {
              "id": "1355093518344196098",
              "text": "Xûr just arrived in the Tower, guardians. Find him. #destiny https://t.co/FRDPzBJeyO"
          }
      ],
      "meta": {
          "newest_id": "1355818175577862145",
          "oldest_id": "1355093518344196098",
          "result_count": 2
      }
    }
  */
  async queryRecentTweetsFromTwitter(
    query: string,
    startDate: Date | string | undefined,
    endDate: Date | string | undefined,
    maxResults = 100
  ) {
    const url = new URL(`https://api.twitter.com/2/tweets/search/recent`)
    let startingDate: Date
    if (startDate instanceof Date) {
      startingDate = startDate
    } else if (typeof startDate === 'string') {
      startingDate = new Date(startDate)
    } else {
      // Just arbitrarily set startingDate to 30 minutes ago 🤷‍♀️
      startingDate = new Date()
      startingDate.setMinutes(startingDate.getMinutes() - 30)
    }

    if (startingDate) {
      url.searchParams.set('start_time', startingDate.toISOString())
    }

    let endingDate: Date
    if (endDate instanceof Date) {
      endingDate = endDate
    } else if (typeof endDate === 'string') {
      endingDate = new Date(endDate)
    }

    if (endingDate) {
      url.searchParams.set('end_time', endingDate.toISOString())
    }

    url.searchParams.set('query', query)
    url.searchParams.set('max_results', maxResults.toString())
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.twitterToken}`,
        },
      })
      if (!response.ok) {
        throw new Error(response.statusText)
      }
      return response.json()
    } catch (e) {
      console.error(`Failed to query twitter for recent tweets: ${e}`)
      return { ok: false }
    }
  }

  async getXurLocation(searchStartDate, searchEndDate) {
    const xurLocationQueries = await Promise.all(
      xurLocations.map(async (location) => {
        const twitterQueryResult = await this.queryRecentTweetsFromTwitter(
          location.twitterQuery,
          searchStartDate,
          searchEndDate
        )
        return { ...location, results: twitterQueryResult.meta.result_count }
      })
    )

    let bestGuessLocation = {
      planet: 'Unknown',
      area: 'Unknown',
    }
    let currentHighestCount = 0

    xurLocationQueries.forEach((location, index) => {
      if (location.results > currentHighestCount) {
        bestGuessLocation = location
        currentHighestCount = location.results
      }
    })
    return {
      xurLocationQueries,
      ...bestGuessLocation,
    }
  }

  async getTrialsMap(
    searchStartDate: Date,
    searchEndDate?: Date
  ): Promise<TrialsMapsQueryResults[]> {
    const trialsQueryResults = await Promise.all(
      maps.map(async (trials) => {
        const twitterQueryResult = await this.queryRecentTweetsFromTwitter(
          trials.twitterQuery,
          searchStartDate,
          searchEndDate
        )
        return {
          ...trials,
          results: twitterQueryResult.meta.result_count as number,
        }
      })
    )

    let trialsMaps: TrialsMapsQueryResults[] = []
    let currentHighestMap: TrialsMapsQueryResults

    trialsQueryResults.forEach((query, index) => {
      if (query.results > 30) {
        trialsMaps.push(query)
      }
      if (!currentHighestMap || currentHighestMap.results < query.results) {
        currentHighestMap = query
      }
    })

    if (
      trialsMaps.length === 0 &&
      currentHighestMap !== undefined &&
      currentHighestMap.results > 0
    ) {
      trialsMaps.push({ ...currentHighestMap, isGuess: true })
    }

    return trialsMaps
  }

  async getTrialsRewards(
    searchStartDate: Date,
    searchEndDate?: Date
  ): Promise<TrialsRewardsQueryResults[]> {
    const trialsQueryResults = await Promise.all(
      rewards.map(async (trials) => {
        const twitterQueryResult = await this.queryRecentTweetsFromTwitter(
          trials.twitterQuery,
          searchStartDate,
          searchEndDate
        )
        return {
          ...trials,
          results: twitterQueryResult.meta.result_count as number,
        }
      })
    )

    let trialsRewards: TrialsRewardsQueryResults[] = []
    let currentHighestReward: TrialsRewardsQueryResults

    trialsQueryResults.forEach((query, index) => {
      if (query.results > 5) {
        trialsRewards.push(query)
      }
      if (
        !currentHighestReward ||
        currentHighestReward.results < query.results
      ) {
        currentHighestReward = query
      }
    })
    if (
      trialsRewards.length === 0 &&
      currentHighestReward !== undefined &&
      currentHighestReward.results > 0
    ) {
      trialsRewards.push({ ...currentHighestReward, isGuess: true })
    }

    return trialsRewards
  }
}

type TrialsMapsQueryResults = {
  twitterQuery: string
  map: string
  activityHash: string
  results: number
  isGuess?: boolean
}

type TrialsRewardsQueryResults = {
  twitterQuery: string
  reward: string
  hash: string
  results: number
  isGuess?: boolean
}
