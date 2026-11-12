import type { AuthUser } from "../modules/user/user.interface.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by the session middleware when a valid sessionid cookie is present. */
      user?: AuthUser;
    }
  }
}

export {};
