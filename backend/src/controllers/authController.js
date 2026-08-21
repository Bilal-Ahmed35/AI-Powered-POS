const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

const ACCESS_SECRET = process.env.JWT_SECRET || 'pos_system_jwt_access_secret_key_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'pos_system_jwt_refresh_secret_key_2026';

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: '7d' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    REFRESH_SECRET,
    { expiresIn: '30d' }
  );
  return { accessToken, refreshToken };
};

const register = async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role && ['CUSTOMER', 'VENDOR', 'KITCHEN', 'ADMIN'].includes(role.toUpperCase())
      ? role.toUpperCase()
      : 'CUSTOMER';

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
        isActive: true,
      },
    });

    const tokens = generateTokens(user);

    return res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account has been deactivated or disabled by Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const tokens = generateTokens(user);

    return res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ error: 'Internal server error fetching profile.' });
  }
};

const otpStore = new Map();

const sendOTP = async (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Store in otpStore
  otpStore.set(email.toLowerCase(), { otp, expiresAt, name });

  try {
    const { sendOTPEmail } = require('../services/emailService');
    await sendOTPEmail(email.toLowerCase(), name, otp);
    return res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Failed to send OTP.' });
  }
};

const verifyOTP = async (req, res) => {
  const { email, name, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const stored = otpStore.get(email.toLowerCase());
  if (!stored) {
    return res.status(400).json({ error: 'No OTP found or code expired.' });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'OTP has expired.' });
  }

  if (stored.otp !== otp) {
    return res.status(400).json({ error: 'Incorrect OTP.' });
  }

  // OTP is valid! Remove it from store
  otpStore.delete(email.toLowerCase());

  try {
    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Create a guest user account
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('guest_password_123', 10);
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: name || 'Guest Customer',
          password: hashedPassword,
          role: 'CUSTOMER'
        }
      });
    } else if (name && name.trim() !== "" && user.name !== name.trim()) {
      // Update name to the one entered in the form
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: name.trim() }
      });
    }

    const tokens = generateTokens(user);
    return res.json({
      success: true,
      message: 'OTP verified successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      ...tokens
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP.' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  sendOTP,
  verifyOTP
};
