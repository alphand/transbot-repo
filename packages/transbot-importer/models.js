import mongoose from 'mongoose'
const LastUpdatedSchema = new mongoose.Schema({
  table: 'string',
  last_updated: 'date'
})

const AgencySchema = new mongoose.Schema({
  agency_id: 'string',
  agency_name: 'string',
  agency_url: 'string',
  agency_timezone: 'string',
  agency_lang: 'string',
  agency_phone: 'string'
})

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

const StopTimeSchema = new mongoose.Schema({
  trip_id: 'string',
  arrival_time :'string',
  departure_time :'string',
  stop_id :'string',
  stop_sequence :'string',
  stop_headsign :'string',
  pickup_type :'string',
  drop_off_type :'string',
  shape_dist_traveled :'string',
  timepoint :'string',
  stop_note_id :'string'
})

const TripSchema = new mongoose.Schema({
  route_id: 'string',
  service_id: 'string',
  trip_id: {
    type: 'string',
    index: true
  },
  shape_id: 'string',
  trip_headsign: 'string',
  direction_id: 'string',
  block_id: 'string',
  wheelchair_accessible: 'boolean'
})

const RouteSchema = new mongoose.Schema({
  route_id: {
    type:'string',
    index: true
  },
  agency_id: 'string',
  route_short_name: 'string',
  route_long_name: 'string',
  route_desc: 'string',
  route_type: 'string',
  route_color: 'string',
  route_text_color: 'string'
})



const LastUpdatedModel = mongoose.model('lastupdates', LastUpdatedSchema)
const AgencyModel = mongoose.model('agency', AgencySchema)
const StopModel = mongoose.model('stop', StopSchema)
const StopTimeModel = mongoose.model('stoptime', StopTimeSchema)
const TripModel = mongoose.model('trip', TripSchema)
const RouteModel = mongoose.model('route', RouteSchema)

const models = {
  Agency: mongoose.model('agency'),
  Stop: mongoose.model('stop'),
  StopTime: mongoose.model('stoptime'),
  Trip: mongoose.model('trip'),
  Route: mongoose.model('route')
}
export default models


//Stops sample query
// db.stops.find({loc:{$geoWithin:{$centerSphere:[[long,lat], 1km/6378.1]}}})
