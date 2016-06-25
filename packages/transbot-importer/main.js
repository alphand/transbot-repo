import yauzl from 'yauzl'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import del from 'del'
import mkdirp from 'mkdirp'
import csvparse from 'csv-parse'
import transform from 'stream-transform'

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
      if(/agency/.test(file)){
        mapPromise.push(readCSVFile(file))
      } else {
        mapPromise.push(Promise.resolve(true))
      }

      return Promise.all(mapPromise);
    })
  })
}

function connectMongo(){
  return new Promise((resolve, reject) => {
    const db = mongoose.connect(MONGODB_CONN).connection
    console.log('initiating mongo')
    db.on('error', console.error.bind(console, 'connection error:'))
    db.on('open', () => {
      console.log('db connected')
      resolve(db);
    })
  })
}

function readCSVFile(file){
  return new Promise((resolve, reject) => {
    console.log('read CSV file ', file)
    const parser = csvparse()
    const transformer = transform((record, cb) => {
      console.log('file: ', record)
      cb(null, record+'')
    } )

    const fileStream = fs.createReadStream(file);

    fileStream
      .pipe(parser)
      .pipe(transformer)

    // let records;
    //
    // fileStream.on('data',(chunk) => {
    //   console.log('chunk', chunk)
    //   records += chunk
    // })
    //
    // fileStream.on('end', ()=>{
    //   console.log('end recs', records)
    //   resolve(records)
    // })

    parser.on('error', (err)=>{
      console.log('parser err', err);
    })

    fileStream.on('end', () => {
      console.log('transform ended')
    })

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
      return unzipData(folderName)
    })
    .then((fileList) => {
      return processFileList(fileList)
    })
    .then(() => del(TMP_PATH + path.sep + 'data-*'))
    .then(() => {
      console.log('folder deleted')
    })
    .catch((err)=>{
      console.log('err', error)
    })
}())
