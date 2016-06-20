import express from 'express'
import compression from 'compression'
import bodyParser from 'body-parser'
import errorhandler from 'errorhandler'
import logger from 'morgan'
import helmet from 'helmet'
import Router from './routes'

const app = express()
const env = process.env.NODE_ENV || 'development';

app.use(helmet())
app.set('port', process.env.PORT || 3030)
app.set('env', env)
app.use(compression())
app.use(logger(/dev/gi.test(env)? 'dev':'common'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))

app.use('/', Router.Home);
app.use('/webhook', Router.FBWebhook);

/**
 * Error Handler.
 */
app.use(errorhandler());

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});
