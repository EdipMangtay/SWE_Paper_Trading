// auth.test.js — register / login / me + JWT enforcement.

const { startDb, stopDb, clearDb } = require('./_setup');
const { request, app, registerUser, auth } = require('./_helpers');

beforeAll(async () => { await startDb(); });
afterAll(async () => { await stopDb(); });
beforeEach(async () => { await clearDb(); });

describe('POST /api/auth/register', () => {
  it('creates a user, returns a JWT and provisions a $100k portfolio', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'alice@test.com', username: 'alice', password: 'password123'
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.username).toBe('alice');
    expect(res.body.user.cashBalance).toBe(100000);
  });

  it('rejects duplicate email with 409', async () => {
    await registerUser({ email: 'dup@test.com', username: 'first' });
    const res = await request(app).post('/api/auth/register').send({
      email: 'dup@test.com', username: 'second', password: 'password123'
    });
    expect(res.status).toBe(409);
  });

  it('rejects weak / missing fields with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'bad@test.com', username: 'x', password: 'short'
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a JWT for valid credentials', async () => {
    const { email, password } = await registerUser();
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('returns 401 for a wrong password', async () => {
    const { email } = await registerUser();
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for an unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com', password: 'password123'
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const { token, user } = await registerUser();
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user._id || res.body.user.id).toBe(user._id || user.id);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });
});
