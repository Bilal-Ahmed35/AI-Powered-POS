const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized. User information missing.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Access restricted to roles: [${allowedRoles.join(', ')}]` });
    }

    next();
  };
};

module.exports = roleMiddleware;
