import * as dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

const DNS_SERVERS = ['8.8.8.8', '8.8.4.4'];
const SELECTION_TIMEOUT_MS = 10_000;

function hasSrvDnsError(error) {
  const seen = new Set();
  let current = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (/querySrv|ECONNREFUSED|ENOTFOUND/i.test(`${current.code || ''} ${current.message || ''}`))
      return true;
    current = current.cause;
  }
  return false;
}

function databaseName(uri) {
  try {
    const parsed = new URL(uri);
    const name = decodeURIComponent(parsed.pathname.replace(/^\//, '')) || parsed.searchParams.get('dbName');
    return name || '(default)';
  } catch {
    const authority = uri.slice(uri.indexOf('://') + 3);
    const slash = authority.indexOf('/');
    const remainder = slash < 0 ? '' : authority.slice(slash + 1);
    const path = remainder.split(/[?#]/, 1)[0];
    try {
      return (
        decodeURIComponent(path) ||
        new URLSearchParams(remainder.split('?', 2)[1] || '').get('dbName') ||
        '(default)'
      );
    } catch {
      return '(default)';
    }
  }
}

export function friendlyDatabaseError() {
  return 'Could not connect to MongoDB. Check your DNS/network connection, confirm the Atlas cluster is running, allow this IP in Atlas Network Access, and verify the database username and password.';
}

export async function connectDatabase() {
  if (env.NODE_ENV === 'test') return;
  const options = { serverSelectionTimeoutMS: SELECTION_TIMEOUT_MS };
  try {
    await mongoose.connect(env.MONGODB_URI, options);
  } catch (error) {
    if (!env.MONGODB_URI.startsWith('mongodb+srv://') || !hasSrvDnsError(error)) throw error;
    dns.setServers(DNS_SERVERS);
    await mongoose.connect(env.MONGODB_URI, options);
  }
  console.info(`MongoDB connected (${databaseName(env.MONGODB_URI)})`);
}
