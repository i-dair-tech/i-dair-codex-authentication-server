const { createLogger, format, transports } = require("winston");
const path = require("path");
const { combine, timestamp, printf } = format;

const appLogger = () => {
  const logFolderPath = "../../../log";
  const logFileName = "info.log";
  const logFilePath = path.join(__dirname, logFolderPath, logFileName);
  const myFormat = printf(({ level, message, timestamp, meta }: any) => {
    return `{timestamp:"${timestamp}",level:"${level}",user_email:"${meta.userEmail}",module:"${meta.module}",  message: "${message}"}`;
  });

  return createLogger({
    level: "info",
    format: combine(
      format.json(),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      myFormat
    ),
    transports: [
      new transports.Console(),
      new transports.File({
        filename: logFilePath,
      }),
    ],
  });
};

export default appLogger;
