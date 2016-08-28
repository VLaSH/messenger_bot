var request   = require('request-promise'),
    errors    = require('request-promise/errors'),
    qs        = require('qs'),
    _         = require("underscore");

module.exports = function() {
  var _this   = this,
      photo   = null,
      vk      = {};

  vk.getPhoto = function(username, callback) {
    _this.getPhotoCallback = callback;

    fetchUserId(username, fetchUserIdCallback);
  }

  vk.postPhoto = function(owner_id, photo_id, callback) {
    query = qs.stringify({
      owner_id: process.env.vk_photo_poster_id,
      message: 'Awesome photo!',
      attachment: 'photo' + owner_id + '_' + photo_id,
      access_token: process.env.vk_access_token
    });
    var uri = 'https://api.vk.com/method/wall.post?' + query;

    request({ uri: uri, json: true })
      .then(function(data){
        callback(data)
      })
  }

  var fetchUserId = function(username, callback) {
    var options = {
      uri: 'https://api.vk.com/method/users.get',
      qs: {
        v: '5.53',
        user_ids: username
      },
      json: true,
      resolveWithFullResponse: true
    };

    request(options)
      .then(function(response) {
        var body = response.body

        if(body.error) {
          callback(new Error('Something went wrong on our side.', null))
        }
        else {
          userId = body.response[0].id
          callback(null, userId)
        }
      })
      .catch(errors.StatusCodeError, callback)
      .catch(errors.RequestError, callback)
  }

  var fetchUserIdCallback = function(err, userId) {
    if(err) {
      getPhotoCallback(err, null)
    }
    else {
      fetchPhotos(userId, fetchPhotosCallback)
    }
  }

  var fetchPhotos = function(userId, callback) {
    var options = {
      uri: 'https://api.vk.com/method/photos.get',
      qs: {
        v: '5.53',
        album_id: 'wall',
        rev: '0',
        extended: '0',
        photo_sizes: '1',
        count: '10',
        owner_id: '' + userId
      },
      json: true,
      resolveWithFullResponse: true
    };

    request(options)
      .then(function(response) {
        var body = response.body
        if(body.error) {
          callback(new Error('Something went wrong on our side.', null))
        }
        else {
          callback(null, body.response.items)
        }
      })
      .catch(errors.StatusCodeError, callback)
      .catch(errors.RequestError, callback)
  }

  var fetchPhotosCallback = function(err, photos) {
    if(err) {
      getPhotoCallback(err, null)
    }
    else {
      randomPhoto(photos, randomPhotoCallback)
    }
  }

  var randomPhoto = function(photos, callback) {
    var max   = photos.length - 1,
        index = Math.floor(Math.random() * (max - 0) + 0),
        uri   = _.find(photos[index].sizes, function(size) {
        return size.type == 'y' || size.type == 'x' || size.type == 'm'
      }).src;
    photo = photos[index];

    if(uri && photo) {
      callback(null, uri)
    }
    else {
      callback(new Error('There is no photo or photo sizes'), null)
    }
  }

  var randomPhotoCallback = function(err, uri) {
    if(err) {
      getPhotoCallback(err, null)
    }
    else {
      getPhotoCallback(null, { uri: uri, photo: photo })
    }
  }

  return vk
}
