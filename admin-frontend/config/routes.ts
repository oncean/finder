/**
 * @name umi 的路由配置
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        name: 'login',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
    ],
  },
  {
    path: '/welcome',
    name: 'welcome',
    icon: 'home',
    component: './Welcome',
  },
  {
    path: '/shop',
    name: 'shop',
    icon: 'store',
    component: './shop',
  },
  {
    path: '/comment',
    name: 'comment',
    icon: 'message',
    component: './comment',
  },
  {
    path: '/wechat-user',
    name: 'wechat-user',
    icon: 'user',
    component: './wechat-user',
  },
  {
    path: '/recommendation',
    name: 'recommendation',
    icon: 'star',
    component: './recommendation',
  },
  {
    path: '/chat-group',
    name: 'chat-group',
    icon: 'team',
    component: './chat-group',
  },
  {
    path: '/message',
    name: 'message',
    icon: 'notification',
    component: './message',
  },
  {
    path: '/',
    redirect: '/welcome',
  },
];
