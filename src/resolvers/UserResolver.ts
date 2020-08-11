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
import { getConnection } from "typeorm";

const getUserDetailsFromGoogle = (payload: any) => {
    //
    return {name: payload.name, email: payload.email};
}


@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
  @Field(() => User)
  user: User;
}

@Resolver()
export class UserResolver {

  @Query(() => String)
  @UseMiddleware(isAuth)
  bye(@Ctx() { payload }: MyContext) {
    console.log(payload);
    return `your user id is: ${payload!.userId}`;
  }

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
  @UseMiddleware(isAuth)
  async signUp(
    @Ctx() { res, payload }: MyContext
  ): Promise<LoginResponse> {
    const user = await User.findOne({ where: { id: payload!.userId } });

    if (!user) {
      // The user isn't registered, so register him.

      // 1.  https://www.npmjs.com/package/react-google-login:  https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=YOUR_TOKEN_HERE
      const userData = getUserDetailsFromGoogle(payload);
      await User.insert({
        email: userData.email,
        name: userData.name
      });
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

      sendRefreshToken(res, createRefreshToken(newUser));

      return {
        accessToken: createAccessToken(newUser),
        user: newUser
      };
    } else {
      // The user was already registered

      sendRefreshToken(res, createRefreshToken(user));

      return {
        accessToken: createAccessToken(user),
        user
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

    return true;
  }

  @Mutation(() => Boolean)
  async revokeRefreshTokensForUser(@Arg("userId", () => Int) userId: number) {
    await getConnection()
      .getRepository(User)
      .increment({ id: userId }, "tokenVersion", 1);

    return true;
  }
}
