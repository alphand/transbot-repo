import express from 'express'
import oauth2 from 'simple-oauth2'
import GTFSBindings from 'gtfs-realtime-bindings'
import request from 'request'
import yauzl from 'yauzl'
import fs from 'fs'
import path from 'path'
import _ from 'lodash'

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

function getGTFSStaticData(token, res) {
  const requestSettings = {
    method: 'GET',
    url: 'https://api.transport.nsw.gov.au/v1/publictransport/timetables/complete/gtfs',
    encoding: null,
    'auth': {
        'bearer': token
    }
  }

  return new Promise((resolve, reject) =>{
    request.get(requestSettings)
      .pipe(res)
      // .pipe(fs.createWriteStream('./tmp/tfnsw.zip'))
      // .on('close', () => {
      //   console.log('complete', arguments);
      //   // if(err) return reject(err)
      //   // console.log(res);
      //   return reject('Testing phase');
      // })
  })
}

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

function getGTFSData(token, endpoint, type, subtype) {
  type = (subtype)? type+'/'+subtype: type
  const requestSettings = {
    method: 'GET',
    url: `https://api.transport.nsw.gov.au/v1/gtfs/${endpoint}/${type}`,
    encoding: null,
    'auth': {
        'bearer': token
    }
  }

  console.log('req url', requestSettings.url)

  return new Promise((resolve, reject) =>{
    request.get(requestSettings, (err, res, body) => {
      if(err) return reject(err)

      const RESP_CONTENT_TYPE = res.headers['content-type']
      const RESP_CONTENT_DISPOSITION = res.headers['content-disposition']

      console.log('res headers', res.headers)

      if(/x-google-protobuf/gi.test(RESP_CONTENT_TYPE)){
        const feed = GTFSBindings.FeedMessage.decode(body)
        return resolve(feed)
      }
      else {
        return resolve(body)
      }
    })
  })
}

function createTempFolder(){
  return new Promise((resolve, reject) => {
    fs.mkdtemp(TMP_PATH + path.sep + 'data-', (err, res)=>{
      if(err) return reject(err)
      console.log('folder' + res)
      return resolve(res)
    })
  })
}

function downloadGTFSData(token, endpoint, type, subtype) {
  const requestSettings = {
    method: 'GET',
    url: `https://api.transport.nsw.gov.au/v1/gtfs/${endpoint}/${type}/${subtype}`,
    encoding: null,
    'auth': {
        'bearer': token
    }
  }

  console.log('download url', requestSettings.url)

  return new Promise((resolve, reject) => {
    let count = 0;
    createTempFolder()
      .then((folderName) =>{
        request.get(requestSettings)
          .on('end', () => resolve('done'))
          .on('data',(chunk) => {
            count += chunk.length
            console.log('data', res)
          })
          .on('error', (err) => reject(err))
          .pipe(fs.createWriteStream(folderName + path.sep + `${type}-${subtype}.zip`))
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

route.get('/update', (req, res) => {
  let feedData;
  getAccessToken()
    .then((token) => {
      return getGTFSStaticData(token, res)
    })
    .then((feed) => {
      console.log('done');
      // res.type('plain/text')
      // res.status(200).send('updating')
    })
    .catch((err)=>{
      console.log('TFNSW Error:', err);
      res.status(400).send(err);
    })
})

route.get('/realtime/:type', (req, res)=>{
  let feedData;
  const STOP_ID = req.query.stop_id
  getAccessToken()
    .then((token) => {
      return getGTFSData(token, 'realtime', req.params.type, req.params.subtype)
    })
    .then((feed) => {
      let list = [];
      if(STOP_ID){
        feed.entity.map((item)=>{
          let stops = item.trip_update.stop_time_update.filter((stop) => {
            return stop.stop_id === STOP_ID
          })

          let obj = {
            vehicle: item.trip_update.vehicle,
            trip: item.trip_update.trip,
            stop_time_update: stops
          };
          if(stops.length > 0)
            list.push(obj);
        })
      } else {
        list = feed.entity
      }
      res.type('application/json')
      res.status(200).send(list)
    })
    .catch((err)=>{
      console.log('TFNSW Error:', err);
      res.status(400).send(err);
    })
})

route.get('/schedule/:type/:subtype', (req, res) => {
  getAccessToken()
    .then(token => downloadGTFSData(token, 'schedule', req.params.type, req.params.subtype))
    .then((result) => {
      res.type('application/json')
      res.status(200).send(result)
    })
    .catch((err)=>{
      console.log('TFNSW Error:', err);
      res.status(400).send(err);
    })
})

route.get('/:endpoint/:type/:subtype*?', (req, res) => {
  let feedData;
  getAccessToken()
    .then((token) => {
      return getGTFSData(token, req.params.endpoint, req.params.type, req.params.subtype)
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
