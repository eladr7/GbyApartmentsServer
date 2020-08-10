import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, OneToMany } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";
import { UserApartment } from "./UserApartment";

@ObjectType()
@Entity("users")
export class User extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column("text")
  email: string;

  @Column("text")
  password: string;

  @Column("int", { default: 0 })
  tokenVersion: number;

  @OneToMany(() => UserApartment, ab => ab.user)
  apartmentConnection: Promise<UserApartment[]>;
}
