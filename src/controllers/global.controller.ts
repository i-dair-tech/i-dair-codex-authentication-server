import { Request, Response } from "express";

const getAppVersion = async (req: Request, res: Response) => {
  const appVersion = process.env.APP_VERSION || "v.0.0.0";
  return res.status(200).send({
    success: true,
    data: { appVersion },
  });
};

export { getAppVersion };
