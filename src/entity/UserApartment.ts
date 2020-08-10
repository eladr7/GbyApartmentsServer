import {
    BaseEntity,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn
  } from "typeorm";
  import { User } from "./User";
  import { Apartment } from "./Apartment";
  
  @Entity()
  export class UserApartment extends BaseEntity {
    @PrimaryColumn()
    userId: number;
  
    @PrimaryColumn()
    apartmentId: number;
  
    @ManyToOne(() => User, user => user.apartmentConnection, { primary: true })
    @JoinColumn({ name: "userId" })
    user: Promise<User>;
  
    @ManyToOne(() => Apartment, apartment => apartment.userConnection, {
      primary: true
    })
    @JoinColumn({ name: "apartmentId" })
    apartment: Promise<Apartment>;
  }
  