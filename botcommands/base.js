const shortid = require('shortid')
const redis = require('redis')
const redisClient = require('../modules/redis-client')

const mongoose = require('mongoose')
const User = mongoose.model('User')
const Guild = mongoose.model('Guild')

const config = require('../config')

const moment = require('moment-timezone')

function setDays(user, dow, am, price, cb){
  let days = user.stonks
  let foundIndex = days.findIndex(day => day.dow === dow);

  if(foundIndex >= 0){
    let day = days[foundIndex]

    if(am){
      day.am = price
    }else{
      day.pm = price
    }

    days[foundIndex] = day
    user.stonks = days
    user.save().then(() => {
      cb()
    })
  }else{
    user.stonks.push({
      dow: dow,
      am: am ? price : 0,
      pm: am ? 0 : price
    })
    user.save().then(() => {
      cb()
    })
  }
}

// Make sure to export properties
module.exports = {
  name: 'turnip', // Command name (what's gonna be used to call the command)
  aliases: ['stonks', 'stalks', 'turnips'], // Command aliases

  async execute (client, message, args) {
    // Send a message with the text the user entered after the command.
    // If they didn't pass any args we send a :thinking:
    // message.channel.send(`> ${args.length !== 0 ? args.join(' ') : ':thinking:'}`);
    //
    let guildID = message.guild.id
    let discordUserID = message.author.id
    console.log(args)
    console.log(args.length)

    if (args.length > 0) {
      let arg1 = args[0]

      let guild = await Guild.findOne({gid: guildID})

      if(!guild){
        let newGuild = new Guild({gid: guildID})
        await newGuild.save()

        guild = newGuild
      }

      if(arg1 === 'help') {
        let helps = '.stonks help - view this\n' +
          '.stonks price - automatically set price for am/pm\n' +
          '      Example: .stonks 100\n' +
          '.stonks set day am/pm price - manually backfill missing dates\n' +
          '      Example: .stonks set monday am 100\n' +
          '.stonks tz - sends you a link to set your timezone\n'

        return message.channel.send(`\`\`\`${helps}\`\`\``)
      }

      if (arg1 === 'tz') {
        // TODO Send TZ set link here
        // Get user ID and add UUID to redis
        // Send user back link with unique UUID that links back to their user ID
        let linkid = shortid.generate()
        let expireSeconds = 15 * 60 // 5 minutes
        let returnURL = config.baseURL + '/?tz=' + linkid

        User.findOne({ did: discordUserID }).then((user) => {
          console.log('HERE2')
          if (!user) {
            let newUser = new User({
              did: discordUserID,
              stonks: [
                { dow: 1, am: 0, pm: 0},
                { dow: 2, am: 0, pm: 0},
                { dow: 3, am: 0, pm: 0},
                { dow: 4, am: 0, pm: 0},
                { dow: 5, am: 0, pm: 0},
                { dow: 6, am: 0, pm: 0}
              ]
            })
            newUser.save().then(() => {
              redisClient.set(linkid, message.author.id, 'EX', expireSeconds, redis.print)
              message.author.send('Pls click this link to set your timezone automatically! ' + returnURL)
            })
          } else {
            let tz = user.tz

            if (tz.length === 0) {
              redisClient.set(linkid, message.author.id, 'EX', expireSeconds, redis.print)
              message.author.send('Pls click this link to set your timezone automatically! ' + returnURL)
            } else {
              redisClient.set(linkid, message.author.id, 'EX', expireSeconds, redis.print)
              message.author.send('Your timezone was already set, but here\'s a link to update it! ' + returnURL)
            }
          }
        }).catch((e) => {
          console.log(e)
        })
      } else if (Number.isInteger(arg1 * 1)) {
        let user = await User.findOne({ did: discordUserID })

        if(!user){
          return message.channel.send('You must first set your timezone with .stonks tz to be able to track your prices!')
        }

        let price = arg1 * 1

        let format = 'hh:mm:ss'
        let currentTime = moment().tz(user.tz)
        let dow = currentTime.day()

        let pmStart = moment('12:00:00', format).tz(user.tz)
        let pmEnd = moment('23:59:59', format).tz(user.tz)

        let earlyStart = moment('00:00:00', format).tz(user.tz)
        let earlyEnd = moment('04:59:59', format).tz(user.tz)

        let am = true

        if (currentTime.isBetween(pmStart, pmEnd)) {
          // Currently afternoon hours of current dow
          am = false
        } else if (currentTime.isBetween(earlyStart, earlyEnd)) {
          // Currently afternoon hours of current dow
          am = false
          dow -= 1
        }

        if(dow === 0){
          message.channel.send(`You can only track prices from Monday to Saturday!`)
          return
        }

        if (user) {
          // day, am , price
          console.log(currentTime.format('MMMM Do YYYY, h:mm:ss a') + ' ' + pmStart.format('MMMM Do YYYY, h:mm:ss a'))
          setDays(user, dow, am, price, () => {
            message.channel.send(`Setting ${am ? 'am' : 'pm'} price for ${moment().day(dow).format('ddd')} to ${price}`)

            guild.trackedUsers.addToSet(user)

            guild.save()
          })
        } else {
          message.channel.send('You must first set your timezone with .stonks tz to be able to track your prices!')
        }

      } else if(arg1 === "set") {
        let user = await User.findOne({ did: discordUserID })

        if(!user){
          return message.channel.send('You must first set your timezone with .stonks tz to be able to track your prices!')
        }

        let format = 'hh:mm:ss'
        let currentTime = moment().tz(user.tz)
        let dow = currentTime.day()

        let pmStart = moment('12:00:00', format).tz(user.tz)
        let pmEnd = moment('23:59:59', format).tz(user.tz)

        let earlyStart = moment('00:00:00', format).tz(user.tz)
        let earlyEnd = moment('04:59:59', format).tz(user.tz)

        let am = true

        if (currentTime.isBetween(pmStart, pmEnd)) {
          // Currently afternoon hours of current dow
          am = false
        } else if (currentTime.isBetween(earlyStart, earlyEnd)) {
          // Currently afternoon hours of current dow
          am = false
          dow -= 1
        }

        if(args.length === 4){
          let day = args[1]
          let ampm = args[2]
          let price = args[3]

          if(ampm.toLowerCase() === "am"){
            am = true
          }else if(ampm.toLowerCase() === "pm"){
            am = false
          }else{
            return message.channel.send(`Invalid argument ${ampm}, must be am or pm!`)
          }

          if(Number.isInteger(price * 1)){
            price = parseInt(price)

            let dayDate = moment().day(day).tz(user.tz)

            let cdow = dayDate.day()

            if(cdow > dow){
              return message.channel.send('You cannot set a price for a later date!')
            }

            setDays(user, cdow, am, price, () => {
              message.channel.send(`Setting ${am ? 'am' : 'pm'} price for ${moment().day(cdow).format('ddd')} to ${price}`)

              guild.trackedUsers.addToSet(user)

              guild.save()
            })
          }
        }else{
          message.channel.send('Incorrect set usage. set <day> <am/pm> <price>')
        }
      } else {
        message.channel.send('Command not found. Valid commands are \<price\> or tz')
      }

    } else {
      // Handle base command
      // which would be displaying results/graph
      const fws = require('fixed-width-string');
      Guild.findOne({gid: guildID}).populate('trackedUsers').exec(async (err, guild) => {
        let users = guild.trackedUsers

        let header = `          |MON    |TUE    |WED    |TR     |FRI    |SAT    `
        let content = ''

        let promiseArray = await users.map(async user => {
          let did = user.did
          let duser = await message.guild.members.fetch(user.did)
          let nick = duser.displayName
          let rstring = `${fws(nick, 10)}`
          let prices = JSON.parse(JSON.stringify(user.stonks))
          prices.sort((a, b) => {
            if(a.dow > b.dow) return 1
            else return -1
          })
          prices.map((price) => {
            rstring += "|" + fws(price.am, 3) + "," + fws(price.pm, 3)
          })
          content += "\n" + rstring
        })

        Promise.all(promiseArray).then(() => {


          message.channel.send(`\`\`\`${header+content}\`\`\``)
        })





      })
    }
  }
}