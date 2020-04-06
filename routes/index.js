const express = require('express');
const router = express.Router();
const redis = require('redis')
const redisClient = require('../modules/redis-client')

const mongoose = require('mongoose')
const User = mongoose.model('User')

const discordClient = require('../modules/discordbot')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Turnip Tracker Bot' });
});

router.post('/', function(req, res, next) {
  console.log(req.body)
  let key = req.body.key
  let tz = req.body.tz

  redisClient.get(key, (err, value) => {
    console.log(value)
    if(value){
      User.findOne({did: value}).then((user) => {
        if(!user){
          res.send("ERROR")
        }else{
          user.tz = tz
          user.save().then(() => {
            redisClient.del(key, (err, reply) => {
              if(!err) {
                discordClient.users.fetch(value).then((user => {
                  user.send("Your timezone has been set to " + tz)
                  res.send("OK")
                }))
              }
            })
          })
        }
      })
    }else{
      res.send("")
    }
  })

})

module.exports = router;
