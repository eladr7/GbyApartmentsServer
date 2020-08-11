import "dotenv/config";
import "reflect-metadata";
import express from "express";
import session from "express-session";
import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/UserResolver"
import { createConnection } from "typeorm";
import { redis } from "./redis";
import cookieParser from "cookie-parser";
import { verify } from "jsonwebtoken";
import cors from "cors";
import { User } from "./entity/User";
import { sendRefreshToken } from "./auth/sendRefreshToken";
import { createAccessToken, createRefreshToken } from "./auth/auth";

const main = async () => {
  const app = express();
  const RedisStore = connectRedis(session);

  app.use(
    cors({
      origin: "http://localhost:8000",
      credentials: true
    })
  );
  app.use(
    session({
      store: new RedisStore({
        client: redis as any
      }),
      name: "qid",
      secret: process.env.GOOGLE_API_KEY!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7 * 365 // 7 years
      }
    })
  );

  app.use(cookieParser());
  app.post("/refresh_token", async (req, res) => {
    const token = req.cookies.jid;
    if (!token) {
      return res.send({ ok: false, accessToken: "" });
    }

    let payload: any = null;
    try {
      payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
    } catch (err) {
      console.log(err);
      return res.send({ ok: false, accessToken: "" });
    }

    // token is valid and
    // we can send back an access token
    const user = await User.findOne({ id: payload.userId });

    if (!user) {
      return res.send({ ok: false, accessToken: "" });
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return res.send({ ok: false, accessToken: "" });
    }

    sendRefreshToken(res, createRefreshToken(user));

    return res.send({ ok: true, accessToken: createAccessToken(user) });
  });

  await createConnection();
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver]
    }),
    context: ({ req, res }: any) => ({ req, res })
  });
  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(4000, () => {
    console.log("express server started");
  });
};

main().catch(err => console.error(err));
