const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Invalid token format.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pos_system_jwt_access_secret_key_2026');
    
    // Verify currently authenticated staff account status in database
    if (decoded.id && decoded.role !== 'CUSTOMER') {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true, role: true, isActive: true }
      });

      if (!dbUser) {
        return res.status(401).json({ error: 'Authenticated user account no longer exists.' });
      }

      if (dbUser.isActive === false) {
        return res.status(403).json({ error: 'Your account has been deactivated or disabled by Admin.' });
      }

      req.user = { ...decoded, id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role };
    } else {
      req.user = decoded;
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
