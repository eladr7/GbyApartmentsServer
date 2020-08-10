import { Ctx, Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";
// import { MyContext } from "../MyContext";
// import { User } from "./User";
import { UserApartment } from "./UserApartment";

@ObjectType()
@Entity()
export class Apartment extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  name: string;

  @OneToMany(() => UserApartment, ab => ab.apartment)
  userConnection: Promise<UserApartment[]>;

  // @Field(() => [User])
  // async users(@Ctx() { usersLoader }: MyContext): Promise<User[]> {
  //   return usersLoader.load(this.id);
  // }
}
