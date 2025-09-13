import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

class PlaceholderStack extends Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }
}

const app = new cdk.App();
new PlaceholderStack(app, 'CollabTodo-Placeholder', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
