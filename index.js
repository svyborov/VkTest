import express from 'express';
import fetch from 'node-fetch';
import passport from 'passport';
import url from 'url';
import path from 'path';
import VKontakte from 'passport-vkontakte';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import expressSession from 'express-session';

const getFriends = async (userId, token) => {
  const getFriendUrl = url.format({
    protocol: 'https',
    hostname: 'api.vk.com',
    pathname: '/method/friends.get',
    query: {
      user_id: userId,
      order: 'random',
      count: '5',
      access_token: token,
      fields: 'nickname, domain',
      v: '5.52',
    },
  });
  try {
    const response = await fetch(getFriendUrl);
    const json = await response.json();
    return json.response.items;
  } catch (error) {
    return error;
  }
};


export default () => {
  dotenv.config();

  let token;

  const { VK_APP_ID, VK_APP_SECRET } = process.env;

  if (!VK_APP_ID || !VK_APP_SECRET) {
    throw new Error('Set VK_APP_ID and VK_APP_SECRET env vars to run the example');
  }

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  passport.use(new VKontakte.Strategy(
    {
      clientID: VK_APP_ID,
      clientSecret: VK_APP_SECRET,
      callbackURL: '/auth/vk/callback',
      scope: ['email'],
      profileFields: ['email'],
    },
    (accessToken, refreshToken, params, profile, done) => {
      token = accessToken;
      process.nextTick(() => done(null, profile));
    },
  ));

  const app = express();

  app.set('views', `${__dirname}/views`);
  app.set('view engine', 'pug');
  app.locals.basedir = path.join(__dirname, 'views');
  app.use(bodyParser());
  app.use(expressSession({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());

  const checkAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
      res.redirect('/');
      return;
    }
    next();
  };

  app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
      res.redirect('friends');
      return;
    }
    res.render('index', { user: req.user });
  });

  app.get('/friends', checkAuthenticated, async (req, res) => {
    const { id } = req.user;
    const { user } = req;
    const friends = await getFriends(id, token);
    res.render('friends', { friends, user });
  });

  app.get('/auth/vk',
    passport.authenticate('vkontakte'));

  app.get('/auth/vk/callback',
    passport.authenticate('vkontakte', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/');
    });
  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  return app;
};
