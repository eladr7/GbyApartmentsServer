import { MiddlewareFn } from "type-graphql";
import { verify } from "jsonwebtoken";
import { MyContext } from "../MyContext";

// bearer 102930ajslkdaoq01

export const isAuth: MiddlewareFn<MyContext> = ({ context }, next) => {
  const authorization = context.req.headers["authorization"];

  if (!authorization) {
    throw new Error("not authenticated");
  }

  // Elad:
  // 2. if($_SERVER['HTTP_ORIGIN'] &&  $_SERVER['HTTP_ORIGIN'] == "http://www.yourwebsite.com"){

  try {
    const token = authorization.split(" ")[1];

    // Elad: Maybe it won't verify the access token on signup. check this
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!);
    context.payload = payload as any;
  } catch (err) {
    console.log(err);
    throw new Error("not authenticated");
  }

  return next();
};
