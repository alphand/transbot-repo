import express from 'express'
import request from 'request'

const PAGE_ACCESS_TOKEN = '';
const route = express.Router()

route.get('/fbwebhook',(req, res) =>{
  var VALIDATION_TOKEN = 'my_code_is_secured_and_safe';

  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
})

const replyMessage = (recipientId, message) => {
  console.log('sneding message?');
  request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: {
            recipient: {id: recipientId},
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

route.post('/fbwebhook', (req, res) =>{
  // console.log('body webhook', req.body.entry[0].messaging);
  const entries = req.body.entry;
  entries.map((item, idx) => {
    console.log(`per item ${idx}`, item);
    item.messaging.map((msg) => {
        console.log('sgl msg', msg)
        if(msg.message && msg.message.text)
          replyMessage(msg.sender.id, {text: 'ECHO: ' + msg.message.text})
    })
  })
  res.sendStatus(200);
})

export default route;
