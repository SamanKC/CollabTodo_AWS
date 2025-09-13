import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';

class PlaceholderStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }
}

const app = new cdk.App();
new PlaceholderStack(app, 'CollabTodo-Bootstrap', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT as string,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-southeast-2',
  },
});
