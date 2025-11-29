const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Lambda Authorizer for API Gateway
 */
exports.handler = async (event) => {
  try {
    const token = event.authorizationToken?.replace('Bearer ', '');

    if (!token) {
      throw new Error('No token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Generate policy
    return generatePolicy(decoded.userId, 'Allow', event.methodArn, decoded);
  } catch (error) {
    console.error('Authorization error:', error.message);
    throw new Error('Unauthorized');
  }
};

/**
 * Generate IAM policy
 */
function generatePolicy(principalId, effect, resource, context = {}) {
  const authResponse = {
    principalId
  };

  if (effect && resource) {
    authResponse.policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    };
  }

  // Add user context
  authResponse.context = {
    userId: context.userId || principalId,
    email: context.email || '',
    role: context.role || 'user'
  };

  return authResponse;
}
