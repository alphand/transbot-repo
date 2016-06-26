import mongoose from 'mongoose'

const AgencySchema = {
  agency_id: 'string',
  agency_name: 'string',
  agency_url: 'string',
  agency_timezone: 'string',
  agency_lang: 'string',
  agency_phone: 'string'
}

const StopSchema = new mongoose.Schema({
  stop_id: 'string',
  stop_code: 'string',
  stop_name: 'string',
  stop_lat: 'string',
  stop_lon: 'string',
  loc:{
    type: {
      type: 'string'
    },
    coordinates:{
      type:['number'],
      default:[0,0]
    }
  },
  location_type:'string',
  parent_station: 'string',
  wheelchair_boarding:'string',
  platform_code:'string'
})
StopSchema.index({loc:'2dsphere'})

const AgencyModel = mongoose.model('agency', AgencySchema)
const StopModel = mongoose.model('stop', StopSchema)

const models = {
  Agency: mongoose.model('agency'),
  Stop: mongoose.model('stop')
}
export default models


//Stops sample query
// db.stops.find({loc:{$geoWithin:{$centerSphere:[[long,lat], 1km/6378.1]}}})
