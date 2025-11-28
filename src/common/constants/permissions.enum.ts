export enum Permission {
  // User permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // Creator permissions
  CREATOR_READ = 'creator:read',
  CREATOR_WRITE = 'creator:write',
  CREATOR_DELETE = 'creator:delete',

  // Agent permissions
  AGENT_READ = 'agent:read',
  AGENT_WRITE = 'agent:write',
  AGENT_DELETE = 'agent:delete',
  AGENT_PUBLISH = 'agent:publish',

  // Document permissions
  DOCUMENT_READ = 'document:read',
  DOCUMENT_WRITE = 'document:write',
  DOCUMENT_DELETE = 'document:delete',

  // Session permissions
  SESSION_READ = 'session:read',
  SESSION_WRITE = 'session:write',
  SESSION_DELETE = 'session:delete',

  // Payment permissions
  PAYMENT_READ = 'payment:read',
  PAYMENT_WRITE = 'payment:write',

  // Admin permissions
  ADMIN_ACCESS = 'admin:access',
}
