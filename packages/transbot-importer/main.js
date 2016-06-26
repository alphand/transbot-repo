import yauzl from 'yauzl'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import del from 'del'
import mkdirp from 'mkdirp'
import csvparse from 'csv-parse'
import transform from 'stream-transform'
import models from './models'

const TMP_PATH = './tmp'
const MONGODB_CONN = 'mongodb://192.168.99.100/transbot-db'

function createTempFolder(){
  return new Promise((resolve, reject) => {
    fs.mkdtemp(TMP_PATH + path.sep + 'data-', (err, res)=>{
      if(err) return reject(err)
      console.log('folder' + res)
      return resolve(res)
    })
  })
}

function testWrite(folderName){
  return new Promise((resolve, reject) => {
    fs.writeFile(folderName + path.sep +'tbd.txt', 'delete me', (err)=>{
      if (err) return reject(err)
      resolve(true)
    })
  })
}

function unzipData(folderName) {
  console.log('ready to unzip')
  return new Promise((resolve, reject) =>{
    yauzl.open('./data/gtfs_sydney.zip',
      {lazyEntries: true},
      (err, zipFile) =>{
        let fileList = [];

        zipFile.readEntry()

        zipFile.on('entry', (entry) => {
          zipFile.openReadStream(entry, (err, readStream) => {
            if(err) return reject(err)
            const fileName = folderName + path.sep + entry.fileName
            fileList.push(fileName)
            readStream.pipe(fs.createWriteStream(fileName))
            readStream.on('end', () => {
              zipFile.readEntry()
            })
          })
        })

        zipFile.on('close', () => {
          resolve(fileList)
        })
      })
  })
}

function processFileList(fileList){
  return new Promise((resolve, reject) => {
    let mapPromise = [];

    fileList.map((file) => {
      console.log('processing file: '+ file)
      if(/agency|stops/.test(file)){
        mapPromise.push(readCSVFile(file))
      }  else {
        mapPromise.push(Promise.resolve(true))
      }
    })

    Promise.all(mapPromise)
      .then(values => resolve(values))
      .catch(err => reject(err))
  })
}

function connectMongo(){
  return new Promise((resolve, reject) => {
    const db = mongoose.connect(MONGODB_CONN).connection
    db.on('error', console.error.bind(console, 'connection error:'))
    db.on('open', () => {
      console.log('db connected')
      resolve(db);
    })
  })
}

function cleanUpCollections(){
  function dropColl(collname){
    return new Promise((resolve, reject) => {
      const coll = mongoose.connection.collections[collname]
      if(!coll) return resolve(true);

      coll.drop((err)=>{
        if(err) return reject(err);
        console.info(collname + ' coll dropped')
        resolve(true)
      })
    })
  }

  return new Promise((resolve, reject) => {
    Promise.all([
      dropColl('agencies'),
      dropColl('stops')
    ])
    .then(values => {
      console.log('drop all', values)
      resolve(true)
    })
    .catch((err) =>{
      if(err && err.errmsg === 'ns not found')
        return resolve(true)

      reject(err)
    })
  })
}

function readCSVFile(file){
  return new Promise((resolve, reject) => {
    console.log('read CSV file ', file)
    let record;
    let items = [];
    let base = [];
    const parser = csvparse()

    const fileStream = fs.createReadStream(file);
    fileStream
      .pipe(parser)

    parser.on('readable',() => {
      while(record = parser.read()){
        if (base.length === 0){
          record.map(item => base.push(item))
        }
        else {
          let obj = {}
          let point_key = [];
          base.map((key, idx) => {
            obj[key] = record[idx]
            if(/_(lat|lon)$/gi.test(key)){
              point_key.push(key)
            }
          })

          if(point_key.length > 0){
            obj.loc = {
              type:'Point',
              coordinates: [ +obj[point_key[1]], +obj[point_key[0]]]
            }
          }
          items.push(obj)
        }
      }
    })

    parser.on('error', (err)=>{
      console.log('parser err', err)
      reject(err)
    })

    parser.on('finish', () => {
      console.log('parser ended', items[0])
      resolve(items)
    })

    fileStream.on('end', () => {
      parser.end()
    })

  })
}

function insertToDB(agencyArr, stopsArr) {
  const dataInsert = (model, dataArr) => {
    return new Promise((resolve, reject) => {
      function dataOnInsert(err, docs){
        if(err) return reject(err);
        console.log( model + ' inserted')
        resolve(true)
      }
      models[model].collection.insert(dataArr, dataOnInsert)
    })
  }

  return new Promise((resolve, reject) => {
    Promise.all([
      dataInsert('Agency', agencyArr),
      dataInsert('Stop', stopsArr)
    ])
    .then(() => resolve(true))
    .catch((err) => reject(err))
  })
}

(function init(){
  let folderName;
  let db;

  Promise.all([
    connectMongo(),
    createTempFolder()
  ])
    .then( values => {
      db = values[0];
      folderName = values[1];
      return Promise.all([
        cleanUpCollections(),
        unzipData(folderName)
      ])
    })
    .then( values => {
      return processFileList(values[1])
    })
    .then( values => {
      console.log('values after process', values.length)
      return insertToDB(values[0], values[1])
    })
    .then(() =>{
      return del(TMP_PATH + path.sep + 'data-*')
    })
    .then(() => {
      console.log('folder deleted')
    })
    .catch((err)=>{
      console.log('err', error)
    })
}())
