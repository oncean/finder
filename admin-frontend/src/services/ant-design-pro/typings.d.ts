// @ts-ignore
/* eslint-disable */

declare namespace API {
  type CurrentUser = {
    name?: string;
    avatar?: string;
    userid?: string;
    username?: string;
    access?: string;
  };

  type LoginResult = {
    token?: string;
  };

  type LoginParams = {
    username?: string;
    password?: string;
  };
}
