const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
  try {
    if (jwt_payload.id === 0) {
      return done(null, {
        id: 0,
        email: 'admin@tamedog.com',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User'
      });
    }
    const { getConnection, sql } = require('./database');
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, jwt_payload.id)
      .query('SELECT id, email, firstName, lastName, role FROM Users WHERE id = @id');
    
    if (result.recordset.length > 0) {
      return done(null, result.recordset[0]);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

module.exports = passport;
