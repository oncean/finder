const request = require('../utils/request');

function getRecommendations(params) {
  return request.get('/feed/recommendations', params);
}

function getPostDetail(postId) {
  return request.get(`/posts/${postId}`);
}

function getRelatedPosts(postId) {
  return request.get(`/posts/${postId}/related`);
}

function createPost(data) {
  return request.post('/posts', data);
}

module.exports = {
  getRecommendations,
  getPostDetail,
  getRelatedPosts,
  createPost
};
