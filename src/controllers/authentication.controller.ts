import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import fetch from "node-fetch";
import { errorServerResponse, extractDomain } from "../common/functions";
import { MSG } from "../common/responseMessages";
import jwt_decode from "jwt-decode";
import { sequelize } from "../config/sequelize";
import appLogger from "../logger/logger";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const isLocal = process.env.IS_LOCAL === "True";
const oAuth2Client = new OAuth2Client(CLIENT_ID);

let logger = appLogger();

const verifyAccessToken = async (accessToken: string): Promise<boolean> => {
  try {
    if (isLocal) {
      return true;
    }
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: accessToken,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const userId = payload?.sub;
    // Verify that the user is authorized to access the resource
    if (userId) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error("Error on verify access token: ", err);
    return false;
  }
};

const verifyAuth = async (req: Request, res: Response) => {
  const code = req.body.code;
  if (!code) {
    return res.status(400).send({
      data: [],
      message: MSG.MISSING_DATA,
      success: false,
    });
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  const url = "https://www.googleapis.com/oauth2/v4/token";
  const curlPost = `client_id=${CLIENT_ID}&redirect_uri=postmessage&client_secret=${CLIENT_SECRET}&code=${code}&grant_type=authorization_code`;

  const options: any = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: curlPost,
  };

  let data: any;
  let http_code: number;
  try {
    const response = await fetch(url, options);
    data = await response.json();
    http_code = response.status;
    const userinfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      }
    );
    const userinfoData = await userinfoResponse.json();
    const userEmail = userinfoData.email;
    logger.log({
      level: "info",
      message: `Login requests`,
      meta: { userEmail: userEmail, module: "Login" },
    });
    const user = await sequelize.query(
      "SELECT * FROM user where email= $userEmail",
      {
        bind: {
          userEmail,
        },
      }
    );
    const domain = extractDomain(userEmail);
    const allowedDomains = process.env.ALLOWED_DOMAINS
      ? process.env.ALLOWED_DOMAINS.split(", ")
      : [];
    if (domain && !allowedDomains.includes(domain)) {
      if (user[0].length === 0) {
        logger.log({
          level: "error",
          message: `Login failure`,
          meta: { userEmail: userEmail, module: "Login" },
        });
        return res.status(401).send({
          data: [],
          message: MSG.UNAUTHORIZED_DOMAINS,
          success: false,
        });
      }
    }

    if (http_code !== 200) {
      logger.log({
        level: "error",
        message: `Login failure`,
        meta: { userEmail: userEmail, module: "Login" },
      });
      return res.status(401).send({
        data: [],
        message: MSG.UNAUTHORIZED,
        success: false,
      });
    }
    const decodedToken: any = jwt_decode(data.id_token);
    const { email, name } = decodedToken;
    let sessionExpiresAt = new Date();
    let userRole = "simple user";
    sessionExpiresAt.setHours(sessionExpiresAt.getHours() + 12);
    if (user[0].length === 0) {
      await sequelize.query(
        "INSERT INTO user (email,role,session_expires_at,is_active) VALUES ($email,'simple user',$sessionExpiresAt,true) ",
        {
          bind: {
            email,
            sessionExpiresAt,
          },
        }
      );
    } else {
      if (!(user[0][0] as any).is_active) {
        logger.log({
          level: "error",
          message: `Login failure`,
          meta: { userEmail: userEmail, module: "Login" },
        });
        return res.status(401).send({
          data: [],
          message: MSG.UNAUTHORIZED,
          success: false,
        });
      }
      userRole = (user[0][0] as any).role;
      await sequelize.query(
        "UPDATE user SET session_expires_at=$sessionExpiresAt WHERE email =$email",
        {
          bind: {
            email,
            sessionExpiresAt,
          },
        }
      );
    }
    logger.log({
      level: "info",
      message: `Login success`,
      meta: { userEmail: email, module: "Login" },
    });

    return res.status(200).send({
      data: {
        idToken: data.id_token,
        username: name,
        email,
        refreshToken: data.refresh_token,
        userRole,
      },
      message: MSG.SUCCESSFUL_LOGIN,
      success: true,
    });
  } catch (err) {
    console.log(err);
    return errorServerResponse(res);
  }
};
const isAuthenticated = async (req: Request, res: Response) => {
  const accessToken = req.headers?.authorization?.split(" ")[1];
  const email = req.headers["x-user-email"];
  const refreshToken = req.headers["x-user-refresh-token"] as string;
  logger.log({
    level: "info",
    message: `Check authentication request`,
    meta: { userEmail: email, module: "Check authentication" },
  });

  if (!email || !refreshToken) {
    console.error("No email or refresh token sent");
    return res.sendStatus(401);
  }

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  // Check if the access token is expired
  const user: any = await sequelize.query(
    "SELECT * FROM user where email =$email",
    {
      bind: {
        email,
      },
    }
  );
  if (!user[0][0] || !user[0][0].is_active) {
    logger.log({
      level: "info",
      message: `User not found OR not active`,
      meta: { userEmail: email, module: "Check authentication" },
    });
    return res.sendStatus(401);
  }
  const expiryDate = new Date(user[0][0].session_expires_at);

  if (expiryDate.getTime() > Date.now()) {
    console.log("not expired yet");
    // Verify if the access token is still valid
    const isAuthorized = await verifyAccessToken(accessToken as string);
    console.log("isAuthorized", isAuthorized);

    if (isAuthorized) {
      logger.log({
        level: "info",
        message: `Success authentication`,
        meta: { userEmail: email, module: "Check authentication" },
      });
      return res.status(200).send({
        data: { userRole: user[0][0].role, email },
        message: MSG.SUCCESSFUL_LOGIN,
        success: true,
      });
    } else {
      try {
        // Create a new OAuth2Client instance with the provided refreshToken
        console.log("not authorized");
        const oAuth2ClientWithRefreshToken = new OAuth2Client(
          CLIENT_ID,
          CLIENT_SECRET
        );
        oAuth2ClientWithRefreshToken.setCredentials({
          refresh_token: refreshToken,
        });

        // Refresh the access token using the refreshToken
        const newAccessToken =
          await oAuth2ClientWithRefreshToken.getAccessToken();
        console.log("new access token", newAccessToken.res?.data.id_token);

        if (newAccessToken) {
          logger.log({
            level: "info",
            message: `Token refreshed and sent`,
            meta: { userEmail: email, module: "Check authentication" },
          });
          return res.status(401).send({
            data: [{ newAccessToken: newAccessToken.res?.data.id_token }],
            message: MSG.SUCCESSFUL_LOGIN,
            success: true,
          });
        } else {
          logger.log({
            level: "info",
            message: `Token refresh failed`,
            meta: { userEmail: email, module: "Check authentication" },
          });
          return res.sendStatus(401);
        }
      } catch (error) {
        logger.log({
          level: "info",
          message: `Token refresh failed`,
          meta: { userEmail: email, module: "Check authentication" },
        });
        return res.sendStatus(401);
      }
    }
  }
  logger.log({
    level: "info",
    message: `Session expired`,
    meta: { userEmail: email, module: "Login" },
  });
  return res.sendStatus(401);
};

const getClientId = async (req: Request, res: Response) => {
  return res.status(200).send({
    data: {
      client_id: CLIENT_ID,
    },
    message: MSG.GETTING_CLIENT_ID,
    success: true,
  });
};

export { verifyAuth, isAuthenticated, getClientId };
