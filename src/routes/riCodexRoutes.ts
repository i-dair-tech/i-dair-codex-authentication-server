import { Router } from "express";
import { Paths } from "../common/paths";
import {
  isAuthenticated,
  verifyAuth,
  getClientId,
} from "../controllers/authentication.controller";
import { getAppVersion } from "../controllers/global.controller";
const riCodexRoutes = Router();

riCodexRoutes.post(Paths.VERIFY_AUTH, verifyAuth);
riCodexRoutes.get(Paths.AUTH, isAuthenticated);
riCodexRoutes.get(Paths.GET_APP_VERSION, getAppVersion);
riCodexRoutes.get(Paths.GET_CLIENT_ID, getClientId);

export default riCodexRoutes;
