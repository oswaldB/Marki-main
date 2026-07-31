#!/usr/bin/env bun
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', mode: 'bun.js' });
});

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
};
