import { Request, Response } from "express";
import { OAuth2Client } from 'google-auth-library';
// const {OAuth2Client} = require('google-auth-library');

export interface MyContext {
  req: Request;
  res: Response;
  payload?: { userId: string };
  googleAuthClient: OAuth2Client;
}
