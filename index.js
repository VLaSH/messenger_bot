require('dotenv').config();
var express = require('express');
var http = require('request-promise')
var _ = require("underscore");
if (!process.env.page_token) {
  console.log('Error: Specify page_token in environment');
  process.exit(1);
}

if (!process.env.verify_token) {
  console.log('Error: Specify verify_token in environment');
  process.exit(1);
}

var Botkit = require('botkit');

var controller = Botkit.facebookbot({
  debug: true,
  access_token: process.env.page_token,
  verify_token: process.env.verify_token
});

var bot = controller.spawn({});

var regexp = /com\/(.*)/
var photo = null

controller.setupWebserver(process.env.port || 3000, function(err, webserver) {
  controller.createWebhookEndpoints(webserver, bot, function() {
    webserver.get('/policy', function(req, res){
      res.sendFile(__dirname + '/public/privacy_policy.html')
    })
    console.log('ONLINE!');
  });
});

controller.hears(['hi', 'hello'], 'message_received', function(bot, message) {
  bot.reply(message, 'Hey!');
});

controller.hears(['nice', 'meet'], 'message_received', function(bot, message) {
  bot.reply(message, 'Oh, nice to meet you too!');
});

controller.hears(['https://vk.com', 'vk.com'], 'message_received', function(bot, message) {
  var username = null
  var userid = null
  var photo_url = null

  if (message.text.match(regexp) != null)
    username = message.text.match(regexp)[1]
  if (username != null) {
    var user_url = 'https://api.vk.com/method/' + 'users.get?v=5.53&user_ids=' + username

    http({ uri: user_url, json: true })
      .then(function(data) {
        userid = data.response[0].id
        return userid
      })
      .then(function(userid){
        var photos_url = 'https://api.vk.com/method/' + 'photos.get?v=5.53&album_id=wall&rev=0&extended=0&photo_sizes=1&count=10&owner_id=' + userid
        if (userid != null) {
          http({ uri: photos_url, json: true })
            .then(function(data) {
              var items = data.response.items
              var max = items.length - 1
              var index = Math.floor(Math.random() * (max - 0) + 0)
              photo_url = _.find(items[index].sizes, function(size) {
                return size.type == 'y' || size.type == 'x' || size.type == 'm'
              }).src;
              photo = items[index]
              return photo_url
            })
            .then(function(url){
              var attachment = {
              'type':'template',
                'payload':{
                    'template_type':'generic',
                    'elements':[
                        {
                            'title':'I like this one!',
                            'image_url':url,
                            'buttons':[
                              {
                                 'type':'postback',
                                 'title':'Post It',
                                 'payload':'yes'
                               },
                               {
                                 'type':'postback',
                                 'title':'No way!',
                                 'payload':'no'
                               }
                            ]
                        }
                    ]
                }
              }
              bot.reply(message, { attachment: attachment });
            })
        };
      });
  };
});

controller.on('facebook_postback', function(bot, message) {
  if(photo == null) {
    bot.reply(message, 'Gimme link!')
  } else if(message.payload == 'yes') {
    post_photo(photo.owner_id, photo.id, function(data) {
      var url = 'https://www.vk.com/id' + process.env.vk_photo_poster_id + '?w=wall' + process.env.vk_photo_poster_id + '_' + data.response.post_id
      bot.reply(message, 'check it out: ' + url)
      return 0
    })
  } else if(message.payload == 'no') {
    bot.reply(message, 'Up to you!')
  }
})

var post_photo = function(owner_id, photo_id, callback) {
  var url = 'https://api.vk.com/method/wall.post?owner_id=' + process.env.vk_photo_poster_id + '&message=i like this one&attachment=photo' + owner_id + '_' + photo_id + '&access_token=' + process.env.vk_access_token
  http({ uri: url, json: true })
    .then(function(data){
      callback(data)
    })
}
