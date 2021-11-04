require('dotenv').config()
const fetch = require('node-fetch')
const fs = require('fs')

function getMockDataLocation(endpoint) {
  return `mock-data/${endpoint.split('.')[0].substring(8)}.json`
}

function getHeaders() {
  return {
    headers: {
      'TTT-API-KEY': process.env.TTT_API_KEY,
    },
  }
}

async function getDataFrom(endpoint) {
  if (process.env.NODE_ENV === 'production') {
    const data = await fetch(endpoint, getHeaders())
    const json = await data.json()
    fs.writeFileSync(getMockDataLocation(endpoint), JSON.stringify(json))
    return json
  }
  const mockData = fs.readFileSync(getMockDataLocation(endpoint))
  return JSON.parse(mockData)
}

async function fetchDataFromEndpoint(endpoint, localEndpoint) {
  try {
    const data = await getDataFrom(endpoint)
    return data
  } catch (e) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`Failed to fetch data from endpoint: ${endpoint} \n ${e}`)
      return { isAvailable: false }
    } else {
      console.error(
        `Failed to fetch data from local endpoint: ${endpoint} \n ${e}`
      )
    }
    return { ...mockData, isMockData: true }
  }
}

module.exports = {
  fetchDataFromEndpoint,
}
