import { defineAuth } from '@aws-amplify/backend';

/**
 * Define authentication resource
 * Uses Email/Password login.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    // Optionally ask for preferred name/etc if needed later, 
    // but MVP requirements focus on settings which are stored in DB.
    // We'll stick to email as primary.
  },
});
