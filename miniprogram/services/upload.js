const request = require('../utils/request');

function uploadImage(filePath) {
  return request.upload('/upload/image', filePath);
}

module.exports = {
  uploadImage
};
