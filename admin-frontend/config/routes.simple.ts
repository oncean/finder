export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: '登录',
        path: '/user/login',
        component: './user/login',
      },
    ],
  },
  {
    path: '/',
    redirect: '/recommendation',
  },
  {
    component: './exception/404',
    layout: false,
    path: './*',
  },
];
