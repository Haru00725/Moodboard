const { nanoid } = require('nanoid');

/**
 * Generate a unique invite code
 * Format: LOVERS-XXXXXX (alphanumeric, uppercase)
 */
const generateInviteCode = () => {
  const code = nanoid(8).toUpperCase();
  return `LOVERS-${code}`;
};

module.exports = { generateInviteCode };
