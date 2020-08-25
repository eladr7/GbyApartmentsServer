import "dotenv/config";
import "reflect-metadata";
import express from "express";
// import session from "express-session";
import { ApolloServer } from "apollo-server-express";
// import connectRedis from "connect-redis";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/UserResolver"
import { createConnection } from "typeorm";
// import { redis } from "./redis";
import cookieParser from "cookie-parser";
import { verify } from "jsonwebtoken";
import cors from "cors";
import { User } from "./entity/User";
import { sendRefreshToken } from "./auth/sendRefreshToken";
import { createAccessToken, createRefreshToken } from "./auth/auth";
import { OAuth2Client } from 'google-auth-library';

const API_PORT = process.env.PORT || 4000;

// import {OAuth2Client, GoogleAuth} from 'google-auth-library';
// ?. https://www.npmjs.com/package/react-google-login:  https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=YOUR_TOKEN_HERE
//process.env.GOOGLE_APP_ID
// or better:
// https://stackoverflow.com/questions/42405439/how-to-verify-google-auth-token-at-server-side-in-node-js
// so instead googleAuthclient, i can add it like that and continue in the signup method as usual but with
// req.app.authClient instead of googleAuthclient
// var app = express();
// var GoogleAuth = require('google-auth-library');
// var auth = new GoogleAuth();
// app.authClient = new auth.OAuth2(config.passport.google.clientID, config.passport.google.clientSecret, config.passport.google.callbackURL);
// await??? ->
// req.app.authClient.verifyIdToken(token,
// config.passport.google.clientID,
// function(e, login) {
//     console.log(e);
//     if (login) {
//         var payload = login.getPayload();
//         var googleId = payload['sub'];
//         resolve(googleId);
//         next();
//     } else {
//         reject("invalid token");
//     }
// })
//
// const app = express();
// Add the auth client 
// var auth = new GoogleAuth();
// app.authClient = new auth.OAuth2(process.env.GOOGLE_APP_ID, process.env.GOOGLE_API_KEY, process.env.CALLBACK_URL);

const main = async () => {
    const app = express();
    // const RedisStore = connectRedis(session);

    app.use(
        cors({
            // origin: "http://localhost:8000",
            origin: "https://practical-panini-bac2b5.netlify.app",
            credentials: true
        })
    );
    // app.use(
    //     session({
    //         store: new RedisStore({
    //             client: redis as any
    //         }),
    //         name: "qid",
    //         secret: process.env.GOOGLE_API_KEY!, // Elad: should i put here the client secret?
    //         resave: false,
    //         saveUninitialized: false,
    //         cookie: {
    //             httpOnly: true,
    //             secure: process.env.NODE_ENV === "production",
    //             maxAge: 1000 * 60 * 60 * 24 * 7 * 365 // 7 years
    //         }
    //     })
    // );

    app.use(cookieParser());
    app.post("/refresh_token", async (req, res) => {
        const authorization = req.headers.authorization;
        if (!authorization) {
            return res.send({ ok: false, accessToken: "" });
        }
        const token = authorization.split(" ")[1];

        // const token = req.cookies.jid;
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

        const jid = createRefreshToken(user);

        sendRefreshToken(res, jid);

        return res.send({ ok: true, accessToken: createAccessToken(user), jid: jid });
    });

    const authClient = new OAuth2Client(process.env.GOOGLE_APP_ID);
    await createConnection();
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [UserResolver]
        }),
        context: ({ req, res }: any) => ({ req, res, googleAuthClient: authClient })
    });
    apolloServer.applyMiddleware({ app, cors: false });

    app.listen(API_PORT, () => {
        console.log("express server started");
    });
};

main().catch(err => console.error(err));
