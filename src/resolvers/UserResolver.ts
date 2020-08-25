import {
  Resolver,
  Query,
  Mutation,
  Arg,
  ObjectType,
  Field,
  Ctx,
  UseMiddleware,
  Int
} from "type-graphql";
import { User } from "../entity/User";
import { MyContext } from "../MyContext";
import { createRefreshToken, createAccessToken } from "../auth/auth";
import { isAuth } from "../auth/isAuth";
import { sendRefreshToken } from "../auth/sendRefreshToken";
import { getConnection, getMongoManager } from "typeorm";
import { OAuth2Client } from 'google-auth-library';


const getUserDetailsFromGoogle = async (client: OAuth2Client, token: any) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_APP_ID,  // Specify the CLIENT_ID of the app that accesses the backend
    // Or, if multiple clients access the backend:
    //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]

    // Expected audience for App Engine.
    // expectedAudience: `/projects/your-project-number/apps/your-project-id`,
  });

  const payload: any = ticket.getPayload();
  // const userid = payload['sub'];
  // If request specified a G Suite domain:
  // const domain = payload['hd'];

  return { name: payload.name, email: payload.email };
}


@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
  @Field(() => User)
  user: User;
  @Field(() => User)
  jid: string;
}

@Resolver()
export class UserResolver {

  // @Query(() => String)
  // @UseMiddleware(isAuth)
  // bye(@Ctx() { payload }: MyContext) {
  //   console.log(payload);
  //   return `your user id is: ${payload!.userId}`;
  // }

  @Query(() => [User])
  users() {
    return User.find();
  }

  @Query(() => User, { nullable: true })
  @UseMiddleware(isAuth)
  me(@Ctx() { payload }: MyContext) {
    try {
      return User.findOne(payload!.userId);
    } catch (err) {
      console.log(err);
      return null;
    }
  }


  @Mutation(() => Boolean)
  async logout(@Ctx() { res }: MyContext) {
    sendRefreshToken(res, "");

    return true;
  }

  // elad
  @Mutation(() => LoginResponse)
  async signup(
    @Arg("token") token: string,
    @Ctx() { res, googleAuthClient }: MyContext
  ): Promise<LoginResponse> {
    // const authorization = req.headers["authorization"];
    // if (!authorization) {
    //   throw new Error("No sign-in google token");
    // }

    const userData: any = await getUserDetailsFromGoogle(googleAuthClient, token).catch(console.error);
    const user = await User.findOne({ where: { email: userData.email } });

    if (!user) {
      // The user isn't registered, so register him.
      try {
        // const suka = await User.insert({
        //   email: userData.email,
        //   name: userData.name
        // });

        let newUserToCreate = new User();
        newUserToCreate.email = userData.email;
        newUserToCreate.name = userData.name;

        const manager = getMongoManager();
        await manager.save(newUserToCreate);
      } catch (err) {
        console.log("Failed creating user: " + err)
      }

      // const newUser = await User.insert({
      //   email: userData.email,
      //   name: userData.name
      // });
      // sendRefreshToken(res, createRefreshToken(newUser.raw));
      // return {
      //   accessToken: createAccessToken(newUser.raw),
      //   user: newUser.raw
      // };

      const newUser = await User.findOne({ where: { email: userData.email } });
      if (!newUser) {
        throw new Error("could not find user");
      }

      const jid = createRefreshToken(newUser);

      sendRefreshToken(res, jid);
      // console.log(res)

      return {
        accessToken: createAccessToken(newUser),
        user: newUser,
        jid: jid
      };
    } else {
      // The user was already registered
      const jid = createRefreshToken(user);

      sendRefreshToken(res, jid);
      console.log("The fucking jid is: " + jid)
      // console.log(res)
      return {
        accessToken: createAccessToken(user),
        user,
        jid: jid
      };
    }
  }
  // elad
  // @Mutation(() => LoginResponse)
  // @UseMiddleware(isAuth)
  // async login(
  //   @Ctx() { res, payload }: MyContext
  // ): Promise<LoginResponse> {
  //   const user = await User.findOne({ where: { id: payload!.userId } });

  //   if (!user) {
  //     throw new Error("could not find user");
  //   }

  //   // login successful

  //   sendRefreshToken(res, createRefreshToken(user));

  //   return {
  //     accessToken: createAccessToken(user),
  //     user
  //   };
  // }

  // // elad
  // @Mutation(() => Boolean)
  // async register(
  //   @Arg("email") email: string
  // ) {
  //   try {
  //     await User.insert({
  //       email
  //     });
  //   } catch (err) {
  //     console.log(err);
  //     return false;
  //   }

  //   return true;
  // }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async assignRoom(
    @Arg("roomCursor") roomCursor: string,
    @Ctx() { payload }: MyContext
  ) {
    const user = await User.findOne({ where: { id: payload!.userId } });

    if (!user) {
      throw new Error("could not find user");
    }

    // user confirmed

    try {
      // user.roomCursor = roomCursor;
      // await User.save(user);

      await getConnection()
        .createQueryBuilder()
        .update(User)
        .set({ roomCursor: roomCursor })
        .where({ id: payload!.userId })
        .execute();

      //   await getConnection()
      //   .getRepository(User).update(???)

      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  @Mutation(() => Boolean)
  async revokeRefreshTokensForUser(@Arg("userId", () => Int) userId: number) {
    await getConnection()
      .getRepository(User)
      .increment({ id: userId }, "tokenVersion", 1);

    return true;
  }
}
