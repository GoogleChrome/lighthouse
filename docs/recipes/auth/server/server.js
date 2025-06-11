/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Example Express server for demonstrating how to run Lighthouse on an authenticated
 * page. See docs/recipes/auth/README.md for more.
 */

import http from 'http';
import path from 'path';
import url from 'url';

import createError from 'http-errors';
import express from 'express';
import morgan from 'morgan';
import session from 'express-session';
import esMain from 'es-main';

const moduleDir = path.dirname(url.fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(moduleDir, 'public');

const app = express();

app.use(morgan('dev'));
app.use(express.urlencoded({extended: false}));

app.use(session({
  secret: 'notverysecret',
  resave: true,
  saveUninitialized: false,
}));

app.get('/dashboard', (req, res) => {
  if (req.session.user) {
    res.sendFile('./dashboard.html', {root: PUBLIC_DIR});
  } else {
    res.status(401).sendFile('./dashboard-unauthenticated.html', {root: PUBLIC_DIR});
  }
});

app.get('/', (req, res) => {
  if (req.session.user) {
    res.sendFile('home.html', {root: PUBLIC_DIR});
  } else {
    res.sendFile('home-unauthenticated.html', {root: PUBLIC_DIR});
  }
});

app.post('/login', (req, res, next) => {
  const {email, password} = req.body;
  // super secret login and password ;)
  if (email !== 'admin@example.com' || password !== 'password') {
    return next(createError(401));
  }

  req.session.user = {
    email,
  };
  res.redirect('/dashboard');
});

app.get('/logout', (req, res, next) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Error handlers
app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = err;

  res.status(err.status || 500);
  res.json({err});
});

const server = http.createServer(app);

if (esMain(import.meta)) {
  server.listen(10632);
}

export default server;
