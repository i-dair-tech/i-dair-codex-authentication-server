import { Response } from "express";
import { MSG } from "./responseMessages";

export const errorServerResponse = (res: Response) => {
  return res.status(500).send({
    success: false,
    message: MSG.SERVER_ERROR,
  });
};

export const betweenMarkers = (text: string, begin: string, end: string) => {
  const firstChar = text.indexOf(begin) + begin.length;
  const lastChar = text.lastIndexOf(end);
  return text.substring(firstChar, lastChar);
};

export const extractDomain = (email: string) => {
  const parts = email?.split("@");
  if (parts.length === 2) {
    const domain = parts[1];
    return domain;
  }
};
