const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'cricketMatchDetails.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const convertDbObjectToResponseObject = dbObject => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
    match: dbObject.match,
    matchId: dbObject.match_id,
    year: dbObject.year,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  }
}

app.get('/players/', async (request, response) => {
  const getPlyersQuery = `
    SELECT
      *
    FROM
      player_details
    ORDER BY
      player_id;`
  const playersArray = await db.all(getPlyersQuery)
  response.send(
    playersArray.map(eachState => convertDbObjectToResponseObject(eachState)),
  )
})

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getPlayerQuery = `
    SELECT
      *
    FROM
      player_details
    WHERE player_id = ${playerId};`
  const playerArray = await db.get(getPlayerQuery)
  response.send(convertDbObjectToResponseObject(playerArray))
})

app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params
  const getMatchQuery = `
    SELECT
      *
    FROM
      match_details
    WHERE match_id = ${matchId};`
  const matchArray = await db.get(getMatchQuery)
  response.send(convertDbObjectToResponseObject(matchArray))
})

app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const playerDetails = request.body
  const {playerName} = playerDetails

  const updatePlayerQuery = `
    UPDATE
      player_details
    SET
      player_name = '${playerName}'

    WHERE
      player_id = ${playerId};`
  await db.run(updatePlayerQuery)
  response.send('Player Details Updated')
})

app.get('players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params
  const getStatisticsQuery = `
  SELECT
    player_details.player_id,
    player_details.player_name,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes 
    FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};`

  const stats = await db.get(getStatisticsQuery)

  response.send(convertDbObjectToResponseObject(stats))
})

app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params
  const getPlayerMatchQuery = `
    SELECT
      match_id,
      match,
      year
    FROM
      player_match_score NATURAL JOIN match_details
    WHERE player_id = ${playerId};`
  const playerMatch = await db.all(getPlayerMatchQuery)
  response.send(
    playerMatch.map(eachMatch => convertDbObjectToResponseObject(eachMatch)),
  )
})

app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  const getMatchesPlayerQuery = `
    SELECT
      player_id,
      player_name
    FROM
      player_match_score NATURAL JOIN player_details
    WHERE match_id = ${matchId};`
  const matchPlayer = await db.all(getMatchesPlayerQuery)
  response.send(
    matchPlayer.map(eachMatch => convertDbObjectToResponseObject(eachMatch)),
  )
})

module.exports = app
