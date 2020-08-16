import { Entity, ObjectIdColumn, Column, BaseEntity, ObjectID } from "typeorm";
import { ObjectType, Field } from "type-graphql";

@ObjectType()
@Entity("users")
export class User extends BaseEntity {
  @Field(() => String)
  @ObjectIdColumn()
  id: ObjectID;

  @Field()
  @Column("text")
  email: string;

  @Field()
  @Column("text")
  name: string;

  @Field()
  @Column("text", { default: "" })
  roomCursor?: string;

  @Column("int", { default: 0 })
  tokenVersion: number;
}
