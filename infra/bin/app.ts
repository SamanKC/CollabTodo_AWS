#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EdgeStack } from '../lib/edge-stack';
import { AuthStack } from '../lib/auth-stack';
import { DataStack } from '../lib/data-stack';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-southeast-2' };

const edge = new EdgeStack(app, 'CollabTodo-Edge', { env });
const auth = new AuthStack(app, 'CollabTodo-Auth', { env });
const data = new DataStack(app, 'CollabTodo-Data', { env });

// API needs the user pool from Auth
const api = new ApiStack(app, 'CollabTodo-Api', {
  env,
  userPool: auth.userPool,
});

// Ensure deploy order: API depends on Auth for authorizer; Edge is independent now.
api.addDependency(auth);
