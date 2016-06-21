import express from 'express'
import oauth2 from 'simple-oauth2'
import GTFSBindings from 'gtfs-realtime-bindings'
import request from 'request'

const CLIENTID = process.env.TFNSW_CLIENTID;
const SECRET = process.env.TFNSW_SECRET;

const route = express.Router();

const oauth2Instance = oauth2({
  clientID: CLIENTID,
  clientSecret: SECRET,
  site:'https://api.transport.nsw.gov.au',
  tokenPath: '/auth/oauth/v2/token',
  useBasicAuthorizationHeader: true,
  useBodyAuth: false
})

function getAccessToken(){
  return new Promise((resolve, reject) => {
    oauth2Instance.client.getToken({
      scope: 'user',
      grant_type: 'client_credentials'
    }, (err, result) => {
      if(err)
        return reject(err)

      const token = oauth2Instance.accessToken.create(result);
      return resolve(token.token.access_token)
    })
  })
}

function getGTFSData(token, endpoint, type) {
  const requestSettings = {
    method: 'GET',
    url: `https://api.transport.nsw.gov.au/v1/gtfs/${endpoint}/${type}`,
    encoding: null,
    'auth': {
        'bearer': token
    }
  }

  return new Promise((resolve, reject) =>{
    request.get(requestSettings, (err, res, body) => {
      if(err) return reject(err)
      console.log('raw data', body);
      const feed = GTFSBindings.FeedMessage.decode(body)
      return resolve(feed)
    })
  })
}


function getGTFSAlert(){
  const requestSettings = {
    method: 'GET',
    url: 'https://api.nextthere.com/au_sydney/tools/GTFSRSydneyAlerts',
  }

  return new Promise((resolve, reject) =>{
    request.get(requestSettings, (err, res, body) => {
      if(err) return reject(err)
      console.log('body alert', body)
      const feed = GTFSBindings.FeedMessage.decode(body)
      return resolve(feed)
    })
  })

}

function processGTFSResult(data){
  return feed;
}

// route.get('/alerts/:type', (req, res) => {
//   getGTFSAlert()
//   .then((feed) => {
//     res.type('application/json')
//     res.status(200).send(feed)
//   })
//   .catch((err)=>{
//     console.log('TFNSW Error:', err);
//     res.status(400).send(err);
//   })
// })

route.get('/:endpoint/:type', (req, res) => {
  let feedData;
  getAccessToken()
    .then((token) => {
      return getGTFSData(token, req.params.endpoint, req.params.type)
    })
    .then((feed) => {
      res.type('application/json')
      res.status(200).send(feed)
    })
    .catch((err)=>{
      console.log('TFNSW Error:', err);
      res.status(400).send(err);
    })
})

export default route;