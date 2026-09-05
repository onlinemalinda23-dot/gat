const authService = require('../services/authService');

exports.register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const data = await authService.refreshToken(req.body.refreshToken);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getProfile = (req, res) => {
  const { password_hash, ...user } = req.user;
  res.json({ success: true, data: user });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) { next(err); }
};