import express from 'express'
const route = express.Router();

route.get('/',(req, res, next) =>{
  res.set('Content-Type', 'text/plain')
  res.send('Hello World');
})

export default route;
