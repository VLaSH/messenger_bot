require('dotenv').config();
var vk     = require('./src/vk')(),
    Botkit = require('botkit');

if (!process.env.page_token) {
  console.log('Error: Specify page_token in environment');
  process.exit(1);
}

if (!process.env.verify_token) {
  console.log('Error: Specify verify_token in environment');
  process.exit(1);
}

var controller = Botkit.facebookbot({
      debug: true,
      access_token: process.env.page_token,
      verify_token: process.env.verify_token
    }),
    bot        = controller.spawn({}),
    photo      = null;

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
  var regexp = /com\/(.*)/,
    username = null;
  bot = {
    reply: bot.reply,
    message: message
  }

  if (message.text.match(regexp) != null)
    username = message.text.match(regexp)[1]
  if (username != null) {
    vk.getPhoto(username, function(err, data) {
      if(err) {
        bot.reply(message, err.message)
      }
      else {
        photo = data.photo
        var attachment = {
        'type':'template',
          'payload':{
              'template_type':'generic',
              'elements':[
                  {
                      'title':'I like this one!',
                      'image_url':data.uri,
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
      }
    })
  }
});

controller.on('facebook_postback', function(bot, message) {
  if(photo == null) {
    bot.reply(message, 'Gimme link!')
  } else if(message.payload == 'yes') {
    vk.postPhoto(photo.owner_id, photo.id, function(data) {
      var uri = 'https://www.vk.com/id' + process.env.vk_photo_poster_id + '?w=wall' + process.env.vk_photo_poster_id + '_' + data.response.post_id
      bot.reply(message, 'check it out: ' + uri)
      return 0
    });
  } else if(message.payload == 'no') {
    bot.reply(message, 'Up to you!')
  }
})
